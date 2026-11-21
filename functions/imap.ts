import { assertPublicMailHost, getNodeMailRuntime } from './mail';

export interface ImapSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
  tls?: boolean;
}

export interface ImapMessage {
  uid: string;
  messageId: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  receivedAt: number;
}

interface ImapCommandResult {
  tag: string;
  status: 'OK' | 'NO' | 'BAD';
  text: string;
  lines: string[];
  literals: Uint8Array[];
}

const encoder = new TextEncoder();
const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
const latin1Decoder = new TextDecoder('iso-8859-1', { fatal: false });

function concatBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  if (left.length === 0) return right;
  if (right.length === 0) return left;
  const merged = new Uint8Array(left.length + right.length);
  merged.set(left, 0);
  merged.set(right, left.length);
  return merged;
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  if (!clean) return new Uint8Array(0);
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function escapeImapQuoted(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function decodeCharsetBytes(buf: Uint8Array, charsetRaw = 'utf-8'): string {
  const charset = charsetRaw.trim().toLowerCase().replace(/^["']|["']$/g, '') || 'utf-8';
  const normalized = charset === 'gb2312' ? 'gbk' : charset;
  try {
    return new TextDecoder(normalized, { fatal: false }).decode(buf);
  } catch {
    try {
      return utf8Decoder.decode(buf);
    } catch {
      return latin1Decoder.decode(buf);
    }
  }
}

function decodeQuotedPrintable(input: string, charset = 'utf-8'): string {
  const normalized = input.replace(/=\r?\n/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < normalized.length; i += 1) {
    if (normalized[i] === '=' && /^[0-9a-f]{2}$/i.test(normalized.slice(i + 1, i + 3))) {
      bytes.push(parseInt(normalized.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      const ch = normalized.charCodeAt(i);
      if (ch <= 0xff) {
        bytes.push(ch);
      } else {
        for (const b of encoder.encode(normalized[i])) bytes.push(b);
      }
    }
  }
  return decodeCharsetBytes(new Uint8Array(bytes), charset);
}

function decodeRfc2047(value: string): string {
  if (!value) return '';
  const collapsed = value.replace(/\?=\s+=\?/g, '?==?');
  return collapsed.replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_full, charset, encoding, text) => {
    try {
      const enc = String(encoding).toUpperCase();
      if (enc === 'B') {
        const bytes = base64ToBytes(String(text));
        return decodeCharsetBytes(bytes, String(charset));
      }
      if (enc === 'Q') {
        const replaced = String(text).replace(/_/g, ' ');
        return decodeQuotedPrintable(replaced, String(charset));
      }
    } catch {
      // ignore malformed encoded words
    }
    return text;
  });
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r?\n\s*\r?\n\s*\r?\n+/g, '\n\n')
    .trim();
}

function parseHeadersAndBody(raw: string): { headers: Record<string, string>; body: string } {
  const splitCrlf = raw.indexOf('\r\n\r\n');
  const splitLf = raw.indexOf('\n\n');
  let headerPart = raw;
  let body = '';
  if (splitCrlf >= 0 && (splitLf < 0 || splitCrlf <= splitLf)) {
    headerPart = raw.slice(0, splitCrlf);
    body = raw.slice(splitCrlf + 4);
  } else if (splitLf >= 0) {
    headerPart = raw.slice(0, splitLf);
    body = raw.slice(splitLf + 2);
  }
  const unfolded = headerPart.replace(/\r?\n[ \t]+/g, ' ');
  const headers: Record<string, string> = {};
  for (const line of unfolded.split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon <= 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const val = line.slice(colon + 1).trim();
    headers[key] = headers[key] ? `${headers[key]}, ${val}` : val;
  }
  return { headers, body };
}

function extractBodyContent(headers: Record<string, string>, rawBody: string): { text: string; html: string } {
  const contentType = headers['content-type'] || 'text/plain; charset=utf-8';
  const transferEncoding = (headers['content-transfer-encoding'] || '').trim().toLowerCase();
  const charsetMatch = contentType.match(/charset\s*=\s*("?)([^";\s]+)\1/i);
  const charset = charsetMatch?.[2] || 'utf-8';
  const boundaryMatch = contentType.match(/boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
  const boundary = boundaryMatch?.[1] || boundaryMatch?.[2] || '';

  if (/multipart\//i.test(contentType) && boundary) {
    const delimiter = `--${boundary}`;
    const chunks = rawBody.split(delimiter);
    let plain = '';
    let html = '';
    for (const chunk of chunks.slice(1)) {
      if (chunk.startsWith('--')) break;
      const trimmedChunk = chunk.replace(/^\r?\n/, '');
      const parsed = parseHeadersAndBody(trimmedChunk);
      const sub = extractBodyContent(parsed.headers, parsed.body);
      if (!plain && sub.text) plain = sub.text;
      if (!html && sub.html) html = sub.html;
      if (plain) break;
    }
    return { text: plain, html };
  }

  let decoded = rawBody;
  if (transferEncoding === 'base64') {
    decoded = decodeCharsetBytes(base64ToBytes(rawBody), charset);
  } else if (transferEncoding === 'quoted-printable') {
    decoded = decodeQuotedPrintable(rawBody, charset);
  } else {
    const bytes = new Uint8Array(rawBody.length);
    for (let i = 0; i < rawBody.length; i += 1) {
      bytes[i] = rawBody.charCodeAt(i) & 0xff;
    }
    decoded = decodeCharsetBytes(bytes, charset);
  }

  if (/text\/html/i.test(contentType)) {
    return { text: '', html: decoded };
  }
  return { text: decoded.trim(), html: '' };
}

function parseRawRfc822(rawBytes: Uint8Array, fallbackUid: string, fallbackInternalDate?: string): ImapMessage {
  const latin1 = latin1Decoder.decode(rawBytes.subarray(0, 512 * 1024));
  const { headers, body } = parseHeadersAndBody(latin1);
  const subjectRaw = decodeRfc2047(headers['subject'] || '');
  const senderRaw = decodeRfc2047(headers['from'] || '');
  const recipientRaw = decodeRfc2047(headers['to'] || '');
  const messageId = (headers['message-id'] || '').replace(/[<>\s]/g, '').slice(0, 180);
  const dateHeader = headers['date'] || fallbackInternalDate || '';
  const parsedDate = Date.parse(dateHeader);
  const receivedAt = Number.isFinite(parsedDate) && parsedDate > 0 ? parsedDate : Date.now();
  const extracted = extractBodyContent(headers, body);
  const finalBody = (extracted.text || (extracted.html ? htmlToPlainText(extracted.html) : '') || '(空邮件正文)').slice(0, 64000);

  return {
    uid: fallbackUid,
    messageId: messageId || fallbackUid,
    sender: senderRaw.slice(0, 200) || '(未知发件人)',
    recipient: recipientRaw.slice(0, 200) || '',
    subject: subjectRaw.slice(0, 300) || '(无主题)',
    body: finalBody,
    receivedAt,
  };
}

interface ImapTransport {
  readLine(): Promise<string>;
  readExact(length: number): Promise<Uint8Array>;
  write(data: string): Promise<void>;
  close(): void;
}

class NodeImapTransport implements ImapTransport {
  private socket: any;
  private buf: Uint8Array = new Uint8Array(0);
  private closedError: Error | null = null;
  private onProgress: (() => void) | null = null;

  constructor(socket: any) {
    this.socket = socket;
    socket.setTimeout(20000);
    socket.on('data', (chunk: Uint8Array) => {
      this.buf = concatBytes(this.buf, chunk);
      this.onProgress?.();
    });
    socket.on('error', (err: Error) => {
      this.closedError = err instanceof Error ? err : new Error(String(err || 'IMAP 连接异常'));
      this.onProgress?.();
    });
    socket.on('close', () => {
      if (!this.closedError) this.closedError = new Error('IMAP 服务器已断开连接');
      this.onProgress?.();
    });
    socket.on('timeout', () => {
      this.closedError = new Error('IMAP 操作超时（20 秒无响应）');
      this.onProgress?.();
    });
  }

  private waitForMore(): Promise<void> {
    if (this.closedError) return Promise.reject(this.closedError);
    return new Promise((resolve, reject) => {
      this.onProgress = () => {
        this.onProgress = null;
        if (this.closedError) reject(this.closedError);
        else resolve();
      };
    });
  }

  async readLine(): Promise<string> {
    while (true) {
      const idx = this.buf.indexOf(0x0a);
      if (idx >= 0) {
        const lineBuf = this.buf.subarray(0, idx);
        this.buf = this.buf.subarray(idx + 1);
        return utf8Decoder.decode(lineBuf).replace(/\r$/, '');
      }
      await this.waitForMore();
    }
  }

  async readExact(length: number): Promise<Uint8Array> {
    while (this.buf.length < length) {
      await this.waitForMore();
    }
    const slice = this.buf.slice(0, length);
    this.buf = this.buf.subarray(length);
    return slice;
  }

  write(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.write(data, (err?: Error | null) => (err ? reject(err) : resolve()));
    });
  }

  close() {
    try { this.socket.end(); } catch {}
    try { this.socket.destroy(); } catch {}
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      val => {
        clearTimeout(timer);
        resolve(val);
      },
      err => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

class CloudflareImapTransport implements ImapTransport {
  private socket: any;
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private writer: WritableStreamDefaultWriter<Uint8Array>;
  private buf: Uint8Array = new Uint8Array(0);

  constructor(socket: any) {
    this.socket = socket;
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
  }

  private async pullMore(): Promise<void> {
    const result = await withTimeout(this.reader.read(), 20000, 'IMAP 操作超时（20 秒无响应）');
    if (result.done) {
      throw new Error('IMAP 服务器已断开连接');
    }
    this.buf = concatBytes(this.buf, result.value);
  }

  async readLine(): Promise<string> {
    while (true) {
      const idx = this.buf.indexOf(0x0a);
      if (idx >= 0) {
        const lineBuf = this.buf.subarray(0, idx);
        this.buf = this.buf.subarray(idx + 1);
        return utf8Decoder.decode(lineBuf).replace(/\r$/, '');
      }
      await this.pullMore();
    }
  }

  async readExact(length: number): Promise<Uint8Array> {
    while (this.buf.length < length) {
      await this.pullMore();
    }
    const slice = this.buf.slice(0, length);
    this.buf = this.buf.subarray(length);
    return slice;
  }

  async write(data: string): Promise<void> {
    await withTimeout(this.writer.write(encoder.encode(data)), 20000, 'IMAP 写入超时');
  }

  close() {
    try { this.reader.releaseLock(); } catch {}
    try { this.writer.releaseLock(); } catch {}
    try { void this.socket.close(); } catch {}
  }
}

class ImapClient {
  private transport: ImapTransport;
  private tagCounter = 0;

  constructor(transport: ImapTransport) {
    this.transport = transport;
  }

  async readGreeting(): Promise<void> {
    const line = await this.transport.readLine();
    if (!/^\*\s+(OK|PREAUTH)/i.test(line)) {
      throw new Error(`IMAP 服务器未返回就绪响应: ${line.slice(0, 120)}`);
    }
  }

  async command(cmd: string): Promise<ImapCommandResult> {
    const tag = `A${++this.tagCounter}`;
    await this.transport.write(`${tag} ${cmd}\r\n`);

    const lines: string[] = [];
    const literals: Uint8Array[] = [];
    while (true) {
      let line = await this.transport.readLine();
      while (true) {
        const litMatch = line.match(/\{(\d+)\}$/);
        if (!litMatch) break;
        const size = Number(litMatch[1]);
        if (!Number.isFinite(size) || size < 0 || size > 4 * 1024 * 1024) {
          throw new Error(`IMAP 邮件数据块大小超出安全限制 (${size} bytes)`);
        }
        const literalBytes = await this.transport.readExact(size);
        literals.push(literalBytes);
        const tail = await this.transport.readLine();
        line += `\n__LITERAL_${literals.length - 1}__${tail}`;
      }

      if (line.startsWith(`${tag} `)) {
        const match = line.slice(tag.length + 1).match(/^(OK|NO|BAD)\s*(.*)$/i);
        const status = (match?.[1]?.toUpperCase() || 'BAD') as 'OK' | 'NO' | 'BAD';
        const text = match?.[2] || '';
        return { tag, status, text, lines, literals };
      }
      lines.push(line);
    }
  }

  close() {
    this.transport.close();
  }
}

async function openImapClient(settings: ImapSettings): Promise<ImapClient> {
  const host = (settings.host || '').trim();
  const port = Number(settings.port || (settings.tls === false ? 143 : 993));
  const user = (settings.user || '').trim();
  const pass = settings.pass || '';
  if (!host || !user || !pass || pass === '********') {
    throw new Error('IMAP 服务器、邮箱账号和密码/授权码均为必填项');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('IMAP 端口无效');
  }
  const validatedHost = await assertPublicMailHost(host, 'IMAP');
  const useTls = settings.tls !== false && port !== 143;

  let transport: ImapTransport;
  const nodeMail = getNodeMailRuntime();
  if (nodeMail) {
    const socket = await new Promise<any>((resolve, reject) => {
      if (useTls) {
        const s = nodeMail.tls.connect({
          host: validatedHost,
          port,
          servername: validatedHost,
          rejectUnauthorized: true,
        });
        s.setTimeout(20000);
        s.once('error', (err: Error) => {
          s.destroy();
          reject(new Error(`IMAP TLS 连接失败 (${validatedHost}:${port}): ${err.message}`));
        });
        s.once('secureConnect', () => resolve(s));
      } else {
        const s = nodeMail.net.connect({ host: validatedHost, port });
        s.setTimeout(20000);
        s.once('error', (err: Error) => {
          s.destroy();
          reject(new Error(`IMAP TCP 连接失败 (${validatedHost}:${port}): ${err.message}`));
        });
        s.once('connect', () => resolve(s));
      }
    });
    transport = new NodeImapTransport(socket);
  } else {
    const socketsMod = await import('cloudflare:sockets');
    const socket = socketsMod.connect(
      { hostname: validatedHost, port },
      { secureTransport: useTls ? 'on' : 'off' },
    );
    await withTimeout(socket.opened, 20000, `IMAP 连接超时 (${validatedHost}:${port})`);
    transport = new CloudflareImapTransport(socket);
  }

  const client = new ImapClient(transport);
  await client.readGreeting();
  const loginRes = await client.command(`LOGIN ${escapeImapQuoted(user)} ${escapeImapQuoted(pass)}`);
  if (loginRes.status !== 'OK') {
    client.close();
    throw new Error(`IMAP 登录失败：${loginRes.text || '请确认账号与授权码（阿里云/腾讯企业邮箱可能需要专用客户端授权码或开启 IMAP 服务）'}`);
  }
  return client;
}

function parseExistsCount(lines: string[]): number {
  for (const line of lines) {
    const match = line.match(/^\*\s+(\d+)\s+EXISTS\b/i);
    if (match) return Number(match[1]) || 0;
  }
  return 0;
}

export async function testImapConnection(settings: ImapSettings): Promise<{ host: string; port: number; exists: number }> {
  const client = await openImapClient(settings);
  try {
    const selectRes = await client.command('SELECT "INBOX"');
    if (selectRes.status !== 'OK') {
      throw new Error(`无法打开 INBOX 收件箱：${selectRes.text}`);
    }
    const exists = parseExistsCount(selectRes.lines);
    try { await client.command('LOGOUT'); } catch {}
    return { host: settings.host.trim(), port: Number(settings.port || 993), exists };
  } finally {
    client.close();
  }
}

export async function fetchImapMessages(settings: ImapSettings, limit = 25): Promise<{ exists: number; messages: ImapMessage[] }> {
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit) || 25));
  const client = await openImapClient(settings);
  try {
    const selectRes = await client.command('SELECT "INBOX"');
    if (selectRes.status !== 'OK') {
      throw new Error(`无法打开 INBOX 收件箱：${selectRes.text}`);
    }
    const exists = parseExistsCount(selectRes.lines);
    if (exists === 0) {
      try { await client.command('LOGOUT'); } catch {}
      return { exists: 0, messages: [] };
    }
    const start = Math.max(1, exists - safeLimit + 1);
    const fetchRes = await client.command(`FETCH ${start}:${exists} (UID INTERNALDATE BODY.PEEK[])`);
    if (fetchRes.status !== 'OK') {
      throw new Error(`拉取收件箱邮件失败：${fetchRes.text}`);
    }

    const messages: ImapMessage[] = [];
    for (const line of fetchRes.lines) {
      if (!/^\*\s+\d+\s+FETCH\b/i.test(line)) continue;
      const litMatch = line.match(/__LITERAL_(\d+)__/);
      if (!litMatch) continue;
      const literalIdx = Number(litMatch[1]);
      const rawBuf = fetchRes.literals[literalIdx];
      if (!rawBuf) continue;
      const uidMatch = line.match(/\bUID\s+(\d+)/i);
      const seqMatch = line.match(/^\*\s+(\d+)\s+FETCH\b/i);
      const internalDateMatch = line.match(/\bINTERNALDATE\s+"([^"]+)"/i);
      const uid = uidMatch?.[1] || seqMatch?.[1] || String(messages.length + 1);
      messages.push(parseRawRfc822(rawBuf, uid, internalDateMatch?.[1]));
    }
    try { await client.command('LOGOUT'); } catch {}
    messages.sort((a, b) => b.receivedAt - a.receivedAt);
    return { exists, messages };
  } finally {
    client.close();
  }
}
