export type SmtpSecurity = 'ssl' | 'starttls';
export type MailProvider = 'smtp' | 'resend' | 'brevo' | 'sendgrid' | 'sendcloud' | 'mailgun' | 'ses' | 'postmark' | 'custom';

export interface OutboundMailSettings {
  provider: MailProvider;
  apiKey?: string;
  apiUser?: string;
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

export interface NodeMailRuntime {
  net: any;
  tls: any;
  dns: any;
}

export function getNodeMailRuntime(): NodeMailRuntime | null {
  const bridge = (globalThis as any).__FOX3_NODE_MAIL__;
  if (bridge && bridge.net && bridge.tls) {
    return bridge as NodeMailRuntime;
  }
  return null;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: false });

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

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
  return bytesToBase64(encoder.encode(value));
}

function base64Lines(value: string): string {
  const encoded = base64Utf8(value);
  return encoded.match(/.{1,76}/g)?.join('\r\n') || '';
}

function encodeSubject(value: string): string {
  const subject = safeHeaderValue(value || 'fox3 博客系统通知');
  return /^[\x20-\x7E]*$/.test(subject) ? subject : `=?UTF-8?B?${base64Utf8(subject)}?=`;
}

function isIPv4Literal(value: string): boolean {
  const parts = value.split('.');
  if (parts.length !== 4) return false;
  return parts.every(part => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

function isIPv6Literal(value: string): boolean {
  if (!value.includes(':')) return false;
  return /^[0-9a-f:.]+$/i.test(value);
}

function isPrivateOrDisallowedIp(address: string): boolean {
  const clean = address.trim().toLowerCase();
  if (!clean) return true;
  if (clean.startsWith('::ffff:')) {
    return isPrivateOrDisallowedIp(clean.slice(7));
  }
  if (isIPv4Literal(clean)) {
    const [a, b] = clean.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a >= 224) return true;
    return false;
  }
  if (isIPv6Literal(clean)) {
    if (clean === '::' || clean === '::1') return true;
    if (clean.startsWith('fe80:') || clean.startsWith('fec0:')) return true;
    if (clean.startsWith('fc') || clean.startsWith('fd')) return true;
    if (clean.startsWith('ff')) return true;
    return false;
  }
  return true;
}

export async function assertPublicMailHost(host: string, serviceLabel = '邮件'): Promise<string> {
  const hostname = host.trim().toLowerCase();
  const isIpLiteral = isIPv4Literal(hostname) || isIPv6Literal(hostname);
  const isValidHostname = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(hostname);
  if (!isValidHostname || isIpLiteral || /(^|\.)(localhost|local|internal|test|invalid|home\.arpa)$/.test(hostname)) {
    throw new Error(`${serviceLabel}服务器必须是有效的公网邮件域名（例如 smtp.qiye.aliyun.com / smtp.exmail.qq.com）`);
  }
  const nodeMail = getNodeMailRuntime();
  if (nodeMail?.dns?.lookup) {
    const records = await nodeMail.dns.lookup(hostname, { all: true }).catch(() => null);
    if (!records || records.length === 0) {
      throw new Error(`无法解析${serviceLabel}服务器域名：${hostname}`);
    }
    if (records.some((record: any) => isPrivateOrDisallowedIp(String(record?.address || '')))) {
      throw new Error(`${serviceLabel}服务器域名解析到了受限或内网 IP 地址，已拒绝连接`);
    }
  }
  return hostname;
}

interface SmtpChannel {
  readLine(): Promise<string>;
  write(data: Uint8Array | string): Promise<void>;
  upgradeStartTls(host: string): Promise<void>;
  close(): void;
}

class NodeSmtpChannel implements SmtpChannel {
  private socket: any;
  private tlsMod: any;
  private buffer = '';
  private waiters: Array<{ resolve: (line: string) => void; reject: (err: Error) => void }> = [];
  private closedError: Error | null = null;

  constructor(socket: any, tlsMod: any) {
    this.socket = socket;
    this.tlsMod = tlsMod;
    this.attachListeners(socket);
  }

  private onData = (chunk: Uint8Array) => {
    this.buffer += decoder.decode(chunk, { stream: true });
    this.drainLines();
  };

  private onError = (err: Error) => {
    this.failAll(err instanceof Error ? err : new Error(String(err || 'SMTP 连接错误')));
  };

  private onClose = () => {
    this.failAll(new Error('SMTP 连接已关闭'));
  };

  private onTimeout = () => {
    this.failAll(new Error('SMTP 通信超时（15 秒无响应）'));
  };

  private attachListeners(socket: any) {
    socket.setTimeout(15000);
    socket.on('data', this.onData);
    socket.on('error', this.onError);
    socket.on('close', this.onClose);
    socket.on('timeout', this.onTimeout);
  }

  private detachListeners(socket: any) {
    socket.off('data', this.onData);
    socket.off('error', this.onError);
    socket.off('close', this.onClose);
    socket.off('timeout', this.onTimeout);
  }

  upgradeStartTls(host: string): Promise<void> {
    const plainSocket = this.socket;
    this.detachListeners(plainSocket);
    this.buffer = '';
    return new Promise((resolve, reject) => {
      const tlsSocket = this.tlsMod.connect({
        socket: plainSocket,
        servername: host,
        rejectUnauthorized: true,
      });
      const onError = (err: Error) => {
        tlsSocket.destroy();
        reject(new Error(`SMTP STARTTLS 握手失败: ${err.message}`));
      };
      tlsSocket.setTimeout(15000);
      tlsSocket.once('error', onError);
      tlsSocket.once('secureConnect', () => {
        tlsSocket.off('error', onError);
        this.socket = tlsSocket;
        this.attachListeners(tlsSocket);
        resolve();
      });
    });
  }

  private failAll(err: Error) {
    if (!this.closedError) this.closedError = err;
    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift();
      waiter?.reject(err);
    }
  }

  private drainLines() {
    while (this.waiters.length > 0) {
      const newlineIndex = this.buffer.indexOf('\n');
      if (newlineIndex < 0) break;
      const line = this.buffer.slice(0, newlineIndex).replace(/\r$/, '');
      this.buffer = this.buffer.slice(newlineIndex + 1);
      const waiter = this.waiters.shift();
      waiter?.resolve(line);
    }
  }

  readLine(): Promise<string> {
    const newlineIndex = this.buffer.indexOf('\n');
    if (newlineIndex >= 0) {
      const line = this.buffer.slice(0, newlineIndex).replace(/\r$/, '');
      this.buffer = this.buffer.slice(newlineIndex + 1);
      return Promise.resolve(line);
    }
    if (this.closedError) return Promise.reject(this.closedError);
    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  }

  write(data: string | Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.write(data, (err?: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  close() {
    this.detachListeners(this.socket);
    try { this.socket.end(); } catch {}
    try { this.socket.destroy(); } catch {}
  }
}

class CloudflareSmtpChannel implements SmtpChannel {
  private socket: any;
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private writer: WritableStreamDefaultWriter<Uint8Array>;
  private buffer = '';

  constructor(socket: any) {
    this.socket = socket;
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
  }

  async readLine(): Promise<string> {
    while (true) {
      const newlineIndex = this.buffer.indexOf('\n');
      if (newlineIndex >= 0) {
        const line = this.buffer.slice(0, newlineIndex).replace(/\r$/, '');
        this.buffer = this.buffer.slice(newlineIndex + 1);
        return line;
      }
      const result = await withTimeout(this.reader.read(), 15000, 'SMTP 通信超时（15 秒无响应）');
      if (result.done) {
        if (this.buffer.length > 0) {
          const tail = this.buffer.replace(/\r$/, '');
          this.buffer = '';
          return tail;
        }
        throw new Error('SMTP 连接已关闭');
      }
      this.buffer += decoder.decode(result.value, { stream: true });
    }
  }

  async write(data: string | Uint8Array): Promise<void> {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    await withTimeout(this.writer.write(bytes), 15000, 'SMTP 发送数据超时');
  }

  async upgradeStartTls(_host: string): Promise<void> {
    this.buffer = '';
    try { this.reader.releaseLock(); } catch {}
    try { this.writer.releaseLock(); } catch {}
    this.socket = this.socket.startTls();
    await withTimeout(this.socket.opened, 15000, 'SMTP STARTTLS 握手超时');
    this.reader = this.socket.readable.getReader();
    this.writer = this.socket.writable.getWriter();
  }

  close() {
    try { this.reader.releaseLock(); } catch {}
    try { this.writer.releaseLock(); } catch {}
    try { void this.socket.close(); } catch {}
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

async function openSmtpChannel(host: string, port: number, security: SmtpSecurity): Promise<SmtpChannel> {
  const nodeMail = getNodeMailRuntime();
  if (nodeMail) {
    if (security === 'ssl') {
      const tlsSocket = await new Promise<any>((resolve, reject) => {
        const socket = nodeMail.tls.connect({ host, port, servername: host, rejectUnauthorized: true });
        const onError = (err: Error) => {
          socket.destroy();
          reject(new Error(`SMTP TLS 连接失败 (${host}:${port}): ${err.message}`));
        };
        socket.setTimeout(15000);
        socket.once('error', onError);
        socket.once('secureConnect', () => {
          socket.off('error', onError);
          resolve(socket);
        });
      });
      return new NodeSmtpChannel(tlsSocket, nodeMail.tls);
    }
    const plainSocket = await new Promise<any>((resolve, reject) => {
      const socket = nodeMail.net.connect({ host, port });
      const onError = (err: Error) => {
        socket.destroy();
        reject(new Error(`SMTP TCP 连接失败 (${host}:${port}): ${err.message}`));
      };
      socket.setTimeout(15000);
      socket.once('error', onError);
      socket.once('connect', () => {
        socket.off('error', onError);
        resolve(socket);
      });
    });
    return new NodeSmtpChannel(plainSocket, nodeMail.tls);
  }

  const socketsMod = await import('cloudflare:sockets');
  const socket = socketsMod.connect(
    { hostname: host, port },
    { secureTransport: security === 'ssl' ? 'on' : 'starttls' },
  );
  await withTimeout(socket.opened, 15000, `SMTP 连接超时 (${host}:${port})`);
  return new CloudflareSmtpChannel(socket);
}

async function readResponse(channel: SmtpChannel): Promise<{ code: number; lines: string[] }> {
  const lines: string[] = [];
  let code = 0;
  while (true) {
    const line = await channel.readLine();
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
  await channel.write(encoder.encode(`${value}\r\n`));
  return expectResponse(channel, expected);
}

async function authenticateSmtp(channel: SmtpChannel, ehloLines: string[], username: string, password: string): Promise<void> {
  const ehloText = ehloLines.join(' ').toUpperCase();
  const supportsPlain = ehloText.includes('PLAIN') && !ehloText.includes('LOGIN');
  if (supportsPlain) {
    const token = bytesToBase64(encoder.encode(`\u0000${username}\u0000${password}`));
    await command(channel, `AUTH PLAIN ${token}`, 235);
    return;
  }
  await command(channel, 'AUTH LOGIN', 334);
  await command(channel, base64Utf8(username), 334);
  await command(channel, base64Utf8(password), 235);
}

async function smtpSend(settings: OutboundMailSettings, mail: OutboundMail): Promise<void> {
  const host = (settings.smtpHost || '').trim();
  const port = Number(settings.smtpPort || 465);
  const security = settings.smtpSecurity || (port === 465 || port === 2465 ? 'ssl' : 'starttls');
  const username = (settings.smtpUser || '').trim();
  const password = settings.smtpPass || '';
  const from = normalizeAddress(settings.senderEmail || username, '发件人');
  const to = normalizeAddress(mail.to, '收件人');

  if (!host || !username || !password || password === '********') {
    throw new Error('SMTP 服务器、用户名和密码/授权码均为必填项');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP 端口无效');
  }
  if (security !== 'ssl' && security !== 'starttls') {
    throw new Error('SMTP 加密方式必须是 SSL 或 STARTTLS');
  }
  const validatedHost = await assertPublicMailHost(host, 'SMTP');
  const securePorts = security === 'ssl' ? [465, 2465] : [587, 2587];
  if (!securePorts.includes(port)) {
    throw new Error(security === 'ssl' ? 'SSL 加密请使用端口 465 或 2465' : 'STARTTLS 加密请使用端口 587 或 2587');
  }

  let channel: SmtpChannel | null = null;
  try {
    channel = await openSmtpChannel(validatedHost, port, security);

    await expectResponse(channel, 220);
    let ehloLines = await command(channel, 'EHLO fox3.blog', 250);

    if (security === 'starttls') {
      await command(channel, 'STARTTLS', 220);
      await channel.upgradeStartTls(validatedHost);
      ehloLines = await command(channel, 'EHLO fox3.blog', 250);
    }

    await authenticateSmtp(channel, ehloLines, username, password);
    await command(channel, `MAIL FROM:<${from}>`, 250);
    await command(channel, `RCPT TO:<${to}>`, [250, 251]);
    await command(channel, 'DATA', 354);

    const subject = encodeSubject(mail.subject);
    const headers = [
      `From: <${from}>`,
      `To: <${to}>`,
      `Subject: ${subject}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@${from.split('@')[1] || 'fox3.blog'}>`,
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

    await channel.write(encoder.encode(`${headers.join('\r\n')}\r\n\r\n${body}\r\n.\r\n`));
    await expectResponse(channel, 250);
    try {
      await command(channel, 'QUIT', [221, 250]);
    } catch {
      // Some providers (including enterprise mail gateways) close connection immediately after accepting DATA.
    }
  } finally {
    channel?.close();
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
  if (settings.provider === 'sendcloud') {
    const apiUser = (settings.apiUser || '').trim();
    if (!apiUser) throw new Error('SendCloud API_USER 尚未配置');
    endpoint = 'https://api.sendcloud.net/apiv2/mail/send';
    headers = { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' };
    const sender = settings.senderEmail || '';
    const fromAddress = normalizeAddress(sender, '发件人');
    const senderName = sender.match(/^\s*(.*?)\s*<[^<>]+>\s*$/)?.[1]?.trim();
    const form = new URLSearchParams({ apiUser, apiKey, from: fromAddress, to, subject: safeHeaderValue(mail.subject) });
    if (senderName) form.set('fromName', senderName);
    if (mail.html) form.set('html', mail.html);
    if (mail.text) form.set('plain', mail.text);
    if (!mail.html && !mail.text) form.set('plain', '');
    payload = form;
  } else if (settings.provider === 'brevo') {
    endpoint = 'https://api.brevo.com/v3/smtp/email';
    headers = { 'api-key': apiKey, 'Content-Type': 'application/json' };
    payload = {
      sender: { email: from },
      to: [{ email: to }],
      subject: safeHeaderValue(mail.subject),
      ...(mail.html ? { htmlContent: mail.html } : {}),
      ...(mail.text ? { textContent: mail.text } : {}),
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
      ...(mail.html ? { html: mail.html } : {}),
      ...(mail.text ? { text: mail.text } : {}),
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: payload instanceof URLSearchParams ? payload : JSON.stringify(payload),
  });
  if (settings.provider === 'sendcloud') {
    const responseText = await response.text();
    let responseJson: any = {};
    try { responseJson = JSON.parse(responseText); } catch {}
    if (!response.ok || responseJson?.result !== true) {
      const detail = String(responseJson?.message || '请检查 API_USER、API_KEY、发件域名与账户额度').replace(/[\r\n]+/g, ' ').slice(0, 180);
      throw new Error(`SendCloud 发信失败（HTTP ${response.status}）：${detail}`);
    }
    return 'sendcloud';
  }
  if (!response.ok) {
    const responseText = await response.text();
    let providerMessage = '';
    try {
      const responseJson = JSON.parse(responseText);
      providerMessage = String(responseJson?.message || responseJson?.error?.message || responseJson?.name || '');
    } catch {}
    providerMessage = providerMessage.replace(/[\r\n]+/g, ' ').slice(0, 180);
    console.warn(`[Mail Backend] ${settings.provider} rejected message with HTTP ${response.status}: ${providerMessage || 'no detail'}`);
    throw new Error(`${settings.provider} 拒绝发送（HTTP ${response.status}）${providerMessage ? `：${providerMessage}` : '；请检查 API Key、发件域名和收件地址'}`);
  }
  return settings.provider;
}

export interface ResendConnectionProbe {
  provider: 'resend';
  apiKeyValid: true;
  senderDomain: string;
  senderDomainFound: boolean;
  sendingEnabled: boolean;
  message: string;
}

export async function probeResendConnection(settings: OutboundMailSettings): Promise<ResendConnectionProbe> {
  if (settings.provider !== 'resend') {
    throw new Error('无副作用的 API 连接检查当前仅支持 Resend；其他通道请发送测试邮件验证');
  }
  const apiKey = (settings.apiKey || '').trim();
  if (!apiKey || apiKey === '********') throw new Error('后台 RESEND_API_KEY 尚未配置');

  const response = await fetch('https://api.resend.com/domains?limit=100', {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  const responseText = await response.text();
  let responseJson: any = {};
  try { responseJson = JSON.parse(responseText); } catch {}
  if (!response.ok) {
    const providerMessage = String(responseJson?.message || responseJson?.error?.message || responseJson?.name || '').replace(/[\r\n]+/g, ' ').slice(0, 180);
    throw new Error(`Resend API 连接失败（HTTP ${response.status}）${providerMessage ? `：${providerMessage}` : '；请确认 API Key 有效且具备域名读取权限'}`);
  }

  const senderAddress = (settings.senderEmail || '').match(/<([^<>]+)>/)?.[1] || settings.senderEmail || '';
  const senderDomain = senderAddress.trim().toLowerCase().split('@').pop() || '';
  const domains = Array.isArray(responseJson?.data) ? responseJson.data : [];
  const matchingDomain = domains.find((domain: any) => String(domain?.name || '').toLowerCase() === senderDomain);
  const sendingEnabled = matchingDomain?.capabilities?.sending === 'enabled';
  const message = !senderDomain
    ? 'Resend API Key 有效，但 MAIL_SENDER 不是有效邮箱地址'
    : !matchingDomain
      ? `Resend API Key 有效，但发件域名 ${senderDomain} 不在当前 Resend 账户的域名列表中`
      : !sendingEnabled
        ? `Resend API Key 有效，但域名 ${senderDomain} 的发送能力尚未启用`
        : `Resend API Key 已验证，发件域名 ${senderDomain} 的发送能力已启用`;

  return {
    provider: 'resend',
    apiKeyValid: true,
    senderDomain,
    senderDomainFound: Boolean(matchingDomain),
    sendingEnabled,
    message,
  };
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
