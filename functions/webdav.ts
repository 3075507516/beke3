export interface WebDavCredentials {
  serverUrl: string;
  username: string;
  password: string;
  backupPath?: string;
  port?: number | string;
}

const encoder = new TextEncoder();
const MAX_TRANSFER_BYTES = 25 * 1024 * 1024;

function basicAuth(username: string, password: string): string {
  const bytes = encoder.encode(`${username}:${password}`);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `Basic ${btoa(binary)}`;
}

function decodeXml(value: string): string {
  return value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function validHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return false;
  if (host.includes(':') || /^\d+(?:\.\d+){0,3}$/.test(host)) return false;
  return /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(host);
}

function normalizedTarget(config: WebDavCredentials, relativePath = ''): URL {
  const raw = String(config.serverUrl || '').trim();
  let base: URL;
  try { base = new URL(raw); } catch { throw new Error('WebDAV 服务地址无效'); }
  if (base.protocol !== 'https:' || !validHost(base.hostname) || base.username || base.password || base.search || base.hash) {
    throw new Error('WebDAV 仅允许 HTTPS 公网地址；请移除 URL 中的用户名、密码、查询参数和片段');
  }
  const requestedPort = String(config.port || '');
  const effectivePort = requestedPort || base.port || '443';
  if (!['443', '8443'].includes(effectivePort)) throw new Error('WebDAV 端口仅允许 443 或 8443');
  if (requestedPort) base.port = requestedPort === '443' ? '' : requestedPort;
  const segments = [base.pathname, String(config.backupPath || '/fox3_backup/'), relativePath]
    .flatMap(part => String(part).split('/'))
    .map(part => part.trim())
    .filter(Boolean);
  if (segments.some(part => part === '.' || part === '..' || /[\\\u0000-\u001f]/.test(part))) throw new Error('WebDAV 文件路径无效');
  base.pathname = `/${segments.map(part => encodeURIComponent(decodeURIComponentSafe(part))).join('/')}${!relativePath && String(config.backupPath || '').endsWith('/') ? '/' : ''}`;
  return base;
}

function decodeURIComponentSafe(part: string): string {
  try { return decodeURIComponent(part); } catch { return part; }
}

function authHeaders(config: WebDavCredentials, extra: Record<string, string> = {}): HeadersInit {
  const username = String(config.username || '').trim();
  const password = String(config.password || '');
  if (!username || !password || password === '********') throw new Error('请填写 WebDAV 用户名和应用专用密码');
  return { Authorization: basicAuth(username, password), ...extra };
}

async function remoteFetch(url: URL, config: WebDavCredentials, method: string, headers: Record<string, string> = {}, body?: BodyInit | null, parentSignal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  const abortFromParent = () => controller.abort();
  parentSignal?.addEventListener('abort', abortFromParent, { once: true });
  if (parentSignal?.aborted) controller.abort();
  try {
    return await fetch(url.toString(), { method, headers: authHeaders(config, headers), body, signal: controller.signal, redirect: 'manual' });
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', abortFromParent);
  }
}

function friendlyError(status: number): string {
  if (status === 401 || status === 403) return 'WebDAV 认证失败或账号无目录权限';
  if (status === 404) return 'WebDAV 目录或文件不存在';
  if (status === 405) return 'WebDAV 服务不支持所需 DAV 操作';
  if (status === 409) return 'WebDAV 父目录不存在';
  return `WebDAV 服务返回 HTTP ${status}`;
}

function listEntries(xml: string, base: URL): Array<{ name: string; path: string; size: number; updatedAt: number; type: 'full' | 'posts' | 'books' | 'media' | 'settings' }> {
  const entries: Array<{ name: string; path: string; size: number; updatedAt: number; type: 'full' | 'posts' | 'books' | 'media' | 'settings' }> = [];
  const blocks = xml.match(/<(?:[\w.-]+:)?response\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?response\s*>/gi) || [];
  const basePath = base.pathname.replace(/\/+$/, '');
  for (const block of blocks) {
    const hrefMatch = block.match(/<(?:[\w.-]+:)?href\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?href\s*>/i);
    if (!hrefMatch) continue;
    let href: URL;
    try { href = new URL(decodeXml(hrefMatch[1].trim()), base); } catch { continue; }
    if (href.origin !== base.origin || !href.pathname.startsWith(`${basePath}/`)) continue;
    const relative = decodeURIComponentSafe(href.pathname.slice(basePath.length + 1)).replace(/\/+$/, '');
    if (!relative || relative.includes('/')) continue;
    if (/<(?:[\w.-]+:)?collection\b/i.test(block)) continue;
    const name = relative;
    const sizeMatch = block.match(/<(?:[\w.-]+:)?getcontentlength\b[^>]*>(\d+)<\/(?:[\w.-]+:)?getcontentlength\s*>/i);
    const dateMatch = block.match(/<(?:[\w.-]+:)?getlastmodified\b[^>]*>([^<]+)<\/(?:[\w.-]+:)?getlastmodified\s*>/i);
    const parsedDate = dateMatch ? Date.parse(decodeXml(dateMatch[1].trim())) : NaN;
    const scope = name.match(/_(full|posts|books|media|settings)_backup_/i)?.[1]?.toLowerCase();
    const type = (['full', 'posts', 'books', 'media', 'settings'].includes(scope || '') ? scope : 'full') as 'full' | 'posts' | 'books' | 'media' | 'settings';
    entries.push({ name, path: name, size: Number(sizeMatch?.[1] || 0), updatedAt: Number.isFinite(parsedDate) ? parsedDate : 0, type });
  }
  return entries.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
}

async function ensureCollection(config: WebDavCredentials, signal?: AbortSignal): Promise<URL> {
  const target = normalizedTarget(config);
  const probe = await remoteFetch(target, config, 'PROPFIND', { Depth: '0', 'Content-Type': 'application/xml; charset=utf-8' }, '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>', signal);
  if (probe.status === 207 || probe.ok) return target;
  if (probe.status !== 404) throw new Error(friendlyError(probe.status));
  const created = await remoteFetch(target, config, 'MKCOL', {}, undefined, signal);
  if (created.ok) return target;
  throw new Error(friendlyError(created.status));
}

export async function handleWebDavAction(action: string, request: Request, headers: Headers): Promise<Response> {
  if (!['test', 'list', 'upload', 'download', 'delete'].includes(action)) return new Response('Not found', { status: 404, headers });
  try {
    const length = Number(request.headers.get('content-length') || 0);
    if (length > MAX_TRANSFER_BYTES) return new Response(JSON.stringify({ success: false, error: '单文件备份限制为 25 MiB；大型图片/视频请单独存储，避免请求超时' }), { status: 413, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    let config: WebDavCredentials;
    let targetPath = '';
    let operationBody: BodyInit | null = null;
    if (action === 'upload') {
      const encodedConfig = request.headers.get('X-WebDAV-Config') || '';
      const encodedPath = request.headers.get('X-WebDAV-Path') || '';
      if (!encodedConfig || !encodedPath) throw new Error('上传请求缺少 WebDAV 配置或文件名');
      config = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encodedConfig), char => char.charCodeAt(0))));
      targetPath = decodeURIComponentSafe(encodedPath);
      if (targetPath.includes('/') || targetPath.includes('\\') || targetPath === '.' || targetPath === '..') throw new Error('仅允许上传到备份目录下的单个文件');
      operationBody = await request.arrayBuffer();
      if (!(operationBody instanceof ArrayBuffer) || operationBody.byteLength > MAX_TRANSFER_BYTES) throw new Error('单文件备份限制为 25 MiB');
    } else {
      const input = await request.json() as { config?: WebDavCredentials; path?: string };
      config = input.config || ({} as WebDavCredentials);
      targetPath = String(input.path || '');
      if (['download', 'delete'].includes(action) && (!targetPath || targetPath.includes('/') || targetPath.includes('\\') || targetPath === '.' || targetPath === '..')) throw new Error('备份文件名无效');
    }
    if (action === 'test') {
      const response = await remoteFetch(normalizedTarget({ ...config, backupPath: '/' }), config, 'PROPFIND', { Depth: '0', 'Content-Type': 'application/xml; charset=utf-8' }, '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>', request.signal);
      const success = response.status === 207 || response.ok;
      if (!success) throw new Error(friendlyError(response.status));
      return Response.json({ success: true, connected: true, status: response.status, checkedAt: Date.now() }, { headers });
    }
    if (action === 'list') {
      const folder = await ensureCollection(config, request.signal);
      const response = await remoteFetch(folder, config, 'PROPFIND', { Depth: '1', 'Content-Type': 'application/xml; charset=utf-8' }, '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:getcontentlength/><d:getlastmodified/><d:getcontenttype/></d:prop></d:propfind>', request.signal);
      if (response.status !== 207 && !response.ok) throw new Error(friendlyError(response.status));
      const xml = await response.text();
      return Response.json({ success: true, files: listEntries(xml, folder), checkedAt: Date.now() }, { headers });
    }
    const target = normalizedTarget(config, targetPath);
    if (action === 'upload') {
      await ensureCollection(config, request.signal);
      const response = await remoteFetch(target, config, 'PUT', { 'Content-Type': request.headers.get('Content-Type') || 'application/octet-stream' }, operationBody, request.signal);
      if (!response.ok && response.status !== 201 && response.status !== 204) throw new Error(friendlyError(response.status));
      return Response.json({ success: true, name: targetPath, size: operationBody instanceof ArrayBuffer ? operationBody.byteLength : 0, path: targetPath, updatedAt: Date.now() }, { headers });
    }
    if (action === 'download') {
      const response = await remoteFetch(target, config, 'GET', {}, undefined, request.signal);
      if (!response.ok) throw new Error(friendlyError(response.status));
      const outHeaders = new Headers(headers);
      outHeaders.set('Content-Type', 'application/octet-stream');
      outHeaders.set('Content-Disposition', `attachment; filename="${targetPath.replace(/["\\\r\n]/g, '_')}"`);
      const remoteLength = response.headers.get('content-length');
      if (remoteLength && Number(remoteLength) > MAX_TRANSFER_BYTES) {
        await response.body?.cancel();
        return Response.json({ success: false, error: '单文件下载限制为 25 MiB；大型图片/视频请在 WebDAV 客户端中分块处理' }, { status: 413, headers });
      }
      if (remoteLength) outHeaders.set('Content-Length', remoteLength);
      return new Response(response.body, { status: 200, headers: outHeaders });
    }
    if (action === 'delete') {
      const response = await remoteFetch(target, config, 'DELETE', {}, undefined, request.signal);
      if (!response.ok && response.status !== 204) throw new Error(friendlyError(response.status));
      return Response.json({ success: true, deleted: targetPath }, { headers });
    }
    return new Response('Not found', { status: 404, headers });
  } catch (error: any) {
    const status = error?.name === 'AbortError' ? 504 : 400;
    const message = error?.name === 'AbortError' ? 'WebDAV 请求超时；请先尝试较小的文字/设置备份，避免大媒体文件卡住' : String(error?.message || 'WebDAV 操作失败').slice(0, 300);
    return Response.json({ success: false, error: message }, { status, headers });
  }
}
