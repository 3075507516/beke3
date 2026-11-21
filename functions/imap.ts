import net from 'node:net';
import tls from 'node:tls';
import { assertPublicMailHost } from './mail';

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
  literals: Buffer[];
}

function escapeImapQuoted(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function decodeCharsetBuffer(buf: Buffer, charsetRaw = 'utf-8'): string {
  const charset = charsetRaw.trim().toLowerCase().replace(/^["']|["']$/g, '') || 'utf-8';
  const normalized = charset === 'gb2312' ? 'gbk' : charset;
  try {
    return new TextDecoder(normalized, { fatal: false }).decode(buf);
  } catch {
    try {
      return new TextDecoder('utf-8', { fatal: false }).decode(buf);
    } catch {
      return buf.toString('utf8');
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
        for (const b of Buffer.from(normalized[i], 'utf8')) bytes.push(b);
      }
    }
  }
  return decodeCharsetBuffer(Buffer.from(bytes), charset);
}

function decodeRfc2047(value: string): string {
  if (!value) return '';
  const collapsed = value.replace(/\?=\s+=\?/g, '?==?');
  return collapsed.replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_full, charset, encoding, text) => {
    try {
      const enc = String(encoding).toUpperCase();
      if (enc === 'B') {
        const buf = Buffer.from(String(text).replace(/\s+/g, ''), 'base64');
        return decodeCharsetBuffer(buf, String(charset));
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
    const clean = rawBody.replace(/[^A-Za-z0-9+/=]/g, '');
    decoded = decodeCharsetBuffer(Buffer.from(clean, 'base64'), charset);
  } else if (transferEncoding === 'quoted-printable') {
    decoded = decodeQuotedPrintable(rawBody, charset);
  } else if (charset.toLowerCase() !== 'utf-8' && charset.toLowerCase() !== 'utf8') {
    decoded = decodeCharsetBuffer(Buffer.from(rawBody, 'latin1'), charset);
  }

  if (/text\/html/i.test(contentType)) {
    return { text: '', html: decoded };
  }
  return { text: decoded.trim(), html: '' };
}

function parseRawRfc822(rawBuffer: Buffer, fallbackUid: string, fallbackInternalDate?: string): ImapMessage {
  const latin1 = rawBuffer.slice(0, 512 * 1024).toString('latin1');
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

class NodeImapClient {
  private socket: net.Socket | tls.TLSSocket;
  private buf = Buffer.alloc(0);
  private tagCounter = 0;
  private closedError: Error | null = null;
  private onProgress: (() => void) | null = null;

  constructor(socket: net.Socket | tls.TLSSocket) {
    this.socket = socket;
    socket.setTimeout(20000);
    socket.on('data', chunk => {
      this.buf = Buffer.concat([this.buf, chunk]);
      this.onProgress?.();
    });
    socket.on('error', err => {
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
      const check = () => {
        this.onProgress = null;
        if (this.closedError) reject(this.closedError);
        else resolve();
      };
      this.onProgress = check;
    });
  }

  private async readLine(): Promise<string> {
    while (true) {
      const idx = this.buf.indexOf(0x0a); // \n
      if (idx >= 0) {
        const lineBuf = this.buf.subarray(0, idx);
        this.buf = this.buf.subarray(idx + 1);
        return lineBuf.toString('utf8').replace(/\r$/, '');
      }
      await this.waitForMore();
    }
  }

  private async readExact(length: number): Promise<Buffer> {
    while (this.buf.length < length) {
      await this.waitForMore();
    }
    const slice = Buffer.from(this.buf.subarray(0, length));
    this.buf = this.buf.subarray(length);
    return slice;
  }

  async readGreeting(): Promise<void> {
    const line = await this.readLine();
    if (!/^\*\s+(OK|PREAUTH)/i.test(line)) {
      throw new Error(`IMAP 服务器未返回就绪响应: ${line.slice(0, 120)}`);
    }
  }

  async command(cmd: string): Promise<ImapCommandResult> {
    const tag = `A${++this.tagCounter}`;
    await new Promise<void>((resolve, reject) => {
      this.socket.write(`${tag} ${cmd}\r\n`, err => (err ? reject(err) : resolve()));
    });

    const lines: string[] = [];
    const literals: Buffer[] = [];
    while (true) {
      let line = await this.readLine();
      while (true) {
        const litMatch = line.match(/\{(\d+)\}$/);
        if (!litMatch) break;
        const size = Number(litMatch[1]);
        if (!Number.isFinite(size) || size < 0 || size > 4 * 1024 * 1024) {
          throw new Error(`IMAP 邮件数据块大小超出安全限制 (${size} bytes)`);
        }
        const literalBuf = await this.readExact(size);
        literals.push(literalBuf);
        const tail = await this.readLine();
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
    try { this.socket.end(); } catch {}
    try { this.socket.destroy(); } catch {}
  }
}

async function openImapClient(settings: ImapSettings): Promise<NodeImapClient> {
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

  const socket: net.Socket | tls.TLSSocket = await new Promise((resolve, reject) => {
    if (useTls) {
      const s = tls.connect({
        host: validatedHost,
        port,
        servername: validatedHost,
        rejectUnauthorized: true,
      });
      s.setTimeout(20000);
      s.once('error', err => {
        s.destroy();
        reject(new Error(`IMAP TLS 连接失败 (${validatedHost}:${port}): ${err.message}`));
      });
      s.once('secureConnect', () => resolve(s));
    } else {
      const s = net.connect({ host: validatedHost, port });
      s.setTimeout(20000);
      s.once('error', err => {
        s.destroy();
        reject(new Error(`IMAP TCP 连接失败 (${validatedHost}:${port}): ${err.message}`));
      });
      s.once('connect', () => resolve(s));
    }
  });

  const client = new NodeImapClient(socket);
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
