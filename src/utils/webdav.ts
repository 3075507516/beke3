import { WebDavConfig, WebDavBackupItem } from '../types';
import { getAdminSessionToken } from './adminSession';

function authHeaders(): Record<string, string> {
  const token = getAdminSessionToken();
  if (!token) throw new Error('请先使用管理员账号登录');
  return { Authorization: `Bearer ${token}` };
}

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function jsonRequest<T>(action: string, config: WebDavConfig, extra: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(`/api/webdav/${action}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ config, ...extra }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success !== true) throw new Error(result?.error || `WebDAV 操作失败 (HTTP ${response.status})`);
  return result as T;
}

export async function testWebDav(config: WebDavConfig): Promise<{ connected: boolean; checkedAt: number }> {
  const result = await jsonRequest<{ connected: boolean; checkedAt: number }>('test', config);
  return { connected: Boolean(result.connected), checkedAt: Number(result.checkedAt || Date.now()) };
}

export async function listWebDavFiles(config: WebDavConfig): Promise<WebDavBackupItem[]> {
  const result = await jsonRequest<{ files: WebDavBackupItem[] }>('list', config);
  return Array.isArray(result.files)
    ? result.files.map(file => ({ ...file, id: file.id || file.name, path: file.path || file.name }))
    : [];
}

export function uploadWebDavFile(
  config: WebDavConfig,
  fileName: string,
  file: Blob,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<WebDavBackupItem> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/webdav/upload', true);
    try {
      Object.entries(authHeaders()).forEach(([key, value]) => xhr.setRequestHeader(key, value));
      xhr.setRequestHeader('X-WebDAV-Config', encodeBase64Utf8(JSON.stringify(config)));
      xhr.setRequestHeader('X-WebDAV-Path', encodeURIComponent(fileName));
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    } catch (error) { reject(error); return; }
    xhr.timeout = 120_000;
    xhr.upload.onprogress = event => {
      if (event.lengthComputable && event.total > 0) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      const result = (() => { try { return JSON.parse(xhr.responseText); } catch { return null; } })();
      if (xhr.status < 200 || xhr.status >= 300 || result?.success !== true) {
        reject(new Error(result?.error || `WebDAV 上传失败 (HTTP ${xhr.status})`));
        return;
      }
      const updatedAt = Number(result.updatedAt || Date.now());
      resolve({ id: result.name, name: result.name, size: Number(result.size || file.size), updatedAt, type: 'full', path: result.path || result.name });
    };
    xhr.onerror = () => reject(new Error('WebDAV 上传网络错误'));
    xhr.ontimeout = () => reject(new Error('WebDAV 上传超时；请先尝试较小的文字/设置文件，大型图片或视频容易卡住'));
    xhr.onabort = () => reject(new DOMException('传输已停止', 'AbortError'));
    const abort = () => xhr.abort();
    signal?.addEventListener('abort', abort, { once: true });
    xhr.onloadend = () => signal?.removeEventListener('abort', abort);
    if (signal?.aborted) { xhr.abort(); return; }
    xhr.send(file);
  });
}

export async function downloadWebDavFile(config: WebDavConfig, fileName: string, onProgress?: (percent: number) => void, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch('/api/webdav/download', {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ config, path: fileName }),
    signal,
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error || `WebDAV 下载失败 (HTTP ${response.status})`);
  }
  if (!response.body) return response.blob();
  const total = Number(response.headers.get('content-length') || 0);
  const reader = response.body.getReader();
  const chunks: ArrayBuffer[] = [];
  let loaded = 0;
  const maxBytes = 25 * 1024 * 1024;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      const copy = new Uint8Array(value.byteLength);
      copy.set(value);
      chunks.push(copy.buffer);
      loaded += value.byteLength;
      if (loaded > maxBytes) {
        await reader.cancel();
        throw new Error('单文件下载限制为 25 MiB；大型图片/视频请在 WebDAV 客户端中分块处理');
      }
      if (total > 0) onProgress?.(Math.min(100, Math.round((loaded / total) * 100)));
    }
  }
  return new Blob(chunks, { type: 'application/octet-stream' });
}

export async function deleteWebDavFile(config: WebDavConfig, fileName: string): Promise<void> {
  await jsonRequest('delete', config, { path: fileName });
}
