import { connect } from 'cloudflare:sockets';

export type SmtpSecurity = 'ssl' | 'starttls';
export type MailProvider = 'smtp' | 'resend' | 'brevo' | 'sendgrid' | 'mailgun' | 'ses' | 'postmark' | 'custom';

export interface OutboundMailSettings {
  provider: MailProvider;
  apiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecurity?: SmtpSecurity;
  smtpUser?: string;
  smtpPass?: string;
  senderEmail?: string;
}

export interface OutboundMail {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface MailDispatchResult {
  success: boolean;
  provider: string;
  error?: string;
}

const encoder = new TextEncoder();

function safeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function normalizeAddress(value: string, fieldName: string): string {
  const candidate = value.trim().match(/<([^<>]+)>/)?.[1] || value.trim();
  if (/[\r\n]/.test(candidate) || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(candidate)) {
    throw new Error(`无效的${fieldName}邮箱地址`);
  }
  return candidate;
}

function base64Utf8(value: string): string {
  const bytes = encoder.encode(value);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64Lines(value: string): string {
  const encoded = base64Utf8(value);
  return encoded.match(/.{1,76}/g)?.join('\r\n') || '';
}

function encodeSubject(value: string): string {
  const subject = safeHeaderValue(value || 'fox3 博客系统通知');
  return /^[\x20-\x7E]*$/.test(subject) ? subject : `=?UTF-8?B?${base64Utf8(subject)}?=`;
}

interface SmtpChannel {
  socket: ReturnType<typeof connect>;
  reader: ReadableStreamDefaultReader<Uint8Array>;
  writer: WritableStreamDefaultWriter<Uint8Array>;
  pending: string;
  decoder: TextDecoder;
}

function createChannel(socket: ReturnType<typeof connect>): SmtpChannel {
  return {
    socket,
    reader: socket.readable.getReader(),
    writer: socket.writable.getWriter(),
    pending: '',
    decoder: new TextDecoder(),
  };
}

async function readLine(channel: SmtpChannel): Promise<string> {
  while (true) {
    const newlineIndex = channel.pending.indexOf('\n');
    if (newlineIndex >= 0) {
      const line = channel.pending.slice(0, newlineIndex).replace(/\r$/, '');
      channel.pending = channel.pending.slice(newlineIndex + 1);
      return line;
    }
    const { value, done } = await channel.reader.read();
    if (done) throw new Error('SMTP 连接已关闭');
    channel.pending += channel.decoder.decode(value, { stream: true });
  }
}

async function readResponse(channel: SmtpChannel): Promise<{ code: number; lines: string[] }> {
  const lines: string[] = [];
  let code = 0;
  while (true) {
    const line = await readLine(channel);
    const match = line.match(/^(\d{3})([ -])(.*)$/);
    if (!match) throw new Error(`SMTP 返回了无法识别的响应: ${line.slice(0, 160)}`);
    code = Number(match[1]);
    lines.push(line);
    if (match[2] === ' ') break;
  }
  return { code, lines };
}

async function expectResponse(channel: SmtpChannel, expected: number | number[]): Promise<string[]> {
  const response = await readResponse(channel);
  const codes = Array.isArray(expected) ? expected : [expected];
  if (!codes.includes(response.code)) {
    const detail = response.lines.join(' ').slice(0, 240);
    throw new Error(`SMTP ${response.code}: ${detail}`);
  }
  return response.lines;
}

async function command(channel: SmtpChannel, value: string, expected: number | number[]): Promise<string[]> {
  await channel.writer.write(encoder.encode(`${value}\r\n`));
  return expectResponse(channel, expected);
}

async function smtpSend(settings: OutboundMailSettings, mail: OutboundMail): Promise<void> {
  const host = (settings.smtpHost || '').trim();
  const port = Number(settings.smtpPort || 465);
  const security = settings.smtpSecurity || (port === 465 ? 'ssl' : 'starttls');
  const username = (settings.smtpUser || '').trim();
  const password = settings.smtpPass || '';
  const from = normalizeAddress(settings.senderEmail || username, '发件人');
  const to = normalizeAddress(mail.to, '收件人');

  if (!host || !username || !password || password === '********') {
    throw new Error('SMTP 服务器、用户名和密码/API Key 均为必填项');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP 端口无效');
  }
  if (security !== 'ssl' && security !== 'starttls') {
    throw new Error('SMTP 加密方式必须是 SSL 或 STARTTLS');
  }
  const hostname = host.toLowerCase();
  const isIpv4Literal = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  const isValidHostname = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(hostname);
  if (!isValidHostname || isIpv4Literal || /(^|\.)(localhost|local|internal|test)$/.test(hostname)) {
    throw new Error('SMTP 服务器必须是有效的公网邮件主机名');
  }
  const securePorts = security === 'ssl' ? [465, 2465] : [587, 2587];
  if (!securePorts.includes(port)) {
    throw new Error(security === 'ssl' ? 'SSL 加密请使用端口 465 或 2465' : 'STARTTLS 加密请使用端口 587 或 2587');
  }

  let socket: ReturnType<typeof connect> | null = null;
  let channel: SmtpChannel | null = null;
  try {
    socket = connect(
      { hostname: host, port },
      { secureTransport: security === 'ssl' ? 'on' : 'starttls' },
    );
    await socket.opened;
    channel = createChannel(socket);
    await expectResponse(channel, 220);
    await command(channel, 'EHLO fox3.local', 250);

    if (security === 'starttls') {
      await command(channel, 'STARTTLS', 220);
      channel.reader.releaseLock();
      channel.writer.releaseLock();
      socket = socket.startTls();
      await socket.opened;
      channel = createChannel(socket);
      await command(channel, 'EHLO fox3.local', 250);
    }

    await command(channel, 'AUTH LOGIN', 334);
    await command(channel, base64Utf8(username), 334);
    await command(channel, base64Utf8(password), 235);
    await command(channel, `MAIL FROM:<${from}>`, 250);
    await command(channel, `RCPT TO:<${to}>`, [250, 251]);
    await command(channel, 'DATA', 354);

    const subject = encodeSubject(mail.subject);
    const headers = [
      `From: <${from}>`,
      `To: <${to}>`,
      `Subject: ${subject}`,
      `Date: ${new Date().toUTCString()}`,
      'MIME-Version: 1.0',
    ];
    let body: string;
    if (mail.text && mail.html) {
      const boundary = `fox3-${crypto.randomUUID()}`;
      headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
      body = [
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        base64Lines(mail.text),
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        base64Lines(mail.html),
        `--${boundary}--`,
      ].join('\r\n');
    } else if (mail.html) {
      headers.push('Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64');
      body = base64Lines(mail.html);
    } else {
      headers.push('Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64');
      body = base64Lines(mail.text || '');
    }

    await channel.writer.write(encoder.encode(`${headers.join('\r\n')}\r\n\r\n${body}\r\n.\r\n`));
    await expectResponse(channel, 250);
    await command(channel, 'QUIT', 221);
  } finally {
    if (channel) {
      try { channel.reader.releaseLock(); } catch {}
      try { channel.writer.releaseLock(); } catch {}
    }
    if (socket) {
      try { await socket.close(); } catch {}
    }
  }
}

async function providerApiSend(settings: OutboundMailSettings, mail: OutboundMail): Promise<string> {
  const apiKey = (settings.apiKey || '').trim();
  const from = normalizeAddress(settings.senderEmail || '', '发件人');
  const to = normalizeAddress(mail.to, '收件人');
  if (!apiKey || apiKey === '********' || apiKey.toLowerCase().includes('demo')) {
    throw new Error('邮件服务 API Key 尚未配置');
  }

  let endpoint: string;
  let headers: Record<string, string>;
  let payload: unknown;
  if (settings.provider === 'brevo') {
    endpoint = 'https://api.brevo.com/v3/smtp/email';
    headers = { 'api-key': apiKey, 'Content-Type': 'application/json' };
    payload = {
      sender: { email: from },
      to: [{ email: to }],
      subject: safeHeaderValue(mail.subject),
      ...(mail.html ? { htmlContent: mail.html } : { textContent: mail.text || '' }),
    };
  } else if (settings.provider === 'sendgrid') {
    endpoint = 'https://api.sendgrid.com/v3/mail/send';
    headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    payload = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject: safeHeaderValue(mail.subject),
      content: [
        ...(mail.text ? [{ type: 'text/plain', value: mail.text }] : []),
        ...(mail.html ? [{ type: 'text/html', value: mail.html }] : []),
      ],
    };
  } else {
    endpoint = 'https://api.resend.com/emails';
    headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    payload = {
      from,
      to: [to],
      subject: safeHeaderValue(mail.subject),
      ...(mail.html ? { html: mail.html } : { text: mail.text || '' }),
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    console.warn(`[Mail Backend] ${settings.provider} rejected message with HTTP ${response.status}`);
    throw new Error(`${settings.provider} 拒绝发送邮件（HTTP ${response.status}），请检查 API Key、发件域名和收件地址`);
  }
  return settings.provider;
}

export async function dispatchEmail(settings: OutboundMailSettings, mail: OutboundMail): Promise<MailDispatchResult> {
  try {
    if (settings.provider === 'smtp') {
      await smtpSend(settings, mail);
      return { success: true, provider: 'smtp' };
    }
    const provider = await providerApiSend(settings, mail);
    return { success: true, provider };
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : '邮件服务发送失败';
    console.warn(`[Mail Backend] ${settings.provider} dispatch failed: ${message.slice(0, 240)}`);
    return { success: false, provider: settings.provider || 'none', error: message.slice(0, 240) };
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function createVerificationCode(length: number): string {
  const safeLength = Math.min(8, Math.max(4, Math.floor(length) || 6));
  const bytes = new Uint8Array(safeLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => String(byte % 10)).join('');
}
