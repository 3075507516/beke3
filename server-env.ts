import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';

export interface D1Meta {
  changes: number;
  last_row_id: number;
  duration: number;
}

export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: D1Meta;
}

class D1PreparedStatementShim {
  private readonly db: SqlJsDatabase;
  private readonly sql: string;
  private readonly params: unknown[];
  private readonly onWrite: () => void;

  constructor(db: SqlJsDatabase, sql: string, params: unknown[], onWrite: () => void) {
    this.db = db;
    this.sql = sql;
    this.params = params;
    this.onWrite = onWrite;
  }

  bind(...values: unknown[]): D1PreparedStatementShim {
    const normalized = values.map(value => {
      if (value === undefined) return null;
      if (typeof value === 'boolean') return value ? 1 : 0;
      return value;
    });
    return new D1PreparedStatementShim(this.db, this.sql, normalized, this.onWrite);
  }

  async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
    const stmt = this.db.prepare(this.sql);
    try {
      if (this.params.length) stmt.bind(this.params as any);
      if (!stmt.step()) return null;
      const row = stmt.getAsObject() as Record<string, unknown>;
      if (colName) {
        return (row[colName] as T) ?? null;
      }
      return row as T;
    } finally {
      stmt.free();
    }
  }

  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const start = Date.now();
    const stmt = this.db.prepare(this.sql);
    const results: T[] = [];
    try {
      if (this.params.length) stmt.bind(this.params as any);
      while (stmt.step()) {
        results.push(stmt.getAsObject() as T);
      }
    } finally {
      stmt.free();
    }
    return {
      results,
      success: true,
      meta: {
        changes: 0,
        last_row_id: 0,
        duration: Date.now() - start,
      },
    };
  }

  async run(): Promise<D1Result> {
    const start = Date.now();
    const stmt = this.db.prepare(this.sql);
    const results: Record<string, unknown>[] = [];
    try {
      if (this.params.length) stmt.bind(this.params as any);
      while (stmt.step()) {
        const obj = stmt.getAsObject();
        if (Object.keys(obj).length > 0) results.push(obj);
      }
    } finally {
      stmt.free();
    }
    const changes = this.db.getRowsModified();
    const rowIdStmt = this.db.prepare('SELECT last_insert_rowid() AS id');
    let lastRowId = 0;
    try {
      if (rowIdStmt.step()) {
        lastRowId = Number(rowIdStmt.getAsObject().id || 0);
      }
    } finally {
      rowIdStmt.free();
    }
    if (!/^\s*(?:SELECT|PRAGMA|EXPLAIN)\b/i.test(this.sql)) {
      this.onWrite();
    }
    return {
      results,
      success: true,
      meta: {
        changes,
        last_row_id: lastRowId,
        duration: Date.now() - start,
      },
    };
  }

  async raw<T = unknown[]>(): Promise<T[]> {
    const stmt = this.db.prepare(this.sql);
    const rows: T[] = [];
    try {
      if (this.params.length) stmt.bind(this.params as any);
      while (stmt.step()) {
        rows.push(stmt.get() as T);
      }
    } finally {
      stmt.free();
    }
    return rows;
  }
}

function createD1DatabaseShim(db: SqlJsDatabase, persist: () => void) {
  return {
    prepare(sql: string) {
      return new D1PreparedStatementShim(db, sql, [], persist);
    },
    async batch(statements: D1PreparedStatementShim[]) {
      const results: D1Result[] = [];
      db.exec('BEGIN TRANSACTION');
      try {
        for (const stmt of statements) {
          results.push(await stmt.run());
        }
        db.exec('COMMIT');
        persist();
        return results;
      } catch (err) {
        try { db.exec('ROLLBACK'); } catch {}
        throw err;
      }
    },
    async exec(sql: string) {
      db.exec(sql);
      persist();
      return { count: 1, duration: 0 };
    },
  };
}

interface StoredR2Object {
  key: string;
  data: Uint8Array;
  httpMetadata: Record<string, string>;
  customMetadata: Record<string, string>;
  uploaded: Date;
  httpEtag: string;
}

function createR2BucketShim(storageDir: string) {
  const objects = new Map<string, StoredR2Object>();
  const multipartUploads = new Map<string, {
    key: string;
    httpMetadata: Record<string, string>;
    customMetadata: Record<string, string>;
    parts: Map<number, { data: Uint8Array; etag: string }>;
  }>();
  const r2Root = path.join(storageDir, 'r2');

  const loadExistingFromDisk = () => {
    try {
      if (!fs.existsSync(r2Root)) return;
      const metaPath = path.join(r2Root, 'index.json');
      if (!fs.existsSync(metaPath)) return;
      const index = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as Record<string, {
        file: string;
        httpMetadata: Record<string, string>;
        customMetadata: Record<string, string>;
        uploaded: number;
        httpEtag: string;
      }>;
      for (const [key, entry] of Object.entries(index)) {
        const blobPath = path.join(r2Root, entry.file);
        if (fs.existsSync(blobPath)) {
          objects.set(key, {
            key,
            data: new Uint8Array(fs.readFileSync(blobPath)),
            httpMetadata: entry.httpMetadata || {},
            customMetadata: entry.customMetadata || {},
            uploaded: new Date(entry.uploaded || Date.now()),
            httpEtag: entry.httpEtag || `"${crypto.createHash('md5').update(key).digest('hex')}"`,
          });
        }
      }
    } catch {
      // Fall back to empty in-memory map if disk cache is unavailable
    }
  };

  const persistToDisk = () => {
    try {
      fs.mkdirSync(r2Root, { recursive: true });
      const index: Record<string, unknown> = {};
      for (const [key, obj] of objects.entries()) {
        const safeFile = crypto.createHash('sha256').update(key).digest('hex');
        const blobPath = path.join(r2Root, safeFile);
        if (!fs.existsSync(blobPath)) {
          fs.writeFileSync(blobPath, obj.data);
        }
        index[key] = {
          file: safeFile,
          httpMetadata: obj.httpMetadata,
          customMetadata: obj.customMetadata,
          uploaded: obj.uploaded.getTime(),
          httpEtag: obj.httpEtag,
        };
      }
      fs.writeFileSync(path.join(r2Root, 'index.json'), JSON.stringify(index));
    } catch {
      // Non-fatal in read-only runtimes
    }
  };

  loadExistingFromDisk();

  const toUint8Array = async (body: unknown): Promise<Uint8Array> => {
    if (body == null) return new Uint8Array(0);
    if (body instanceof Uint8Array) return body;
    if (body instanceof ArrayBuffer) return new Uint8Array(body);
    if (typeof body === 'string') return new TextEncoder().encode(body);
    if (typeof (body as ReadableStream<Uint8Array>).getReader === 'function') {
      const reader = (body as ReadableStream<Uint8Array>).getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          total += value.byteLength;
        }
      }
      const combined = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return combined;
    }
    return new Uint8Array(0);
  };

  const toR2Response = (obj: StoredR2Object) => ({
    key: obj.key,
    size: obj.data.byteLength,
    etag: obj.httpEtag,
    httpEtag: obj.httpEtag,
    uploaded: obj.uploaded,
    httpMetadata: obj.httpMetadata,
    customMetadata: obj.customMetadata,
    body: obj.data,
    writeHttpMetadata(headers: Headers) {
      if (obj.httpMetadata?.contentType) headers.set('Content-Type', obj.httpMetadata.contentType);
      if (obj.httpMetadata?.contentDisposition) headers.set('Content-Disposition', obj.httpMetadata.contentDisposition);
    },
    async arrayBuffer() {
      return obj.data.slice().buffer;
    },
    async text() {
      return new TextDecoder().decode(obj.data);
    },
  });

  return {
    async put(key: string, value: unknown, options?: { httpMetadata?: Record<string, string>; customMetadata?: Record<string, string> }) {
      const data = await toUint8Array(value);
      const etag = `"${crypto.createHash('md5').update(data).digest('hex')}"`;
      const obj: StoredR2Object = {
        key,
        data,
        httpMetadata: options?.httpMetadata || {},
        customMetadata: options?.customMetadata || {},
        uploaded: new Date(),
        httpEtag: etag,
      };
      objects.set(key, obj);
      persistToDisk();
      return toR2Response(obj);
    },
    async get(key: string) {
      const obj = objects.get(key);
      return obj ? toR2Response(obj) : null;
    },
    async delete(key: string | string[]) {
      const keys = Array.isArray(key) ? key : [key];
      for (const k of keys) {
        objects.delete(k);
        try {
          const safeFile = crypto.createHash('sha256').update(k).digest('hex');
          const blobPath = path.join(r2Root, safeFile);
          if (fs.existsSync(blobPath)) fs.unlinkSync(blobPath);
        } catch {}
      }
      persistToDisk();
    },
    async list(options?: { limit?: number; cursor?: string; prefix?: string }) {
      const limit = Math.max(1, Number(options?.limit || 1000));
      const startIndex = options?.cursor ? Math.max(0, Number(options.cursor) || 0) : 0;
      const prefix = options?.prefix || '';
      const matched = Array.from(objects.values())
        .filter(item => !prefix || item.key.startsWith(prefix))
        .sort((a, b) => b.uploaded.getTime() - a.uploaded.getTime());
      const slice = matched.slice(startIndex, startIndex + limit);
      const truncated = startIndex + limit < matched.length;
      return {
        objects: slice.map(obj => ({
          key: obj.key,
          size: obj.data.byteLength,
          etag: obj.httpEtag,
          httpEtag: obj.httpEtag,
          uploaded: obj.uploaded,
          httpMetadata: obj.httpMetadata,
          customMetadata: obj.customMetadata,
        })),
        truncated,
        cursor: truncated ? String(startIndex + limit) : undefined,
        delimitedPrefixes: [],
      };
    },
    async createMultipartUpload(key: string, options?: { httpMetadata?: Record<string, string>; customMetadata?: Record<string, string> }) {
      const uploadId = crypto.randomUUID();
      multipartUploads.set(`${key}::${uploadId}`, {
        key,
        httpMetadata: options?.httpMetadata || {},
        customMetadata: options?.customMetadata || {},
        parts: new Map(),
      });
      return { key, uploadId };
    },
    resumeMultipartUpload(key: string, uploadId: string) {
      const entry = multipartUploads.get(`${key}::${uploadId}`);
      return {
        async uploadPart(partNumber: number, value: unknown) {
          if (!entry) throw new Error('Multipart upload session not found');
          const data = await toUint8Array(value);
          const etag = `"${crypto.createHash('md5').update(data).digest('hex')}"`;
          entry.parts.set(partNumber, { data, etag });
          return { partNumber, etag };
        },
        async abort() {
          multipartUploads.delete(`${key}::${uploadId}`);
        },
        async complete(parts: Array<{ partNumber: number; etag: string }>) {
          if (!entry) throw new Error('Multipart upload session not found');
          const ordered = [...parts].sort((a, b) => a.partNumber - b.partNumber);
          const buffers: Uint8Array[] = [];
          let total = 0;
          for (const part of ordered) {
            const stored = entry.parts.get(part.partNumber);
            if (!stored) throw new Error(`Missing multipart part ${part.partNumber}`);
            buffers.push(stored.data);
            total += stored.data.byteLength;
          }
          const combined = new Uint8Array(total);
          let offset = 0;
          for (const buf of buffers) {
            combined.set(buf, offset);
            offset += buf.byteLength;
          }
          const etag = `"${crypto.createHash('md5').update(combined).digest('hex')}"`;
          const obj: StoredR2Object = {
            key,
            data: combined,
            httpMetadata: entry.httpMetadata,
            customMetadata: entry.customMetadata,
            uploaded: new Date(),
            httpEtag: etag,
          };
          objects.set(key, obj);
          multipartUploads.delete(`${key}::${uploadId}`);
          persistToDisk();
          return { key, size: total, etag, httpEtag: etag };
        },
      };
    },
  };
}

function createKvNamespaceShim() {
  const store = new Map<string, { value: string; expiresAt: number | null }>();
  return {
    async get(key: string) {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt && entry.expiresAt <= Date.now()) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async put(key: string, value: string, options?: { expirationTtl?: number }) {
      const expiresAt = options?.expirationTtl ? Date.now() + Number(options.expirationTtl) * 1000 : null;
      store.set(key, { value: String(value), expiresAt });
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
}

async function seedDefaultSiteContent(d1: ReturnType<typeof createD1DatabaseShim>): Promise<void> {
  try {
    const row = await d1.prepare('SELECT id FROM fox3_site_content WHERE id = ?').bind('published').first();
    if (row) return;
    const now = Date.now();
    const initialPublished = {
      posts: [
        {
          id: 'post-1',
          title: 'fox3 数据存储位置与部署边界',
          summary: '说明浏览器本机数据、Cloudflare D1/R2/KV 的实际用途，以及未绑定服务时的限制。',
          content: '# fox3 数据存储位置与部署边界\n\nfox3 支持服务端数据库与对象存储全栈运行，支持订单、邮件中枢、客服对话和媒体资源管理。',
          category: '技术架构',
          tags: ['Cloudflare', 'D1', 'R2', 'fox3'],
          cover: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
          author: 'fox',
          views: 1280,
          likes: 88,
          createdAt: now - 86400000 * 3,
          updatedAt: now - 86400000 * 3,
        },
      ],
      books: [],
      photos: [],
      photoFolders: [],
      media: [],
      products: [
        {
          id: 'prod-1',
          name: 'fox3 深度定制全栈部署极速交付包',
          description: '包含 Cloudflare D1/R2/KV 自动化绑定脚本、独立域名配置咨询以及全站备份恢复方案实施指导。',
          price: 99.00,
          images: [
            'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80',
          ],
          category: '数字化产品',
          stock: 99,
          tags: ['全栈', 'Cloudflare', '咨询'],
          showcaseId: 'showcase-main',
          createdAt: now - 86400000 * 3,
          updatedAt: now - 86400000 * 3,
        },
        {
          id: 'prod-2',
          name: '极简机械键盘定制键帽套装 (白狐限定版)',
          description: 'PBT 热升华工艺，人体工学校正高度，附送白狐专属定制个性键帽与拔键器。',
          price: 199.00,
          images: [
            'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=800&q=80',
          ],
          category: '实体周边',
          stock: 25,
          tags: ['数码周边', '定制', '现货'],
          showcaseId: 'showcase-hardware',
          createdAt: now - 86400000 * 2,
          updatedAt: now - 86400000 * 2,
        },
      ],
      websites: [],
      systemSettings: {
        siteName: 'fox3 博客',
        headerTagline: 'CLOUDFLARE NATIVE • FOX3',
        shopCategories: ['实体周边', '电子书', '数码配件', '服饰鞋包', '家居生活', '文创文具', '虚拟商品', '课程培训', '会员服务', '软件工具', '摄影器材', '礼品收藏', '食品饮品', '咨询服务'],
        themeColor: '#0ea5e9',
        customPaletteBg: '#f8fafc',
        avatarUrl: '/images/hero-default.jpg',
        heroIntroImage: '/images/hero-default.jpg',
        heroBadge: '✨ 数字化极速智库 & 全栈现代博客',
        heroTitle: '探索数字世界与全栈极简之美',
        heroSubtitle: '融合 Cloudflare D1/R2/KV 与 WebDAV 容灾备份的下一代多终端响应式博客平台',
        transparentCards: false,
        bottomButtonsEnabled: false,
        hideNonBlogForGuests: false,
        timezone: 'Asia/Shanghai',
      },
      themeMode: 'modern',
    };
    await d1.prepare('INSERT OR IGNORE INTO fox3_site_content (id, value, revision, updatedAt) VALUES (?, ?, 1, ?)')
      .bind('published', JSON.stringify(initialPublished), now)
      .run();
  } catch {
    // Non-fatal seed error
  }
}

let cachedRuntimeEnv: Record<string, any> | null = null;
const EPHEMERAL_SESSION_SECRET = crypto.randomBytes(32).toString('hex');

export async function getRuntimeEnv(): Promise<Record<string, any>> {
  if (cachedRuntimeEnv) {
    return buildEnvView(cachedRuntimeEnv.DB, cachedRuntimeEnv.R2_BUCKET, cachedRuntimeEnv.KV);
  }

  const rootDir = process.cwd();
  const dataDir = path.join(rootDir, '.data');
  const dbFile = path.join(dataDir, 'fox3.sqlite');

  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(rootDir, 'node_modules', 'sql.js', 'dist', file),
  });

  let existingDbBytes: Uint8Array | undefined;
  try {
    if (fs.existsSync(dbFile)) {
      existingDbBytes = new Uint8Array(fs.readFileSync(dbFile));
    }
  } catch {
    existingDbBytes = undefined;
  }

  const sqlDb = existingDbBytes ? new SQL.Database(existingDbBytes) : new SQL.Database();
  let persistTimer: NodeJS.Timeout | null = null;
  const persistDb = () => {
    if (persistTimer) return;
    persistTimer = setTimeout(() => {
      persistTimer = null;
      try {
        fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(dbFile, Buffer.from(sqlDb.export()));
      } catch {
        // Ignore write failures in read-only containers
      }
    }, 50);
  };

  const d1 = createD1DatabaseShim(sqlDb, persistDb);

  // Run idempotent SQL migrations from /migrations
  const migrationFiles = ['0001_site_content.sql', '0002_commerce.sql', '0003_order_trash.sql'];
  for (const fileName of migrationFiles) {
    const filePath = path.join(rootDir, 'migrations', fileName);
    if (!fs.existsSync(filePath)) continue;
    const sqlText = fs.readFileSync(filePath, 'utf8');
    try {
      sqlDb.exec(sqlText);
    } catch (err: any) {
      // Ignore duplicate column error if 0003_order_trash.sql already ran
      if (!String(err?.message || '').includes('duplicate column name')) {
        console.warn(`[server-env] Migration ${fileName} notice:`, err?.message || err);
      }
    }
  }
  await seedDefaultSiteContent(d1);
  persistDb();

  const r2 = createR2BucketShim(dataDir);
  const kv = createKvNamespaceShim();

  cachedRuntimeEnv = { DB: d1, R2_BUCKET: r2, KV: kv };
  return buildEnvView(d1, r2, kv);
}

function buildEnvView(DB: any, R2_BUCKET: any, KV: any): Record<string, any> {
  const configuredSessionSecret = String(process.env.ADMIN_SESSION_SECRET || '').trim();
  const sessionSecret = configuredSessionSecret.length >= 32
    ? configuredSessionSecret
    : EPHEMERAL_SESSION_SECRET;

  return {
    ...process.env,
    ADMIN_SESSION_SECRET: sessionSecret,
    DB,
    D1: DB,
    DATABASE: DB,
    R2_BUCKET,
    R2: R2_BUCKET,
    BUCKET: R2_BUCKET,
    KV,
    FOX3_KV: KV,
  };
}
