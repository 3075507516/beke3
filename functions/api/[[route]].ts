import { createVerificationCode, dispatchEmail, escapeHtml, normalizeEmail, probeResendConnection, type MailProvider, type OutboundMailSettings } from '../mail';
import { getExternalObjectStoreConfig, getExternalObject, putExternalObject, probeExternalObjectStore } from '../object-storage';
import { handleWebDavAction } from '../webdav';

// Cloudflare Pages Functions API Handler
// Routes: /api/*

interface Env {
  DB?: any;        // Cloudflare D1 Database binding
  D1?: any;        // Alias for Cloudflare D1 Database binding
  DATABASE?: any;  // Alias for Cloudflare D1 Database binding
  R2_BUCKET?: any; // Cloudflare R2 Bucket binding
  R2?: any;        // Alias for Cloudflare R2 Bucket binding
  BUCKET?: any;    // Alias for Cloudflare R2 Bucket binding
  KV?: any;        // Cloudflare KV Namespace binding
  FOX3_KV?: any;   // Alias for KV Namespace binding
  MAIL_PROVIDER?: string;
  MAIL_SENDER?: string;
  MAIL_API_KEY?: string;
  RESEND_API_KEY?: string;
  RESEND_WEBHOOK_SECRET?: string;
  BREVO_API_KEY?: string;
  SENDGRID_API_KEY?: string;
  OBJECT_STORAGE_PROVIDER?: string;
  COS_SECRET_ID?: string;
  COS_SECRET_KEY?: string;
  COS_REGION?: string;
  COS_BUCKET?: string;
  OSS_ACCESS_KEY_ID?: string;
  OSS_ACCESS_KEY_SECRET?: string;
  OSS_REGION?: string;
  OSS_BUCKET?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_REGION?: string;
  S3_BUCKET?: string;
  S3_ENDPOINT?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_SECURITY?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  ADMIN_SESSION_SECRET?: string;
  VERIFY_CODE_LENGTH?: string;
  VERIFY_EMAIL_SUBJECT?: string;
  VERIFY_EMAIL_TEMPLATE?: string;
}

function getOutboundSettings(client: any, env: any): OutboundMailSettings {
  const smtpHost = (env.SMTP_HOST || client?.smtpHost || '').trim();
  const explicitProvider = String(env.MAIL_PROVIDER || client?.provider || '').trim().toLowerCase();
  const inferredProvider = (env.RESEND_API_KEY || env.MAIL_API_KEY || client?.apiKey)
    ? 'resend'
    : env.BREVO_API_KEY
      ? 'brevo'
      : env.SENDGRID_API_KEY
        ? 'sendgrid'
        : smtpHost
          ? 'smtp'
          : 'resend';
  const providerValue = (explicitProvider || inferredProvider).toLowerCase();
  const supportedProviders: MailProvider[] = ['smtp', 'resend', 'brevo', 'sendgrid'];
  const provider = (supportedProviders.includes(providerValue as MailProvider) ? providerValue : 'smtp') as MailProvider;
  const smtpPort = Number(env.SMTP_PORT || client?.smtpPort || 465);
  const smtpSecurityValue = String(env.SMTP_SECURITY || client?.smtpSecurity || (smtpPort === 465 ? 'ssl' : 'starttls')).toLowerCase();
  const smtpSecurity = smtpSecurityValue === 'starttls' ? 'starttls' : 'ssl';
  const apiKey = provider === 'brevo'
    ? env.BREVO_API_KEY || client?.apiKey
    : provider === 'sendgrid'
      ? env.SENDGRID_API_KEY || client?.apiKey
      : env.RESEND_API_KEY || env.MAIL_API_KEY || client?.apiKey;
  const smtpPass = env.SMTP_PASS || client?.smtpPass || (smtpHost === 'smtp.resend.com' ? (env.RESEND_API_KEY || env.MAIL_API_KEY) : '');

  return {
    provider,
    apiKey: typeof apiKey === 'string' ? apiKey : '',
    smtpHost,
    smtpPort,
    smtpSecurity,
    smtpUser: (env.SMTP_USER || client?.smtpUser || '').trim(),
    smtpPass: typeof smtpPass === 'string' ? smtpPass : '',
    senderEmail: (env.MAIL_SENDER || client?.senderEmail || '').trim(),
  };
}

function hasOutboundMailService(settings: OutboundMailSettings): boolean {
  if (!settings.senderEmail) return false;
  if (settings.provider === 'smtp') return Boolean(settings.smtpHost && settings.smtpPass);
  return Boolean(settings.apiKey);
}

async function findRegisteredUserEmail(db: any, identity: string): Promise<string | null> {
  if (!db || !identity) return null;
  try {
    const normalized = identity.trim().toLowerCase();
    const row = await db.prepare(
      `SELECT id, username, email FROM fox3_users
       WHERE id = ? OR LOWER(username) = ? OR LOWER(email) = ? LIMIT 1`
    ).bind(identity.trim(), normalized, normalized).first();
    return normalizeEmail(row?.email) || null;
  } catch {
    return null;
  }
}

async function ensureVerificationTables(db: any): Promise<void> {
  await db.prepare(`CREATE TABLE IF NOT EXISTS fox3_email_verifications (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expiresAt INTEGER NOT NULL,
    lastSentAt INTEGER NOT NULL
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS fox3_email_ip_rates (
    ipHash TEXT PRIMARY KEY,
    expiresAt INTEGER NOT NULL
  )`).run();
}

async function ensureUsersTable(db: any): Promise<void> {
  await db.prepare(`CREATE TABLE IF NOT EXISTS fox3_users (
    id TEXT PRIMARY KEY,
    username TEXT,
    email TEXT,
    password TEXT,
    role TEXT DEFAULT 'user',
    createdAt INTEGER,
    status TEXT DEFAULT 'active'
  )`).run();

  const info = await db.prepare('PRAGMA table_info(fox3_users)').all();
  const columns = new Set((info?.results || []).map((column: any) => String(column.name)));
  const additions: Array<[string, string]> = [
    ['id', 'TEXT'],
    ['username', 'TEXT'],
    ['email', 'TEXT'],
    ['password', 'TEXT'],
    ['role', "TEXT DEFAULT 'user'"],
    ['createdAt', 'INTEGER'],
    ['status', "TEXT DEFAULT 'active'"],
  ];
  for (const [name, definition] of additions) {
    if (!columns.has(name)) {
      await db.prepare(`ALTER TABLE fox3_users ADD COLUMN ${name} ${definition}`).run();
    }
  }
  // Non-unique indexes are safe to add even when legacy data has duplicates.
  await db.prepare('CREATE INDEX IF NOT EXISTS fox3_users_email_idx ON fox3_users(email)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS fox3_users_username_idx ON fox3_users(username)').run();
}

function isValidEmail(value: string): boolean {
  if (!value || value.length > 254 || /[\s<>]/.test(value)) return false;
  const parts = value.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.length > 64 || !domain || !domain.includes('.')) return false;
  if (!/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+$/.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  return domain.split('.').every(label => label.length > 0 && label.length <= 63 && /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label));
}

async function ensurePasswordResetTable(db: any): Promise<void> {
  await db.prepare(`CREATE TABLE IF NOT EXISTS fox3_password_resets (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expiresAt INTEGER NOT NULL,
    lastSentAt INTEGER NOT NULL
  )`).run();
}

async function hashRateLimitIp(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function reserveVerificationCode(env: any, email: string, ip: string, code: string): Promise<'d1' | 'kv' | null> {
  const now = Date.now();
  if (env.DB) {
    await ensureVerificationTables(env.DB);
    const ipHash = await hashRateLimitIp(ip);
    const [emailRow, ipRow] = await Promise.all([
      env.DB.prepare('SELECT lastSentAt FROM fox3_email_verifications WHERE email = ?').bind(email).first(),
      env.DB.prepare('SELECT expiresAt FROM fox3_email_ip_rates WHERE ipHash = ?').bind(ipHash).first(),
    ]);
    if ((emailRow && now - Number(emailRow.lastSentAt) < 60_000) || (ipRow && Number(ipRow.expiresAt) > now)) return null;

    await env.DB.batch([
      env.DB.prepare(`INSERT INTO fox3_email_verifications (email, code, attempts, expiresAt, lastSentAt)
        VALUES (?, ?, 0, ?, ?)
        ON CONFLICT(email) DO UPDATE SET code = excluded.code, attempts = 0,
          expiresAt = excluded.expiresAt, lastSentAt = excluded.lastSentAt`)
        .bind(email, code, now + 600_000, now),
      env.DB.prepare(`INSERT INTO fox3_email_ip_rates (ipHash, expiresAt) VALUES (?, ?)
        ON CONFLICT(ipHash) DO UPDATE SET expiresAt = excluded.expiresAt`)
        .bind(ipHash, now + 60_000),
    ]);
    return 'd1';
  }

  if (!env.KV) return null;
  const codeKey = `verify_code_${email}`;
  const attemptKey = `verify_attempt_${email}`;
  const rateEmailKey = `mail_rate_email_${encodeURIComponent(email)}`;
  const rateIpKey = `mail_rate_ip_${encodeURIComponent(ip)}`;
  const [emailRate, ipRate] = await Promise.all([env.KV.get(rateEmailKey), env.KV.get(rateIpKey)]);
  if (emailRate || ipRate) return null;
  await Promise.all([
    env.KV.put(rateEmailKey, '1', { expirationTtl: 60 }),
    env.KV.put(rateIpKey, '1', { expirationTtl: 60 }),
  ]);
  await env.KV.delete(attemptKey);
  await env.KV.put(codeKey, code, { expirationTtl: 600 });
  return 'kv';
}

async function verifyStoredCode(env: any, email: string, code: string): Promise<boolean> {
  if (env.DB) {
    await ensureVerificationTables(env.DB);
    const row = await env.DB.prepare('SELECT code, attempts, expiresAt FROM fox3_email_verifications WHERE email = ?').bind(email).first();
    if (row) {
      if (Number(row.expiresAt) <= Date.now() || Number(row.attempts) >= 10 || !row.code) return false;
      if (code && code === String(row.code)) return true;
      const nextAttempts = Number(row.attempts) + 1;
      await env.DB.prepare(`UPDATE fox3_email_verifications
        SET attempts = ?, code = CASE WHEN ? >= 10 THEN '' ELSE code END
        WHERE email = ? AND expiresAt > ?`).bind(nextAttempts, nextAttempts, email, Date.now()).run();
      return false;
    }
  }

  if (!env.KV) return false;
  const kv = env.KV;
  const codeKey = `verify_code_${email}`;
  const attemptKey = `verify_attempt_${email}`;
  const attempts = Number(await kv.get(attemptKey)) || 0;
  if (attempts >= 10) return false;
  const storedCode = await kv.get(codeKey);
  if (storedCode && code === storedCode) return true;
  const nextAttempts = attempts + 1;
  await kv.put(attemptKey, String(nextAttempts), { expirationTtl: 600 });
  if (nextAttempts >= 10) await kv.delete(codeKey);
  return false;
}

async function consumeStoredCode(env: any, email: string): Promise<void> {
  if (env.DB) {
    await ensureVerificationTables(env.DB);
    const result = await env.DB.prepare(`UPDATE fox3_email_verifications
      SET code = '', attempts = 10 WHERE email = ?`).bind(email).run();
    if (Number(result?.meta?.changes || 0) > 0) return;
  }
  if (env.KV) {
    await Promise.all([env.KV.delete(`verify_code_${email}`), env.KV.delete(`verify_attempt_${email}`)]);
  }
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function createAdminSessionToken(env: any): Promise<string> {
  const secret = getAdminSessionSecret(env);
  if (!secret) return '';
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ role: 'admin', exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
  return `${payload}.${base64UrlEncode(signature)}`;
}

function getConfiguredAdminPassword(env: any): string {
  const password = typeof env.ADMIN_PASSWORD === 'string' ? env.ADMIN_PASSWORD : String(env.ADMIN_PASSWORD ?? '');
  return password.length < 6 ? '' : password;
}

function getAdminSessionSecret(env: any): string {
  const configuredSecret = String(env.ADMIN_SESSION_SECRET || '').trim();
  return configuredSecret.length >= 32 ? configuredSecret : '';
}

async function hasAdminSession(request: Request, env: any): Promise<boolean> {
  const secret = getAdminSessionSecret(env);
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!secret || !token) return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return false;
  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const signatureBytes = Uint8Array.from(atob(signature.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - signature.length % 4) % 4)), ch => ch.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, new TextEncoder().encode(payload));
    if (!valid) return false;
    const payloadBytes = Uint8Array.from(atob(payload.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - payload.length % 4) % 4)), ch => ch.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(payloadBytes));
    return claims.role === 'admin' && Number(claims.exp) > Date.now();
  } catch {
    return false;
  }
}

async function hashUserPassword(password: string): Promise<string> {
  // Cloudflare Workers Web Crypto currently rejects PBKDF2 counts above 100,000.
  const iterations = 100_000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256));
  return `pbkdf2$${iterations}$${base64UrlEncode(salt)}$${base64UrlEncode(bits)}`;
}

async function verifyUserPassword(db: any, userRow: any, password: string): Promise<boolean> {
  const stored = String(userRow?.password || '');
  if (!stored.startsWith('pbkdf2$')) {
    if (stored !== password) return false;
    const upgraded = await hashUserPassword(password);
    await db.prepare('UPDATE fox3_users SET password = ? WHERE id = ?').bind(upgraded, userRow.id).run();
    return true;
  }
  try {
    const [, rounds, saltValue, hashValue] = stored.split('$');
    const saltBase64 = saltValue.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - saltValue.length % 4) % 4);
    const hashBase64 = hashValue.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - hashValue.length % 4) % 4);
    const salt = Uint8Array.from(atob(saltBase64), ch => ch.charCodeAt(0));
    const expected = Uint8Array.from(atob(hashBase64), ch => ch.charCodeAt(0));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: Number(rounds), hash: 'SHA-256' }, key, expected.length * 8));
    if (actual.length !== expected.length) return false;
    let mismatch = 0;
    for (let i = 0; i < actual.length; i++) mismatch |= actual[i] ^ expected[i];
    return mismatch === 0;
  } catch {
    return false;
  }
}

function applyFileSafetyHeaders(headers: Headers): void {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Security-Policy', "default-src 'none'; sandbox");
}

function constantTimeStringEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let i = 0; i < length; i++) mismatch |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  return mismatch === 0;
}

async function verifyResendWebhookSignature(request: Request, rawBody: string, secret: string): Promise<boolean> {
  try {
    const messageId = request.headers.get('svix-id') || '';
    const timestamp = request.headers.get('svix-timestamp') || '';
    const signatureHeader = request.headers.get('svix-signature') || '';
    const timestampNumber = Number(timestamp);
    if (!messageId || !/^\d+$/.test(timestamp) || !Number.isFinite(timestampNumber)) return false;
    if (Math.abs(Math.floor(Date.now() / 1000) - timestampNumber) > 300) return false;
    if (!secret.startsWith('whsec_')) return false;

    const secretBytes = Uint8Array.from(atob(secret.slice('whsec_'.length)), char => char.charCodeAt(0));
    const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signedContent = new TextEncoder().encode(`${messageId}.${timestamp}.${rawBody}`);
    const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, signedContent));
    let binary = '';
    for (const byte of digest) binary += String.fromCharCode(byte);
    const expectedSignature = btoa(binary);
    return signatureHeader.split(' ').some(part => {
      const [version, signature] = part.split(',', 2);
      return version === 'v1' && Boolean(signature) && constantTimeStringEqual(signature, expectedSignature);
    });
  } catch {
    return false;
  }
}

function emailHtmlToText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

export const onRequest = async (context: any) => {
  const { request } = context;
  const rawEnv: Env = context.env || {};
  // Normalize bindings so different Cloudflare Pages binding names connect seamlessly
  const env: any = {
    ...rawEnv,
    DB: rawEnv.DB || rawEnv.D1 || rawEnv.DATABASE,
    R2_BUCKET: rawEnv.R2_BUCKET || rawEnv.R2 || rawEnv.BUCKET,
    KV: rawEnv.KV || rawEnv.FOX3_KV,
  };
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '');

  // CORS Headers
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-WebDAV-Config, X-WebDAV-Path',
  });

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }
  // WebDAV proxy: keeps remote Basic Auth out of third-party browser requests and
  // restricts every operation to a signed administrator session.
  if (path.startsWith('/webdav/')) {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers });
    if (!await hasAdminSession(request, env)) {
      return Response.json({ success: false, error: 'WebDAV 管理操作需要有效的管理员会话' }, { status: 401, headers });
    }
    const action = path.slice('/webdav/'.length).split('/')[0];
    return handleWebDavAction(action, request, headers);
  }

  if ((path === '/mail/webhook' || path === '/webhook') && request.method === 'POST') {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 1_048_576) {
      return new Response('Webhook payload too large', { status: 413, headers });
    }
    if (!env.RESEND_WEBHOOK_SECRET) {
      return new Response('Resend webhook signing secret is not configured', { status: 503, headers });
    }
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 1_048_576) {
      return new Response('Webhook payload too large', { status: 413, headers });
    }
    if (!await verifyResendWebhookSignature(request, rawBody, env.RESEND_WEBHOOK_SECRET)) {
      return new Response('Invalid webhook signature', { status: 401, headers });
    }

    let event: any;
    try { event = JSON.parse(rawBody); } catch { return new Response('Invalid webhook JSON', { status: 400, headers }); }
    if (event?.type !== 'email.received') {
      return new Response(JSON.stringify({ success: true, ignored: true }), { headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    }
    const resendEmailId = String(event?.data?.email_id || '').trim();
    const eventId = request.headers.get('svix-id') || '';
    if (!resendEmailId || resendEmailId.length > 200 || !eventId || eventId.length > 200) {
      return new Response('Invalid received email event', { status: 400, headers });
    }
    if (!env.DB) return new Response('D1 binding DB is required for inbound email storage', { status: 503, headers });
    const resendApiKey = String(env.RESEND_API_KEY || '').trim();
    if (!resendApiKey) return new Response('RESEND_API_KEY is required to retrieve inbound email content', { status: 503, headers });

    try {
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS fox3_inbound_emails (
        id TEXT PRIMARY KEY,
        eventId TEXT NOT NULL UNIQUE,
        sender TEXT NOT NULL,
        recipient TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        attachments TEXT NOT NULL DEFAULT '[]',
        receivedAt INTEGER NOT NULL
      )`).run();
      await env.DB.prepare('CREATE INDEX IF NOT EXISTS fox3_inbound_emails_received_at ON fox3_inbound_emails(receivedAt DESC)').run();
      const duplicate = await env.DB.prepare('SELECT id FROM fox3_inbound_emails WHERE id = ? OR eventId = ? LIMIT 1').bind(resendEmailId, eventId).first();
      if (duplicate) return new Response(JSON.stringify({ success: true, duplicate: true }), { headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });

      const contentResponse = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(resendEmailId)}?html_format=cid`, {
        headers: { Authorization: `Bearer ${resendApiKey}`, Accept: 'application/json' },
      });
      if (!contentResponse.ok) {
        console.warn(`[Mail Backend] Resend inbound retrieval failed with HTTP ${contentResponse.status}`);
        return new Response('Unable to retrieve received email from Resend', { status: 502, headers });
      }
      const contentText = await contentResponse.text();
      if (contentText.length > 4_000_000) return new Response('Received email content exceeds storage processing limit', { status: 413, headers });
      const received: any = JSON.parse(contentText);
      const sender = String(received?.from || event?.data?.from || '').slice(0, 500);
      const recipients = Array.isArray(received?.to) ? received.to : Array.isArray(event?.data?.to) ? event.data.to : [];
      const recipient = recipients.map((item: any) => String(item)).join(', ').slice(0, 1000);
      const subject = String(received?.subject || event?.data?.subject || '(无主题)').replace(/[\r\n]+/g, ' ').slice(0, 500);
      const sourceBody = typeof received?.text === 'string' && received.text.trim()
        ? received.text
        : emailHtmlToText(typeof received?.html === 'string' ? received.html : '');
      const body = sourceBody.slice(0, 250_000);
      const attachments = JSON.stringify((Array.isArray(received?.attachments) ? received.attachments : []).slice(0, 100).map((item: any) => ({
        id: String(item?.id || '').slice(0, 200),
        filename: String(item?.filename || '').slice(0, 300),
        contentType: String(item?.content_type || '').slice(0, 200),
        contentDisposition: String(item?.content_disposition || '').slice(0, 100),
        contentId: String(item?.content_id || '').slice(0, 200),
        size: Math.max(0, Number(item?.size) || 0),
      })));
      const parsedDate = Date.parse(String(received?.created_at || event?.data?.created_at || ''));
      const receivedAt = Number.isFinite(parsedDate) ? parsedDate : Date.now();
      const insert = await env.DB.prepare(`INSERT OR IGNORE INTO fox3_inbound_emails
        (id, eventId, sender, recipient, subject, body, attachments, receivedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(resendEmailId, eventId, sender, recipient, subject, body, attachments, receivedAt).run();
      await env.DB.prepare('DELETE FROM fox3_inbound_emails WHERE receivedAt < ?').bind(Date.now() - 180 * 24 * 60 * 60 * 1000).run();
      await env.DB.prepare('DELETE FROM fox3_inbound_emails WHERE id NOT IN (SELECT id FROM fox3_inbound_emails ORDER BY receivedAt DESC LIMIT 500)').run();
      return new Response(JSON.stringify({ success: true, stored: Number(insert?.meta?.changes || 0) > 0 }), { headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    } catch (error: any) {
      console.error(`[Mail Backend] Failed to store Resend inbound email: ${String(error?.message || error).slice(0, 180)}`);
      return new Response('Failed to process received email', { status: 500, headers });
    }
  }

  if (path === '/auth/session' && request.method === 'GET') {
    const authenticated = await hasAdminSession(request, env);
    if (!authenticated) {
      return new Response(JSON.stringify({ success: false, authenticated: false, error: '管理员会话无效或已过期' }), {
        status: 401,
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    }
    const username = (env.ADMIN_USERNAME || 'fox').trim().toLowerCase();
    return new Response(JSON.stringify({
      success: true,
      authenticated: true,
      user: { id: 'user_fox_admin', username, email: 'service@whitefox.blog', role: 'admin', createdAt: Date.now(), status: 'active' }
    }), { headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
  }

  // Admin credentials verification & backend variable resolver endpoint
  // Ensures single admin uniqueness. Reads ADMIN_PASSWORD and ADMIN_USERNAME from dashboard/environment variables.
  if (path === '/admin/config' || path === '/auth/admin') {
    const defaultAdminName = (env.ADMIN_USERNAME || 'fox').trim().toLowerCase();
    const hasConfiguredPassword = Boolean(getConfiguredAdminPassword(env));

    if (request.method === 'GET') {
      return new Response(JSON.stringify({
        success: true,
        adminUsername: defaultAdminName,
        isCustomPasswordConfigured: hasConfiguredPassword,
        isSessionSecretConfigured: Boolean(getAdminSessionSecret(env)),
        singleAdminEnforced: true,
        message: `单一管理员唯一性已生效，仅允许唯一超级管理员【${defaultAdminName}】`,
      }), {
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'POST') {
      try {
        const body = await request.json();
        const { username, password } = body;

        const validPassword = getConfiguredAdminPassword(env);
        const validUser = defaultAdminName.trim().toLowerCase();

        const inputUser = (username || '').trim().toLowerCase();
        const inputPass = typeof password === 'string' ? password : '';

        // Check if user matches admin name, 'admin', 'fox', or admin email
        const isAdminUser =
          inputUser === validUser ||
          inputUser === 'fox' ||
          inputUser === 'admin' ||
          inputUser === 'service@whitefox.blog' ||
          !inputUser; // Allow direct password verification for admin endpoint

        const credentialsMatch = Boolean(validPassword) && isAdminUser && inputPass === validPassword;
        const sessionToken = credentialsMatch ? await createAdminSessionToken(env) : '';
        const isMatch = credentialsMatch && Boolean(sessionToken);

        return new Response(JSON.stringify({
          success: isMatch,
          adminUsername: defaultAdminName,
          authenticated: isMatch,
          sessionToken: sessionToken || undefined,
          user: isMatch ? {
            id: 'user_fox_admin',
            username: defaultAdminName,
            email: 'service@whitefox.blog',
            role: 'admin',
            createdAt: Date.now(),
            status: 'active',
          } : null,
          message: isMatch ? '管理员身份鉴权成功' : credentialsMatch ? '请独立配置至少 32 个字符的 ADMIN_SESSION_SECRET（不可使用 ADMIN_PASSWORD 代替）' : '管理员账号或密码不正确',
        }), {
          headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 400,
          headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
        });
      }
    }
  }

  // Unified login endpoint: supports username or email + password, checks deployment ADMIN_PASSWORD
  if (path === '/auth/login' && request.method === 'POST') {
    try {
      const body = await request.json();
      const { account, password } = body;

      const validAdminName = (env.ADMIN_USERNAME || 'fox').trim().toLowerCase();
      const validAdminPass = getConfiguredAdminPassword(env);

      const inputAccount = (account || '').trim().toLowerCase();
      const inputPass = typeof password === 'string' ? password : '';

      // Check admin credentials
      const isAdminAccount =
        inputAccount === validAdminName ||
        inputAccount === 'fox' ||
        inputAccount === 'admin' ||
        inputAccount === 'service@whitefox.blog';

      if (isAdminAccount && validAdminPass && inputPass === validAdminPass) {
        const sessionToken = await createAdminSessionToken(env);
        if (!sessionToken) {
          return new Response(JSON.stringify({ success: false, authenticated: false, message: '请独立配置至少 32 个字符的 ADMIN_SESSION_SECRET（不可使用 ADMIN_PASSWORD 代替）' }), {
            status: 503,
            headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({
          success: true,
          authenticated: true,
          sessionToken,
          user: {
            id: 'user_fox_admin',
            username: validAdminName,
            email: 'service@whitefox.blog',
            role: 'admin',
            createdAt: Date.now(),
            status: 'active',
          },
          message: '超级管理员登录成功',
        }), {
          headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
        });
      }

      // Check regular user from D1 database if bound
      if (env.DB) {
        try {
          await ensureUsersTable(env.DB);

          const userRow = await env.DB.prepare(
            `SELECT id, username, email, password, role, createdAt, status FROM fox3_users
             WHERE LOWER(username) = ? OR LOWER(email) = ?`
          ).bind(inputAccount, inputAccount).first();

          if (userRow) {
            if (userRow.role === 'admin') {
              return new Response(JSON.stringify({ success: false, authenticated: false, message: '管理员账号必须通过部署端 ADMIN_PASSWORD 验证' }), {
                status: 401,
                headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
              });
            }
            if (await verifyUserPassword(env.DB, userRow, inputPass)) {
              return new Response(JSON.stringify({
                success: true,
                authenticated: true,
                user: {
                  id: userRow.id,
                  username: userRow.username,
                  email: userRow.email,
                  role: userRow.role,
                  createdAt: userRow.createdAt,
                  status: userRow.status,
                },
                message: '用户登录成功',
              }), {
                headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
              });
            } else {
              return new Response(JSON.stringify({
                success: false,
                authenticated: false,
                message: '密码不正确',
              }), {
                status: 401,
                headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
              });
            }
          }
        } catch (dbErr: any) {
          console.error('[Auth] User login D1 schema/query failure:', dbErr?.stack || dbErr?.message || dbErr);
          // Preserve the existing login fallback response semantics.
        }
      }

      // Return not found / fallback indicator
      return new Response(JSON.stringify({
        success: false,
        authenticated: false,
        fallbackToLocal: true,
        message: '账号或密码不正确',
      }), {
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 400,
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    }
  }

  // Send a real verification email; prefer D1 so KV quotas are reserved for fallback use.
  if (path === '/auth/send-code' && request.method === 'POST') {
    try {
      const body = await request.json() as any;
      const email = normalizeEmail(body.email);
      const username = String(body.username || '').trim().slice(0, 80);
      if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)) {
        return new Response(JSON.stringify({ success: false, error: '请输入有效的邮箱地址' }), { status: 400, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }
      if (!env.DB && !env.KV) {
        return new Response(JSON.stringify({ success: false, error: '验证码服务未配置 Cloudflare D1 或 KV，当前无法安全发送和校验验证码' }), { status: 503, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }

      // Public registration uses server-side settings only. Never accept SMTP/API secrets from visitors.
      const settings = getOutboundSettings({}, env);
      const codeLength = Math.min(8, Math.max(4, Number(env.VERIFY_CODE_LENGTH) || 6));
      const code = createVerificationCode(codeLength);
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const store = await reserveVerificationCode(env, email, ip, code);
      if (!store) {
        return new Response(JSON.stringify({ success: false, error: '发送过于频繁，请稍后再试' }), { status: 429, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }
      const templateValues: Record<string, string> = { code, username: username || '用户', email };
      const render = (value: unknown, fallback: string) => String(value || fallback).replace(/\{\{(code|username|email)\}\}/g, (_match, key) => templateValues[key] || '');
      const subject = render(env.VERIFY_EMAIL_SUBJECT, '【fox3 博客】注册验证码：{{code}}').replace(/[\r\n]+/g, ' ').slice(0, 180);
      const text = render(env.VERIFY_EMAIL_TEMPLATE, '您好 {{username}}，您的注册验证码是 {{code}}。验证码 10 分钟内有效；若非本人操作，请忽略此邮件。').slice(0, 10000);
      const html = `<div style="font-family:sans-serif;white-space:pre-wrap;line-height:1.7">${escapeHtml(text)}</div>`;

      const result = await dispatchEmail(settings, { to: email, subject, text, html });
      if (!result.success) {
        if (store === 'd1') {
          await env.DB.prepare(`UPDATE fox3_email_verifications SET code = '' WHERE email = ?`).bind(email).run();
        } else {
          await Promise.all([
            env.KV.delete(`verify_code_${email}`),
            env.KV.delete(`mail_rate_email_${encodeURIComponent(email)}`),
            env.KV.delete(`mail_rate_ip_${encodeURIComponent(ip)}`),
          ]);
        }
        return new Response(JSON.stringify({ success: false, error: result.error || '邮件发送失败，请检查发信设置' }), { status: 502, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({
        success: true,
        externalDispatched: true,
        provider: result.provider,
        codeLength,
        message: `验证码已发送至 ${email}，请查收邮件`,
      }), { headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    } catch (err: any) {
      console.warn('[Mail Backend] Verification email failed:', err?.message || 'unknown error');
      return new Response(JSON.stringify({ success: false, error: err?.message || '验证码邮件发送失败' }), { status: 500, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    }
  }

  // Check a code without returning or consuming it; registration validates it again and consumes it.
  if (path === '/auth/verify-code' && request.method === 'POST') {
    try {
      const body = await request.json() as any;
      const email = normalizeEmail(body.email);
      const code = String(body.code || '').trim();
      if ((!env.DB && !env.KV) || !email || !code) {
        return new Response(JSON.stringify({ success: false, error: '验证码不存在或已过期，请重新获取' }), { status: 400, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }
      const valid = await verifyStoredCode(env, email, code);
      return new Response(JSON.stringify({ success: valid, error: valid ? undefined : '验证码不正确或已过期，请重新获取' }), { status: valid ? 200 : 400, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    } catch {
      return new Response(JSON.stringify({ success: false, error: '验证码校验失败' }), { status: 500, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    }
  }

  if (path === '/auth/reset/send-code' && request.method === 'POST') {
    const genericResponse = () => new Response(JSON.stringify({ success: true, message: '若账号存在，验证码已发送' }), { headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    try {
      const body = await request.json() as any;
      const email = normalizeEmail(body.email);
      if (!isValidEmail(email)) {
        return new Response(JSON.stringify({ success: false, error: '请输入有效的邮箱地址' }), { status: 400, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }
      if (!env.DB) {
        return new Response(JSON.stringify({ success: false, error: '密码重置服务未配置 Cloudflare D1（DB）' }), { status: 503, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }

      const settings = getOutboundSettings({}, env);
      if (!hasOutboundMailService(settings)) {
        return new Response(JSON.stringify({ success: false, error: '密码重置邮件服务未配置，请检查发信服务、发件人和密钥' }), { status: 503, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }

      await ensureUsersTable(env.DB);
      await ensureVerificationTables(env.DB);
      await ensurePasswordResetTable(env.DB);
      const user = await env.DB.prepare(`SELECT id FROM fox3_users WHERE LOWER(email) = ? AND role = 'user' LIMIT 1`).bind(email).first();
      if (!user) return genericResponse();

      const now = Date.now();
      const ipHash = await hashRateLimitIp(request.headers.get('CF-Connecting-IP') || 'unknown');
      const [registrationRate, resetRate, ipRate] = await Promise.all([
        env.DB.prepare('SELECT lastSentAt FROM fox3_email_verifications WHERE email = ?').bind(email).first(),
        env.DB.prepare('SELECT lastSentAt FROM fox3_password_resets WHERE email = ?').bind(email).first(),
        env.DB.prepare('SELECT expiresAt FROM fox3_email_ip_rates WHERE ipHash = ?').bind(ipHash).first(),
      ]);
      if ((registrationRate && now - Number(registrationRate.lastSentAt) < 60_000) ||
          (resetRate && now - Number(resetRate.lastSentAt) < 60_000) ||
          (ipRate && Number(ipRate.expiresAt) > now)) return genericResponse();

      const code = createVerificationCode(Math.min(8, Math.max(4, Number(env.VERIFY_CODE_LENGTH) || 6)));
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO fox3_password_resets (email, code, attempts, expiresAt, lastSentAt)
          VALUES (?, ?, 0, ?, ?)
          ON CONFLICT(email) DO UPDATE SET code = excluded.code, attempts = 0,
            expiresAt = excluded.expiresAt, lastSentAt = excluded.lastSentAt`)
          .bind(email, code, now + 600_000, now),
        env.DB.prepare(`INSERT INTO fox3_email_ip_rates (ipHash, expiresAt) VALUES (?, ?)
          ON CONFLICT(ipHash) DO UPDATE SET expiresAt = excluded.expiresAt`).bind(ipHash, now + 60_000),
      ]);

      const text = `您好，您正在重置 fox3 账户密码。密码重置验证码：${code}\n验证码 10 分钟内有效，最多可尝试 10 次。若非本人操作，请忽略此邮件。此邮件不会包含您的密码。`;
      const html = `<div style="font-family:sans-serif;white-space:pre-wrap;line-height:1.7">${escapeHtml(text)}</div>`;
      const result = await dispatchEmail(settings, { to: email, subject: '【fox3 博客】密码重置验证码', text, html });
      if (!result.success) {
        await env.DB.prepare(`UPDATE fox3_password_resets SET code = '' WHERE email = ?`).bind(email).run();
        console.warn('[Auth] Password reset email dispatch failed:', result.error || 'mail dispatch failed');
        return new Response(JSON.stringify({ success: false, error: '验证码邮件发送失败，请稍后重试' }), { status: 502, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }
      return genericResponse();
    } catch (err: any) {
      console.error('[Auth] Password reset code request failed:', err?.stack || err?.message || err);
      return new Response(JSON.stringify({ success: false, error: '密码重置验证码服务暂不可用，请稍后重试' }), { status: 503, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    }
  }

  if (path === '/auth/reset-password' && request.method === 'POST') {
    try {
      const body = await request.json() as any;
      const email = normalizeEmail(body.email);
      const code = typeof body.code === 'string' ? body.code.trim() : '';
      const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
      if (!isValidEmail(email) || !code || newPassword.length < 6) {
        return new Response(JSON.stringify({ success: false, error: !isValidEmail(email) ? '请输入有效的邮箱地址' : !code ? '请输入验证码' : '新密码长度至少需 6 位字符' }), { status: 400, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }
      if (!env.DB) {
        return new Response(JSON.stringify({ success: false, error: '密码重置服务未配置 Cloudflare D1（DB）' }), { status: 503, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }

      await ensureUsersTable(env.DB);
      await ensurePasswordResetTable(env.DB);
      const user = await env.DB.prepare(`SELECT id FROM fox3_users WHERE LOWER(email) = ? AND role = 'user' LIMIT 1`).bind(email).first();
      const row = await env.DB.prepare('SELECT code, attempts, expiresAt FROM fox3_password_resets WHERE email = ?').bind(email).first();
      const now = Date.now();
      if (!row) {
        return new Response(JSON.stringify({ success: false, error: '验证码无效或已过期，请重新获取' }), { status: 400, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }
      const attempts = Number(row.attempts) || 0;
      if (Number(row.expiresAt) <= now || attempts >= 10 || !row.code) {
        await env.DB.prepare(`UPDATE fox3_password_resets SET code = '', attempts = 10 WHERE email = ?`).bind(email).run();
        return new Response(JSON.stringify({ success: false, error: '验证码无效或已过期，请重新获取' }), { status: 400, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }
      if (!user || String(row.code) !== code) {
        const nextAttempts = attempts + 1;
        await env.DB.prepare(`UPDATE fox3_password_resets SET attempts = ?, code = CASE WHEN ? >= 10 THEN '' ELSE code END WHERE email = ? AND expiresAt > ?`)
          .bind(nextAttempts, nextAttempts, email, now).run();
        return new Response(JSON.stringify({ success: false, error: '验证码无效或已过期，请重新获取' }), { status: 400, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }

      const passwordHash = await hashUserPassword(newPassword);
      const results = await env.DB.batch([
        env.DB.prepare(`UPDATE fox3_users SET password = ? WHERE id = ? AND role = 'user'
          AND EXISTS (SELECT 1 FROM fox3_password_resets WHERE email = ? AND code = ? AND expiresAt > ? AND attempts < 10)`)
          .bind(passwordHash, user.id, email, code, now),
        env.DB.prepare(`UPDATE fox3_password_resets SET code = '', attempts = 10 WHERE email = ? AND code = ? AND expiresAt > ? AND attempts < 10`)
          .bind(email, code, now),
      ]);
      if (Number(results?.[0]?.meta?.changes || 0) !== 1) {
        return new Response(JSON.stringify({ success: false, error: '验证码无效或已过期，请重新获取' }), { status: 400, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true, message: '密码已重置，请使用新密码登录' }), { headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    } catch (err: any) {
      console.error('[Auth] Password reset failed:', err?.stack || err?.message || err);
      return new Response(JSON.stringify({ success: false, error: '密码重置失败，请稍后重试' }), { status: 503, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    }
  }

  // Registration endpoint (Option A: strictly forbid registering admin reserved names)
  if (path === '/auth/register' && request.method === 'POST') {
    try {
      const body = await request.json() as any;
      const { username, email, password, verificationCode } = body;

      const validAdminName = (env.ADMIN_USERNAME || 'fox').trim().toLowerCase();

      const inputUser = typeof username === 'string' ? username.trim() : '';
      const inputEmail = normalizeEmail(email);
      const inputPass = typeof password === 'string' ? password.trim() : '';

      if (!env.DB) {
        return new Response(JSON.stringify({ success: false, error: '注册服务暂不可用：必须配置 Cloudflare D1（DB）以安全保存账户' }), { status: 503, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }

      if (inputUser.length < 2) {
        return new Response(JSON.stringify({ success: false, error: '用户名至少需要 2 个字符' }), { status: 400, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }
      if (inputPass.length < 6) {
        return new Response(JSON.stringify({ success: false, error: '密码长度至少需 6 位字符' }), { status: 400, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }

      // Forbid registration of reserved administrator names
      if (
        inputUser.toLowerCase() === validAdminName ||
        inputUser.toLowerCase() === 'fox' ||
        inputUser.toLowerCase() === 'admin'
      ) {
        return new Response(JSON.stringify({
          success: false,
          error: '系统保留账号不可注册，超级管理员请直接通过登录页面鉴权进入。'
        }), {
          status: 400,
          headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
        });
      }

      if (email != null && String(email).trim() !== '' && !isValidEmail(inputEmail)) {
        return new Response(JSON.stringify({ success: false, error: '请输入格式正确的邮箱地址' }), { status: 400, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }

      if (inputEmail) {
        if (!isValidEmail(inputEmail)) {
          return new Response(JSON.stringify({ success: false, error: '请输入格式正确的邮箱地址' }), { status: 400, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
        }
        if (!env.DB && !env.KV) {
          return new Response(JSON.stringify({ success: false, error: '验证码服务未配置' }), { status: 503, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
        }
        const validCode = await verifyStoredCode(env, inputEmail, String(verificationCode || '').trim());
        if (!validCode) {
          return new Response(JSON.stringify({ success: false, error: '验证码不正确或已过期，请重新获取' }), { status: 400, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
        }
      }

      const assignedRole = 'user';

      try {
        await ensureUsersTable(env.DB);
      } catch (dbErr: any) {
        console.error('[Auth] Registration users-table migration failed:', dbErr?.stack || dbErr?.message || dbErr);
        return new Response(JSON.stringify({ success: false, error: '账户数据库结构初始化失败，请联系管理员检查 fox3_users 表结构或稍后重试' }), { status: 503, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }

      const existing = await env.DB.prepare(
        `SELECT id FROM fox3_users WHERE LOWER(username) = ? OR (? <> '' AND LOWER(email) = ?) LIMIT 1`
      ).bind(inputUser.toLowerCase(), inputEmail, inputEmail).first();
      if (existing) {
        return new Response(JSON.stringify({ success: false, error: '该用户名或邮箱已被注册' }), { status: 409, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }

      const userId = `user_${crypto.randomUUID()}`;
      const createdAt = Date.now();
      const passwordHash = await hashUserPassword(inputPass);
      try {
        await env.DB.prepare(
          `INSERT INTO fox3_users (id, username, email, password, role, createdAt, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(userId, inputUser, inputEmail, passwordHash, assignedRole, createdAt, 'active').run();
      } catch (dbErr: any) {
        console.error('[Auth] Registration D1 insert failed:', dbErr?.stack || dbErr?.message || dbErr);
        return new Response(JSON.stringify({ success: false, error: '账户无法写入数据库，请检查 fox3_users 表结构及数据库配置后重试' }), { status: 503, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }

      if (inputEmail) {
        try {
          await consumeStoredCode(env, inputEmail);
        } catch {}
      }

      return new Response(JSON.stringify({
        success: true,
        user: {
          id: userId,
          username: inputUser,
          email: inputEmail,
          role: assignedRole,
          createdAt,
          status: 'active',
        },
        message: '用户注册成功',
      }), {
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 400,
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    }
  }

  // D1-backed registered-user management. Never expose password hashes to the client.
  if (path === '/admin/users' && ['GET', 'PATCH', 'DELETE'].includes(request.method)) {
    const jsonResponse = (payload: any, status = 200) => new Response(JSON.stringify(payload), {
      status,
      headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' },
    });
    if (!await hasAdminSession(request, env)) {
      return jsonResponse({ success: false, error: '需要有效的管理员会话' }, 401);
    }
    if (!env.DB) {
      return jsonResponse({ success: false, error: '用户数据库不可用，请检查 D1 绑定 DB' }, 503);
    }

    try {
      await ensureUsersTable(env.DB);
      if (request.method === 'GET') {
        const result = await env.DB.prepare(`SELECT id, username, email, role, createdAt, status
          FROM fox3_users ORDER BY COALESCE(createdAt, 0) DESC LIMIT 1000`).all();
        const users = (result?.results || []).map((row: any) => ({
          id: String(row.id || ''),
          username: String(row.username || ''),
          email: String(row.email || ''),
          role: row.role === 'admin' ? 'admin' : 'user',
          createdAt: Number(row.createdAt) || 0,
          status: row.status === 'disabled' ? 'disabled' : 'active',
        }));
        return jsonResponse({ success: true, users });
      }

      const body = await request.json() as any;
      const id = typeof body?.id === 'string' ? body.id.trim() : '';
      if (!id || id.length > 200) return jsonResponse({ success: false, error: '用户 ID 无效' }, 400);

      if (request.method === 'PATCH') {
        const status = body?.status;
        if (status !== 'active' && status !== 'disabled') {
          return jsonResponse({ success: false, error: '账号状态只能设置为 active 或 disabled' }, 400);
        }
        const result = await env.DB.prepare(`UPDATE fox3_users SET status = ? WHERE id = ? AND COALESCE(role, 'user') <> 'admin'`)
          .bind(status, id).run();
        if (Number(result?.meta?.changes || 0) !== 1) {
          return jsonResponse({ success: false, error: '用户不存在，或不可修改管理员账号' }, 404);
        }
        return jsonResponse({ success: true, id, status });
      }

      const result = await env.DB.prepare(`DELETE FROM fox3_users WHERE id = ? AND COALESCE(role, 'user') <> 'admin'`)
        .bind(id).run();
      if (Number(result?.meta?.changes || 0) !== 1) {
        return jsonResponse({ success: false, error: '用户不存在，或不可删除管理员账号' }, 404);
      }
      return jsonResponse({ success: true, id });
    } catch (err: any) {
      console.error('[Admin] D1 user management failed:', err?.stack || err?.message || err);
      return jsonResponse({ success: false, error: 'D1 用户管理操作失败，请检查 fox3_users 表结构和 DB 绑定' }, 503);
    }
  }

  // Health check & genuine connectivity status indicator
  // Each cloud service is reported only after a live read-only connectivity probe.
  if (path === '/status' || path === '') {
    let d1Healthy = false;
    let r2Healthy = false;
    let kvHealthy = false;
    let externalObjectStorageHealthy = false;
    const externalObjectStore = getExternalObjectStoreConfig(env);

    // Active live connectivity probing
    if (env.DB) {
      try {
        await env.DB.prepare('SELECT 1').first();
        d1Healthy = true;
      } catch {
        d1Healthy = false;
      }
    }

    if (env.R2_BUCKET) {
      try {
        await env.R2_BUCKET.list({ limit: 1 });
        r2Healthy = true;
      } catch {
        r2Healthy = false;
      }
    }

    if (env.KV) {
      try {
        await env.KV.get('__fox3_probe__');
        kvHealthy = true;
      } catch {
        kvHealthy = false;
      }
    }

    if (externalObjectStore && await hasAdminSession(request, env)) {
      try {
        externalObjectStorageHealthy = await probeExternalObjectStore(externalObjectStore);
      } catch {
        externalObjectStorageHealthy = false;
      }
    }
    const channelOnline = d1Healthy || r2Healthy || externalObjectStorageHealthy;

    return new Response(JSON.stringify({
      success: true,
      status: channelOnline ? 'online' : 'offline',
      channelOnline,
      version: '3.8.1',
      cloudServices: {
        d1: d1Healthy,
        r2: r2Healthy,
        kv: kvHealthy,
        objectStorage: externalObjectStorageHealthy,
        objectStorageProvider: externalObjectStore?.provider || null,
      },
      message: channelOnline
        ? '至少一个 D1/R2/COS/OSS/S3-compatible 资源探测成功；请查看 cloudServices 各项状态'
        : 'D1、R2 与已配置的 COS/OSS/S3-compatible 存储均未通过探测；服务端云存储功能不可用',
      timestamp: Date.now(),
    }), {
      headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
    });
  }

  // Cross-device sync store & retrieve (/api/sync/:key)
  // Devices push on explicit sync or opted-in data changes; this route is not polled in idle intervals.
  // Prefer D1 to avoid exhausting the daily KV write allowance; retain KV as fallback.
  if (path.startsWith('/sync/')) {
    if (!await hasAdminSession(request, env)) {
      return new Response(JSON.stringify({ success: false, error: '云端共享同步需要有效的管理员会话' }), { status: 401, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    }
    const syncKey = path.replace('/sync/', '');

    // Initialize D1 table if DB is available
    if (env.DB) {
      try {
        await env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS fox3_sync (key TEXT PRIMARY KEY, value TEXT, updatedAt INTEGER)`
        ).run();
      } catch (e) {
        // Ignore table check errors
      }
    }

    if (request.method === 'GET') {
      let data: any = null;
      let fromCloud = false;

      // Check D1 first because it is the primary persistent store for sync data.
      if (env.DB) {
        try {
          const row = await env.DB.prepare(`SELECT value FROM fox3_sync WHERE key = ?`).bind(syncKey).first();
          if (row && row.value) {
            data = JSON.parse(row.value);
            fromCloud = true;
          }
        } catch (e) {}
      }

      // Read legacy KV data only when D1 has no value.
      if (!data && env.KV) {
        try {
          const val = await env.KV.get(`fox3_sync_${syncKey}`);
          if (val) {
            data = JSON.parse(val);
            fromCloud = true;
          }
        } catch (e) {}
      }


      return new Response(JSON.stringify({
        success: true,
        data,
        fromCloud,
        timestamp: Date.now(),
      }), {
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'POST') {
      try {
        const payload = await request.json();
        const stringified = JSON.stringify(payload);
        let syncedToCloud = false;


        if (env.DB) {
          try {
            await env.DB.prepare(
              `INSERT INTO fox3_sync (key, value, updatedAt) VALUES (?, ?, ?)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`
            ).bind(syncKey, stringified, Date.now()).run();
            syncedToCloud = true;
          } catch (e) {}
        }

        if (!syncedToCloud && env.KV) {
          try {
            await env.KV.put(`fox3_sync_${syncKey}`, stringified, { expirationTtl: 86400 * 90 });
            syncedToCloud = true;
          } catch (e) {}
        }

        if (!syncedToCloud) {
          return new Response(JSON.stringify({
            success: false,
            syncedToCloud: false,
            error: '未绑定可用的 D1 或 KV 持久化存储；为避免假成功，本次数据未确认保存到云端',
            timestamp: Date.now(),
          }), { status: 503, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ success: true, syncedToCloud: true, timestamp: Date.now() }), {
          headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
        });
      } catch (syncErr: any) {
        return new Response(JSON.stringify({ success: false, syncedToCloud: false, error: syncErr?.message || '云端持久化同步失败' }), {
          status: 500,
          headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
        });
      }
    }
  }

  // Public file uploads support blog/media publishing; apply strict size and active-content limits.
  if (path === '/upload' && request.method === 'POST') {
    try {
      const maxUploadBytes = 90 * 1024 * 1024;
      const contentLength = Number(request.headers.get('content-length') || 0);
      if (contentLength > maxUploadBytes + 1024 * 1024) {
        return new Response(JSON.stringify({ success: false, error: '上传请求超过 90 MB 限制' }), { status: 413, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return new Response(JSON.stringify({ error: 'No file uploaded' }), {
          status: 400,
          headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
        });
      }
      if (file.size > maxUploadBytes) {
        return new Response(JSON.stringify({ success: false, error: '单个文件不能超过 90 MB' }), { status: 413, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }
      if (/\.(html?|xhtml|svg|xml|js|mjs|cjs|wasm|php|phtml|exe|dll|bat|cmd|sh)$/i.test(file.name) || /^(text\/html|application\/xhtml\+xml|image\/svg\+xml|text\/xml|application\/xml|application\/(javascript|ecmascript|wasm|x-msdownload)|text\/javascript)/i.test(file.type)) {
        return new Response(JSON.stringify({ success: false, error: '不接受可执行网页、脚本或程序文件' }), { status: 415, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }

      const canUseD1Fallback = file.size <= 1024 * 1024 && Boolean(env.DB);
      const canUseKvFallback = file.size <= 18 * 1024 * 1024 && Boolean(env.KV);
      const canUseMemoryFallback = file.size <= 4 * 1024 * 1024;
      const externalObjectStore = getExternalObjectStoreConfig(env);
      if (!env.R2_BUCKET && !externalObjectStore && !canUseD1Fallback && !canUseKvFallback && !canUseMemoryFallback) {
        return new Response(JSON.stringify({ success: false, error: '该文件大小需绑定 Cloudflare R2 或配置服务端 COS/OSS/S3-compatible 存储；D1/KV/内存回退无法安全保存此文件' }), { status: 503, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }

      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 150) || 'upload.bin';
      const key = `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;
      const contentType = file.type || 'application/octet-stream';
      let storedTarget = 'none';

      // 1. Primary: Cloudflare R2 Storage
      if (env.R2_BUCKET) {
        try {
          await env.R2_BUCKET.put(key, file.stream(), {
            httpMetadata: {
              contentType,
              contentDisposition: `inline; filename="${encodeURIComponent(file.name)}"`,
            },
            customMetadata: {
              originalName: encodeURIComponent(file.name),
              uploadedAt: String(Date.now()),
            }
          });
          storedTarget = 'r2';
        } catch (r2Err) {
          console.warn('[fox3] R2 upload error; trying configured external object storage or bounded fallback:', r2Err);
        }
      }

      // 2. Secondary object storage: Tencent COS / Alibaba OSS via server-side credentials.
      if (storedTarget === 'none' && externalObjectStore) {
        try {
          await putExternalObject(externalObjectStore, key, file.stream(), contentType, file.name);
          storedTarget = externalObjectStore.provider;
        } catch (externalErr) {
          console.warn(`[fox3] ${externalObjectStore.provider.toUpperCase()} upload failed; trying bounded fallback:`, externalErr);
        }
      }

      // Convert file buffer to base64 if needed for D1/KV/Memory
      let base64Data = '';
      if (storedTarget === 'none' && (canUseD1Fallback || canUseKvFallback || canUseMemoryFallback)) {
        const arrayBuf = await file.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(arrayBuf);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64Data = btoa(binary);
      }

      // 3. Cloudflare D1 SQLite database (fox3_files table), limited to 1 MiB.
      if (storedTarget === 'none' && canUseD1Fallback) {
        try {
          await env.DB.prepare(
            `CREATE TABLE IF NOT EXISTS fox3_files (
              key TEXT PRIMARY KEY,
              name TEXT,
              type TEXT,
              size INTEGER,
              data TEXT,
              uploadedAt INTEGER
            )`
          ).run();

          await env.DB.prepare(
            `INSERT INTO fox3_files (key, name, type, size, data, uploadedAt)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(key, file.name, contentType, file.size, base64Data, Date.now()).run();
          storedTarget = 'd1';
        } catch (d1Err) {
          console.warn('[fox3] D1 file store failed:', d1Err);
        }
      }

      // 4. Cloudflare KV, limited to 18 MiB.
      if (storedTarget === 'none' && canUseKvFallback) {
        try {
          await env.KV.put(`fox3_file_${key}`, JSON.stringify({
            name: file.name,
            type: contentType,
            size: file.size,
            data: base64Data,
            uploadedAt: Date.now()
          }), { expirationTtl: 86400 * 90 });
          storedTarget = 'kv';
        } catch (kvErr) {
          console.warn('[fox3] KV file store failed:', kvErr);
        }
      }

      // 5. In-Memory Edge Cache Fallback, limited to 4 MiB and not durable.
      if (storedTarget === 'none' && canUseMemoryFallback) {
        if (!(globalThis as any).__fox3_file_store) {
          (globalThis as any).__fox3_file_store = {};
        }
        (globalThis as any).__fox3_file_store[key] = {
          name: file.name,
          type: contentType,
          size: file.size,
          data: base64Data,
          uploadedAt: Date.now()
        };
        storedTarget = 'memory';
      }

      if (storedTarget === 'none') {
        return new Response(JSON.stringify({ success: false, error: '文件未保存：请检查 R2 绑定；若配置 COS/OSS/S3-compatible，请核对 provider、Bucket、地域、endpoint、访问密钥与写入权限；小文件还可检查 D1/KV 绑定和可用额度。' }), { status: 503, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }

      const publicUrl = `/api/files/${key}`;
      return new Response(JSON.stringify({
        success: true,
        key,
        url: publicUrl,
        name: file.name,
        size: file.size,
        type: contentType,
        storedTarget,
      }), {
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Upload failed' }), {
        status: 500,
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    }
  }

  // Universal file stream from R2, configured external object storage, D1, KV, or memory.
  if (path.startsWith('/files/')) {
    const key = path.replace('/files/', '');
    const isDownload = url.searchParams.get('download') === '1';

    // 1. Try fetch from R2
    if (env.R2_BUCKET) {
      try {
        const object = await env.R2_BUCKET.get(key);
        if (object) {
          const responseHeaders = new Headers(headers);
          applyFileSafetyHeaders(responseHeaders);
          object.writeHttpMetadata(responseHeaders);
          responseHeaders.set('etag', object.httpEtag);
          responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');

          if (isDownload) {
            const originalName = object.customMetadata?.originalName || key;
            responseHeaders.set('Content-Disposition', `attachment; filename="${originalName}"; filename*=UTF-8''${originalName}`);
          }
          return new Response(object.body, { headers: responseHeaders });
        }
      } catch (e) {}
    }

    // 2. Read from the configured COS/OSS object provider when available.
    const externalObjectStore = getExternalObjectStoreConfig(env);
    if (externalObjectStore) {
      try {
        const object = await getExternalObject(externalObjectStore, key);
        if (object) {
          const responseHeaders = new Headers(headers);
          applyFileSafetyHeaders(responseHeaders);
          responseHeaders.set('Content-Type', object.headers.get('content-type') || 'application/octet-stream');
          responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
          const originalName = object.headers.get('x-amz-meta-original-name') || object.headers.get('x-oss-meta-original-name') || key;
          if (isDownload) {
            const asciiName = key.split('-').slice(2).join('-') || 'download';
            responseHeaders.set('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${originalName}`);
          }
          return new Response(object.body, { headers: responseHeaders });
        }
      } catch (e) {
        console.warn(`[fox3] ${externalObjectStore.provider.toUpperCase()} read failed; trying bounded fallback:`, e);
      }
    }

    // 3. Try fetch from D1
    if (env.DB) {
      try {
        const row = await env.DB.prepare(
          `SELECT name, type, size, data FROM fox3_files WHERE key = ?`
        ).bind(key).first();

        if (row && row.data) {
          const binaryStr = atob(row.data);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const responseHeaders = new Headers(headers);
          applyFileSafetyHeaders(responseHeaders);
          responseHeaders.set('Content-Type', row.type || 'application/octet-stream');
          responseHeaders.set('Content-Length', String(len));
          responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
          if (isDownload) {
            const safeName = encodeURIComponent(row.name || key);
            responseHeaders.set('Content-Disposition', `attachment; filename="${safeName}"; filename*=UTF-8''${safeName}`);
          }
          return new Response(bytes.buffer, { headers: responseHeaders });
        }
      } catch (e) {}
    }

    // 3. Try fetch from KV
    if (env.KV) {
      try {
        const kvVal = await env.KV.get(`fox3_file_${key}`);
        if (kvVal) {
          const fileMeta = JSON.parse(kvVal);
          if (fileMeta && fileMeta.data) {
            const binaryStr = atob(fileMeta.data);
            const len = binaryStr.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            const responseHeaders = new Headers(headers);
            applyFileSafetyHeaders(responseHeaders);
            responseHeaders.set('Content-Type', fileMeta.type || 'application/octet-stream');
            responseHeaders.set('Content-Length', String(len));
            responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
            if (isDownload) {
              const safeName = encodeURIComponent(fileMeta.name || key);
              responseHeaders.set('Content-Disposition', `attachment; filename="${safeName}"; filename*=UTF-8''${safeName}`);
            }
            return new Response(bytes.buffer, { headers: responseHeaders });
          }
        }
      } catch (e) {}
    }

    // 4. Try fetch from in-memory store
    if ((globalThis as any).__fox3_file_store && (globalThis as any).__fox3_file_store[key]) {
      const fileMeta = (globalThis as any).__fox3_file_store[key];
      const binaryStr = atob(fileMeta.data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const responseHeaders = new Headers(headers);
      applyFileSafetyHeaders(responseHeaders);
      responseHeaders.set('Content-Type', fileMeta.type || 'application/octet-stream');
      responseHeaders.set('Content-Length', String(len));
      responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
      if (isDownload) {
        const safeName = encodeURIComponent(fileMeta.name || key);
        responseHeaders.set('Content-Disposition', `attachment; filename="${safeName}"; filename*=UTF-8''${safeName}`);
      }
      return new Response(bytes.buffer, { headers: responseHeaders });
    }

    return new Response('File not found', { status: 404, headers });
  }

  // D1 Database status & health indicator (secure - no raw SQL execution)
  if (path === '/d1/status' && request.method === 'GET') {
    return new Response(JSON.stringify({
      available: Boolean(env.DB),
      type: 'Cloudflare D1 SQLite',
      time: new Date().toISOString()
    }), {
      headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
    });
  }

  if (path === '/mail/inbox' && request.method === 'GET') {
    if (!await hasAdminSession(request, env)) {
      return new Response(JSON.stringify({ success: false, error: '查看站内收件箱需要管理员重新登录' }), { status: 401, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    }
    if (!env.DB) {
      return new Response(JSON.stringify({ success: false, error: '站内收件箱需要绑定 D1 数据库 DB' }), { status: 503, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    }
    try {
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS fox3_inbound_emails (
        id TEXT PRIMARY KEY,
        eventId TEXT NOT NULL UNIQUE,
        sender TEXT NOT NULL,
        recipient TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        attachments TEXT NOT NULL DEFAULT '[]',
        receivedAt INTEGER NOT NULL
      )`).run();
      const result = await env.DB.prepare('SELECT id, sender, recipient, subject, body, receivedAt FROM fox3_inbound_emails ORDER BY receivedAt DESC LIMIT 200').all();
      const mails = (result?.results || []).map((row: any) => ({
        id: `resend-inbound-${row.id}`,
        folder: 'inbox',
        sender: String(row.sender || ''),
        recipient: String(row.recipient || ''),
        subject: String(row.subject || '(无主题)'),
        body: String(row.body || ''),
        date: new Date(Number(row.receivedAt) || Date.now()).toISOString().replace('T', ' ').slice(0, 19),
        read: false,
        isStarred: false,
        createdAt: Number(row.receivedAt) || Date.now(),
        updatedAt: Number(row.receivedAt) || Date.now(),
      }));
      return new Response(JSON.stringify({ success: true, mails }), { headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    } catch {
      return new Response(JSON.stringify({ success: false, error: '读取 D1 收件箱失败，请检查数据库绑定与迁移状态' }), { status: 500, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    }
  }

  if (path === '/mail/test-connection' && request.method === 'POST') {
    if (!await hasAdminSession(request, env)) {
      return new Response(JSON.stringify({ success: false, error: '连接测试需要管理员重新登录' }), { status: 401, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    }
    try {
      const probe = await probeResendConnection(getOutboundSettings({}, env));
      return new Response(JSON.stringify({ success: true, ...probe }), { headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err?.message || 'Resend API 连接检查失败' }), { status: 502, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    }
  }

  // Send an email through the selected SMTP/API provider; never claim success on local-only fallback.
  if (path === '/mail/test' && request.method === 'POST') {
    if (!await hasAdminSession(request, env)) {
      return new Response(JSON.stringify({ success: false, error: '邮件连通测试需要管理员重新登录' }), { status: 401, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    }
    try {
      if (env.DB) {
        try {
          await env.DB.prepare(`CREATE TABLE IF NOT EXISTS fox3_mail_test_rates (ipHash TEXT PRIMARY KEY, expiresAt INTEGER NOT NULL)`).run();
          const ipHash = await hashRateLimitIp(request.headers.get('CF-Connecting-IP') || 'unknown');
          const now = Date.now();
          await env.DB.prepare('DELETE FROM fox3_mail_test_rates WHERE ipHash = ? AND expiresAt <= ?').bind(ipHash, now).run();
          const reservation = await env.DB.prepare('INSERT OR IGNORE INTO fox3_mail_test_rates (ipHash, expiresAt) VALUES (?, ?)').bind(ipHash, now + 60_000).run();
          if (Number(reservation?.meta?.changes || 0) === 0) {
            return new Response(JSON.stringify({ success: false, error: '测试邮件每分钟仅允许一次，请稍后再试' }), { status: 429, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
          }
        } catch (rateLimitError: any) {
          console.warn(`[Mail Backend] D1 rate limit unavailable; admin-only test continues: ${String(rateLimitError?.message || rateLimitError).slice(0, 120)}`);
        }
      }
      const body = await request.json() as any;
      const source = body.source === 'backend' ? 'backend' : 'frontend';
      const settings = source === 'backend'
        ? getOutboundSettings({}, env)
        : getOutboundSettings(body.clientEmailSettings || {}, {});
      const to = normalizeEmail(settings.senderEmail || '');
      if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(to)) {
        return new Response(JSON.stringify({ success: false, source, error: source === 'backend' ? '后台 MAIL_SENDER 未配置为有效邮箱地址' : '前台发件人邮箱不是有效地址' }), { status: 400, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }
      const result = await dispatchEmail(settings, {
        to,
        subject: 'fox3 邮件连通测试',
        text: `这是一封 fox3 ${source === 'backend' ? '后台环境变量' : '前台邮箱配置'}的连通测试邮件。收到本邮件说明邮件服务已接受投递请求。`,
        html: `<p>这是一封 fox3 ${source === 'backend' ? '后台环境变量' : '前台邮箱配置'}的连通测试邮件。</p><p>收到本邮件说明邮件服务已接受投递请求。</p>`,
      });
      return new Response(JSON.stringify({ success: result.success, source, provider: result.provider, recipient: to, error: result.error || undefined }), {
        status: result.success ? 200 : 502,
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err?.message || '邮件连通测试失败' }), { status: 500, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    }
  }

  if (path === '/mail/send' && request.method === 'POST') {
    if (!await hasAdminSession(request, env)) {
      return new Response(JSON.stringify({ success: false, delivered: false, error: '发送邮件需要有效的管理员会话，请重新登录' }), { status: 401, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    }
    try {
      const body = await request.json() as any;
      const { subject, html, text, type, clientEmailSettings } = body;
      let to = normalizeEmail(body.to);
      if (type === 'admin_reply' && body.recipientIdentity) {
        const registeredEmail = await findRegisteredUserEmail(env.DB, String(body.recipientIdentity));
        if (registeredEmail) to = registeredEmail;
      }
      if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(to)) {
        return new Response(JSON.stringify({ success: false, error: '收件人必须是有效邮箱地址' }), { status: 400, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }

      const settings = body.settingsSource === 'backend'
        ? getOutboundSettings({}, env)
        : getOutboundSettings(clientEmailSettings || {}, {});
      const mailSubject = String(subject || 'fox3 博客系统通知').replace(/[\r\n]+/g, ' ').slice(0, 180);
      const mailText = typeof text === 'string' ? text.slice(0, 100000) : '';
      const mailHtml = typeof html === 'string' ? html.slice(0, 150000) : undefined;
      const result = await dispatchEmail(settings, { to, subject: mailSubject, text: mailText, html: mailHtml });
      if (!result.success) {
        return new Response(JSON.stringify({ success: false, delivered: false, externalDispatched: false, provider: result.provider, error: result.error || '邮件发送失败' }), { status: 502, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
      }

      const mailRecord = {
        id: `mail_dispatch_${Date.now()}`,
        folder: 'sent',
        recipient: to,
        sender: settings.senderEmail || env.MAIL_SENDER || '',
        subject: mailSubject,
        body: mailText || mailHtml || '',
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        delivered: true,
        externalDispatched: true,
        externalProvider: result.provider,
        read: true,
        isStarred: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return new Response(JSON.stringify({
        success: true,
        delivered: true,
        externalDispatched: true,
        provider: result.provider,
        mailRecord,
        message: `已通过 ${result.provider} 成功投递至 ${to}`,
      }), { headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, delivered: false, error: err?.message || '邮件发送失败' }), { status: 500, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' } });
    }
  }

  // Mail Service API Status & Configuration Endpoint
  // Reads backend Cloudflare environment variables or D1/KV storage
  if (path === '/mail/status') {
    const outboundSettings = getOutboundSettings({}, env);
    const outboundConfigured = outboundSettings.provider === 'smtp'
      ? Boolean(outboundSettings.smtpHost && outboundSettings.smtpUser && outboundSettings.smtpPass && outboundSettings.senderEmail)
      : Boolean(outboundSettings.apiKey && outboundSettings.senderEmail);
    const outboundApiKeyConfigured = outboundSettings.provider !== 'smtp' && Boolean(outboundSettings.apiKey);
    const inboundApiKeyAvailable = Boolean(env.RESEND_API_KEY);
    const inboundServerReady = Boolean(env.DB && env.RESEND_WEBHOOK_SECRET && inboundApiKeyAvailable);
    let lastReceivedAt: number | null = null;
    if (env.DB) {
      try {
        const lastReceived = await env.DB.prepare('SELECT MAX(receivedAt) AS lastReceivedAt FROM fox3_inbound_emails').first();
        const value = Number(lastReceived?.lastReceivedAt);
        if (Number.isFinite(value) && value > 0) lastReceivedAt = value;
      } catch {}
    }

    return new Response(JSON.stringify({
      success: true,
      outbound: {
        configured: outboundConfigured,
        apiKeyConfigured: outboundApiKeyConfigured,
        senderConfigured: Boolean(outboundSettings.senderEmail),
        provider: outboundSettings.provider,
        connectionProbeSupported: outboundSettings.provider === 'resend',
        verified: false,
        status: outboundConfigured ? 'configured_unverified' : 'unconfigured',
        senderEmail: outboundSettings.senderEmail || '',
      },
      inbound: {
        configured: inboundServerReady,
        implemented: true,
        verified: Boolean(lastReceivedAt),
        d1Available: Boolean(env.DB),
        webhookSecretConfigured: Boolean(env.RESEND_WEBHOOK_SECRET),
        resendApiKeyConfigured: inboundApiKeyAvailable,
        lastReceivedAt,
        status: lastReceivedAt ? 'receiving' : inboundServerReady ? 'server_ready_waiting_for_first_email' : 'missing_server_configuration',
      },
      quotaLimit: 3000,
      timestamp: Date.now(),
    }), {
      headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ message: 'fox3 Cloudflare API Ready' }), {
    headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
  });
};
