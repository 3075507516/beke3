type Provider = 'cos' | 'oss' | 's3';

export interface ExternalObjectStoreConfig {
  provider: Provider;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
}

const enc = new TextEncoder();
const hex = (bytes: ArrayBuffer | Uint8Array): string =>
  Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');

async function hmac(key: Uint8Array, value: string): Promise<Uint8Array> {
  const keyData = Uint8Array.from(key).buffer as ArrayBuffer;
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(value)));
}

async function sha256(value: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(value)));
}

function isoDates(now = new Date()): { timestamp: string; date: string } {
  const timestamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { timestamp, date: timestamp.slice(0, 8) };
}

function encodeObjectKey(key: string): string {
  return key.split('/').map(part => encodeURIComponent(part).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)).join('/');
}

export function getExternalObjectStoreConfig(env: any): ExternalObjectStoreConfig | null {
  const requested = String(env.OBJECT_STORAGE_PROVIDER || '').trim().toLowerCase();
  if (requested === 's3' || (!requested && Boolean(env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY && env.S3_BUCKET && env.S3_REGION && env.S3_ENDPOINT))) {
    let endpoint = '';
    try {
      const parsed = new URL(String(env.S3_ENDPOINT || '').trim());
      if (parsed.protocol === 'https:' && !parsed.username && !parsed.password && !parsed.search && !parsed.hash) endpoint = parsed.toString().replace(/\/$/, '');
    } catch {}
    const config = {
      provider: 's3' as const,
      bucket: String(env.S3_BUCKET || '').trim(),
      region: String(env.S3_REGION || '').trim(),
      accessKeyId: String(env.S3_ACCESS_KEY_ID || '').trim(),
      secretAccessKey: String(env.S3_SECRET_ACCESS_KEY || ''),
      endpoint,
    };
    return Object.values(config).every(Boolean) ? config : null;
  }
  const cos = requested === 'cos' || (!requested && Boolean(env.COS_SECRET_ID && env.COS_SECRET_KEY && env.COS_BUCKET && env.COS_REGION));
  if (cos) {
    const config = {
      provider: 'cos' as const,
      bucket: String(env.COS_BUCKET || '').trim(),
      region: String(env.COS_REGION || '').trim(),
      accessKeyId: String(env.COS_SECRET_ID || '').trim(),
      secretAccessKey: String(env.COS_SECRET_KEY || ''),
    };
    return Object.values(config).every(Boolean) ? config : null;
  }

  const oss = requested === 'oss' || (!requested && Boolean(env.OSS_ACCESS_KEY_ID && env.OSS_ACCESS_KEY_SECRET && env.OSS_BUCKET && env.OSS_REGION));
  if (oss) {
    const config = {
      provider: 'oss' as const,
      bucket: String(env.OSS_BUCKET || '').trim(),
      region: String(env.OSS_REGION || '').trim(),
      accessKeyId: String(env.OSS_ACCESS_KEY_ID || '').trim(),
      secretAccessKey: String(env.OSS_ACCESS_KEY_SECRET || ''),
    };
    return Object.values(config).every(Boolean) ? config : null;
  }
  return null;
}

function objectUrl(config: ExternalObjectStoreConfig, key: string): URL {
  const ossRegion = config.region.replace(/^oss-/, '');
  if (config.provider === 's3') {
    const base = new URL(config.endpoint!);
    base.pathname = `${base.pathname.replace(/\/$/, '')}/${encodeObjectKey(config.bucket)}${key ? `/${encodeObjectKey(key)}` : ''}`;
    return base;
  }
  const host = config.provider === 'cos'
    ? `${config.bucket}.cos.${config.region}.myqcloud.com`
    : `${config.bucket}.oss-${ossRegion}.aliyuncs.com`;
  return new URL(`https://${host}/${encodeObjectKey(key)}`);
}

async function signedHeaders(
  config: ExternalObjectStoreConfig,
  url: URL,
  method: 'GET' | 'PUT' | 'HEAD' | 'DELETE',
  contentType?: string,
  originalName?: string,
): Promise<Headers> {
  const { timestamp, date } = isoDates();
  const signingRegion = config.provider === 'oss' ? config.region.replace(/^oss-/, '') : config.region;
  const headers = new Headers();
  if (contentType) headers.set('Content-Type', contentType);
  const host = url.host.toLowerCase();

  if (config.provider === 'cos' || config.provider === 's3') {
    headers.set('x-amz-date', timestamp);
    headers.set('x-amz-content-sha256', 'UNSIGNED-PAYLOAD');
    if (originalName) headers.set('x-amz-meta-original-name', encodeURIComponent(originalName));
    if (method === 'PUT') headers.set('x-amz-meta-uploaded-at', String(Date.now()));

    const all: Record<string, string> = { host };
    headers.forEach((value, name) => { all[name.toLowerCase()] = value.trim().replace(/\s+/g, ' '); });
    const signedNames = Object.keys(all).sort();
    const canonicalHeaders = signedNames.map(name => `${name}:${all[name]}\n`).join('');
    const canonicalRequest = `${method}\n${url.pathname}\n\n${canonicalHeaders}\n${signedNames.join(';')}\nUNSIGNED-PAYLOAD`;
    const scope = `${date}/${config.region}/s3/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${timestamp}\n${scope}\n${await sha256(canonicalRequest)}`;
    const dateKey = await hmac(enc.encode(`AWS4${config.secretAccessKey}`), date);
    const regionKey = await hmac(dateKey, config.region);
    const serviceKey = await hmac(regionKey, 's3');
    const signingKey = await hmac(serviceKey, 'aws4_request');
    const signature = hex(await hmac(signingKey, stringToSign));
    headers.set('Authorization', `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedNames.join(';')}, Signature=${signature}`);
    return headers;
  }

  // Alibaba OSS Signature Version 4 is similar to, but not identical to, AWS SigV4.
  headers.set('x-oss-date', timestamp);
  headers.set('x-oss-content-sha256', 'UNSIGNED-PAYLOAD');
  if (originalName) headers.set('x-oss-meta-original-name', encodeURIComponent(originalName));
  if (method === 'PUT') headers.set('x-oss-meta-uploaded-at', String(Date.now()));
  const canonicalHeaders: Record<string, string> = { host };
  headers.forEach((value, name) => { canonicalHeaders[name.toLowerCase()] = value.trim().replace(/\s+/g, ' '); });
  const canonicalHeaderText = Object.keys(canonicalHeaders).sort().map(name => `${name}:${canonicalHeaders[name]}\n`).join('');
  const additionalHeaders = '';
  const canonicalRequest = `${method}\n${url.pathname}\n\n${canonicalHeaderText}\n${additionalHeaders}\nUNSIGNED-PAYLOAD`;
  const scope = `${date}/${signingRegion}/oss/aliyun_v4_request`;
  const stringToSign = `OSS4-HMAC-SHA256\n${timestamp}\n${scope}\n${await sha256(canonicalRequest)}`;
  const dateKey = await hmac(enc.encode(`aliyun_v4${config.secretAccessKey}`), date);
  const regionKey = await hmac(dateKey, signingRegion);
  const serviceKey = await hmac(regionKey, 'oss');
  const signingKey = await hmac(serviceKey, 'aliyun_v4_request');
  const signature = hex(await hmac(signingKey, stringToSign));
  headers.set('Authorization', `OSS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, AdditionalHeaders=${additionalHeaders}, Signature=${signature}`);
  return headers;
}

export async function putExternalObject(
  config: ExternalObjectStoreConfig,
  key: string,
  body: ReadableStream<Uint8Array> | ArrayBuffer | Uint8Array,
  contentType: string,
  originalName: string,
): Promise<void> {
  const url = objectUrl(config, key);
  const headers = await signedHeaders(config, url, 'PUT', contentType, originalName);
  const response = await fetch(url, { method: 'PUT', headers, body: body as BodyInit, redirect: 'manual' });
  if (!response.ok) {
    const detail = (await response.text()).replace(/\s+/g, ' ').slice(0, 220);
    throw new Error(`${config.provider.toUpperCase()} PUT failed (${response.status}): ${detail}`);
  }
}

export async function getExternalObject(config: ExternalObjectStoreConfig, key: string): Promise<Response | null> {
  const url = objectUrl(config, key);
  const headers = await signedHeaders(config, url, 'GET');
  const response = await fetch(url, { method: 'GET', headers, redirect: 'manual' });
  if (response.status === 404 || response.status === 410) return null;
  if (!response.ok) {
    const detail = (await response.text()).replace(/\s+/g, ' ').slice(0, 220);
    throw new Error(`${config.provider.toUpperCase()} GET failed (${response.status}): ${detail}`);
  }
  return response;
}

export async function deleteExternalObject(config: ExternalObjectStoreConfig, key: string): Promise<void> {
  const url = objectUrl(config, key);
  const headers = await signedHeaders(config, url, 'DELETE');
  const response = await fetch(url, { method: 'DELETE', headers, redirect: 'manual' });
  if (response.status === 404 || response.status === 204 || response.ok) return;
  const detail = (await response.text()).replace(/\s+/g, ' ').slice(0, 220);
  throw new Error(`${config.provider.toUpperCase()} DELETE failed (${response.status}): ${detail}`);
}

export async function probeExternalObjectStore(config: ExternalObjectStoreConfig): Promise<boolean> {
  const url = objectUrl(config, '');
  const headers = await signedHeaders(config, url, 'HEAD');
  const response = await fetch(url, { method: 'HEAD', headers, redirect: 'manual' });
  return response.ok;
}
