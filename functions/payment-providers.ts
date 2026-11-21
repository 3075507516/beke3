/* Payment gateway adapters for Alipay, WeChat Pay v3, Stripe, and PayPal.
 * All credentials remain server-side only; paid transitions require verified
 * provider signatures or verified server-to-server order/trade queries matching
 * persisted order amount and currency.
 */
export type PaymentProvider = 'alipay' | 'wechat' | 'stripe' | 'paypal';
export type PaymentOrder = {
  id: string;
  amountMinor: number;
  currency: string;
  productName: string;
  quantity: number;
  providerOrderId?: string;
  providerPaymentId?: string;
};
export type PaymentEnv = Record<string, string | undefined>;
export type CreatePaymentResult = {
  redirectUrl?: string;
  wapUrl?: string;
  qrEmbedUrl?: string;
  qrCode?: string;
  qrMode?: 'precreate' | 'wap_fallback';
  providerOrderId?: string;
  chargedAmountMinor?: number;
  chargedCurrency?: string;
  warning?: string;
};
export type WebhookResult = {
  eventId: string;
  orderId: string;
  status: 'paid' | 'failed' | 'cancelled' | 'refunded' | 'refund_pending' | 'ignored';
  paymentId?: string;
  amountMinor?: number;
  currency?: string;
  raw?: any;
};
export type PaymentQueryResult = {
  status: 'paid' | 'pending' | 'failed' | 'cancelled';
  paymentId?: string;
  amountMinor?: number;
  currency?: string;
};

const enc = new TextEncoder();
const MAX_BODY = 1024 * 1024;
const timeoutMs = 15000;

function required(env: PaymentEnv, name: string): string {
  const v = env[name]?.trim();
  if (!v) throw new Error(`缺少支付服务端配置变量：${name}`);
  return v;
}

function assertOrder(o: PaymentOrder): void {
  if (
    !o ||
    !o.id ||
    !Number.isSafeInteger(o.amountMinor) ||
    o.amountMinor <= 0 ||
    !o.currency ||
    !o.productName ||
    !Number.isSafeInteger(o.quantity) ||
    o.quantity < 1
  ) {
    throw new Error('订单数据无效：需要正整数金额、数量、币种与商品名称');
  }
}

function asBuffer(a: Uint8Array): ArrayBuffer {
  return a.slice().buffer as ArrayBuffer;
}

function b64bytes(s: string): Uint8Array {
  const clean = s.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
  const padded = clean + '='.repeat((4 - (clean.length % 4)) % 4);
  const b = atob(padded);
  return Uint8Array.from(b, c => c.charCodeAt(0));
}

function b64(a: ArrayBuffer | Uint8Array): string {
  const u = a instanceof Uint8Array ? a : new Uint8Array(a);
  let s = '';
  for (const x of u) s += String.fromCharCode(x);
  return btoa(s);
}

function normalizePem(pem: string): string {
  return pem
    .replace(/[\u200B-\u200D\uFEFF\r]/g, '')
    .replace(/\\n/g, '\n')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim();
}

function pemBytes(pem: string): Uint8Array {
  const clean = normalizePem(pem).replace(/-----BEGIN [^-]+-----|-----END [^-]+-----|\s/g, '');
  return b64bytes(clean);
}

function pkcs1ToPkcs8(pkcs1: Uint8Array): Uint8Array {
  const prefix = Uint8Array.from([0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]);
  const len = (n: number): number[] => (n < 128 ? [n] : n < 256 ? [0x81, n] : [0x82, (n >>> 8) & 255, n & 255]);
  const octet = [0x04, ...len(pkcs1.length), ...pkcs1];
  const body = [0x02, 0x01, 0x00, ...prefix, ...octet];
  return Uint8Array.from([0x30, ...len(body.length), ...body]);
}

async function importPrivate(pem: string, alg: 'RSASSA-PKCS1-v1_5' | 'RSA-PSS' = 'RSASSA-PKCS1-v1_5'): Promise<CryptoKey> {
  const normalized = normalizePem(pem);
  const isPkcs1 = /-----BEGIN RSA PRIVATE KEY-----/.test(normalized);
  const isPkcs8 = /-----BEGIN PRIVATE KEY-----/.test(normalized);
  try {
    const der = pemBytes(normalized);
    if (isPkcs1) {
      return await crypto.subtle.importKey('pkcs8', asBuffer(pkcs1ToPkcs8(der)), { name: alg, hash: 'SHA-256' }, false, ['sign']);
    }
    if (isPkcs8) {
      return await crypto.subtle.importKey('pkcs8', asBuffer(der), { name: alg, hash: 'SHA-256' }, false, ['sign']);
    }
    // Alipay RSA2 key generator outputs raw Base64 PKCS#8 or PKCS#1 without PEM headers
    try {
      return await crypto.subtle.importKey('pkcs8', asBuffer(der), { name: alg, hash: 'SHA-256' }, false, ['sign']);
    } catch {
      return await crypto.subtle.importKey('pkcs8', asBuffer(pkcs1ToPkcs8(der)), { name: alg, hash: 'SHA-256' }, false, ['sign']);
    }
  } catch {
    throw new Error('应用私钥导入失败：请核对 PKCS#8 / PKCS#1 RSA2 私钥格式及换行符设置');
  }
}

function readDerLen(a: Uint8Array, p: number): { value: number; bytes: number } {
  const n = a[p];
  if (n < 128) return { value: n, bytes: 1 };
  const k = n & 127;
  if (k < 1 || k > 4) throw new Error('Unsupported DER length');
  let v = 0;
  for (let j = 0; j < k; j++) v = v * 256 + a[p + 1 + j];
  return { value: v, bytes: k + 1 };
}

async function importPublic(pem: string): Promise<CryptoKey> {
  const der = pemBytes(pem);
  try {
    return await crypto.subtle.importKey('spki', asBuffer(der), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  } catch {
    // Extract SubjectPublicKeyInfo DER from an X.509 certificate
    const cert = der;
    let i = 0;
    if (cert[i++] !== 0x30) throw new Error('不支持的公钥/证书格式');
    const certLen = readDerLen(cert, i);
    i += certLen.bytes;
    if (cert[i++] !== 0x30) throw new Error('不支持的公钥/证书格式');
    const tbsLen = readDerLen(cert, i);
    i += tbsLen.bytes;
    const end = i + tbsLen.value;
    // Skip optional version [0] EXPLICIT
    if (cert[i] === 0xa0) {
      const verLen = readDerLen(cert, i + 1);
      i += 1 + verLen.bytes + verLen.value;
    }
    // Traverse serialNumber, signature, issuer, validity, subject (5 ASN.1 TLVs)
    let pos = i;
    for (let n = 0; n < 5; n++) {
      if (pos >= end) throw new Error('无效的 X.509 证书结构');
      const itemLen = readDerLen(cert, pos + 1);
      pos += 1 + itemLen.bytes + itemLen.value;
    }
    if (cert[pos] !== 0x30 || pos >= end) throw new Error('无效的 X.509 公钥字段');
    const spkiLen = readDerLen(cert, pos + 1);
    const spkiEnd = pos + 1 + spkiLen.bytes + spkiLen.value;
    return crypto.subtle.importKey('spki', asBuffer(cert.slice(pos, spkiEnd)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  }
}

async function rsaSign(message: string, key: CryptoKey): Promise<string> {
  return b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(message)));
}

async function rsaVerify(message: string, signature: string, key: CryptoKey): Promise<boolean> {
  try {
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, asBuffer(b64bytes(signature)), enc.encode(message));
  } catch {
    return false;
  }
}

async function hmacHex(keyBytes: Uint8Array, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', asBuffer(keyBytes), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data))), b => b.toString(16).padStart(2, '0')).join('');
}

function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

async function request(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if ((e as any)?.name === 'AbortError') throw new Error('支付网关请求超时');
    throw new Error('无法连接支付网关，请检查网络或配置');
  } finally {
    clearTimeout(timer);
  }
}

async function responseJson(r: Response, provider: string): Promise<any> {
  const text = await r.text();
  if (text.length > MAX_BODY) throw new Error(`${provider} 响应体积过大`);
  let obj: any;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error(`${provider} 返回了无效的 JSON 响应`);
  }
  if (!r.ok) throw new Error(`${provider} 请求失败 (${r.status}): ${safeMessage(obj)}`);
  return obj;
}

function safeMessage(o: any): string {
  return String(
    o?.error?.message || o?.message || o?.details?.[0]?.description || o?.sub_msg || o?.sub_code || o?.msg || 'provider error',
  )
    .replace(/[\r\n]/g, ' ')
    .slice(0, 180);
}

async function readBody(req: Request, rawBody?: string): Promise<string> {
  if (rawBody !== undefined) {
    if (rawBody.length > MAX_BODY) throw new Error('Webhook body exceeds size limit');
    return rawBody;
  }
  const n = Number(req.headers.get('content-length') || 0);
  if (n > MAX_BODY) throw new Error('Webhook body exceeds size limit');
  const t = await req.text();
  if (t.length > MAX_BODY) throw new Error('Webhook body exceeds size limit');
  return t;
}

function currencyExponent(c: string): number {
  const upper = c.toUpperCase();
  if (['JPY', 'KRW', 'VND'].includes(upper)) return 0;
  if (['BHD', 'KWD', 'OMR', 'JOD', 'TND'].includes(upper)) return 3;
  return 2;
}

function minorToDecimal(minor: number, currency: string): string {
  const exp = currencyExponent(currency);
  return (minor / 10 ** exp).toFixed(exp);
}

function decimalToMinor(s: string, currency: string): number {
  if (!/^\d+(?:\.\d+)?$/.test(s)) throw new Error('Invalid provider amount');
  const exp = currencyExponent(currency);
  const parts = s.split('.');
  if ((parts[1]?.length || 0) > exp) throw new Error('Provider amount has excess precision');
  const n = Number(s) * 10 ** exp;
  if (!Number.isSafeInteger(Math.round(n)) || Math.abs(n - Math.round(n)) > 1e-7) throw new Error('Invalid provider amount');
  return Math.round(n);
}

function safeOrigin(origin: string): URL {
  try {
    const u = new URL(origin);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error();
    return u;
  } catch {
    throw new Error('无效的请求 Origin 地址');
  }
}

// Alipay strictly expects Asia/Shanghai (GMT+8) timestamps
function alipayTimestamp(date = new Date()): string {
  const utc8 = new Date(date.getTime() + 8 * 3600_000);
  return utc8.toISOString().replace('T', ' ').slice(0, 19);
}

function buildAlipaySignedString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .filter(k => params[k] !== '' && params[k] != null)
    .map(k => `${k}=${params[k]}`)
    .join('&');
}

function resolveCurrencyConversion(order: PaymentOrder, targetCurrency: string, rateRaw: string | undefined, minMinor = 1): { amountMinor: number; currency: string } {
  const source = order.currency.toUpperCase();
  const target = targetCurrency.toUpperCase();
  if (source === target) return { amountMinor: order.amountMinor, currency: target };
  const rate = Number(rateRaw || '0.14');
  if (!Number.isFinite(rate) || rate <= 0) throw new Error(`无效的汇率配置 (${source} -> ${target})`);
  const sourceFactor = 10 ** currencyExponent(source);
  const targetFactor = 10 ** currencyExponent(target);
  const converted = Math.round((order.amountMinor / sourceFactor) * rate * targetFactor);
  return { amountMinor: Math.max(minMinor, converted), currency: target };
}

export async function createPayment(
  provider: PaymentProvider,
  order: PaymentOrder,
  env: PaymentEnv,
  origin: string,
): Promise<CreatePaymentResult> {
  assertOrder(order);
  const base = safeOrigin(origin);

  if (provider === 'stripe') {
    const secret = required(env, 'STRIPE_SECRET_KEY');
    const targetCurrency = (env.STRIPE_CURRENCY?.trim() || order.currency).toLowerCase();
    const converted =
      targetCurrency.toUpperCase() !== order.currency.toUpperCase()
        ? resolveCurrencyConversion(order, targetCurrency, env.STRIPE_CNY_RATE, 50)
        : { amountMinor: order.amountMinor, currency: targetCurrency.toUpperCase() };

    const itemName = order.quantity > 1 ? `${order.productName} × ${order.quantity}` : order.productName;
    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set('success_url', new URL(`/?paymentOrder=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`, base).toString());
    form.set('cancel_url', new URL(`/?paymentCancel=${encodeURIComponent(order.id)}`, base).toString());
    form.set('metadata[order_id]', order.id);
    form.set('client_reference_id', order.id);
    // amountMinor is already total discounted order amount; pass quantity=1 so Stripe does not multiply again
    form.set('line_items[0][quantity]', '1');
    form.set('line_items[0][price_data][currency]', converted.currency.toLowerCase());
    form.set('line_items[0][price_data][unit_amount]', String(converted.amountMinor));
    form.set('line_items[0][price_data][product_data][name]', itemName.slice(0, 200));

    const r = await request('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    const j = await responseJson(r, 'Stripe');
    if (!j.url || !j.id) throw new Error('Stripe 未返回结账跳转链接');
    return {
      redirectUrl: j.url,
      providerOrderId: j.id,
      chargedAmountMinor: converted.amountMinor,
      chargedCurrency: converted.currency,
    };
  }

  if (provider === 'paypal') {
    const token = await paypalToken(env);
    const api = paypalBase(env);
    const targetCurrency = (env.PAYPAL_CURRENCY?.trim() || (order.currency.toUpperCase() === 'CNY' ? 'USD' : order.currency)).toUpperCase();
    const converted =
      targetCurrency !== order.currency.toUpperCase()
        ? resolveCurrencyConversion(order, targetCurrency, env.PAYPAL_CNY_RATE, 1)
        : { amountMinor: order.amountMinor, currency: targetCurrency };

    const j = await responseJson(
      await request(`${api}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': order.id,
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: order.id,
              invoice_id: order.id,
              custom_id: order.id,
              description: `${order.productName} × ${order.quantity}`.slice(0, 127),
              amount: {
                currency_code: converted.currency,
                value: minorToDecimal(converted.amountMinor, converted.currency),
              },
            },
          ],
          application_context: {
            return_url: new URL(`/?paymentOrder=${encodeURIComponent(order.id)}`, base).toString(),
            cancel_url: new URL(`/?paymentCancel=${encodeURIComponent(order.id)}`, base).toString(),
          },
        }),
      }),
      'PayPal',
    );
    const approve = j.links?.find((x: any) => x.rel === 'approve' || x.rel === 'payer-action')?.href;
    if (!j.id || !approve) throw new Error('PayPal 未返回支付授权链接');
    return {
      redirectUrl: approve,
      providerOrderId: j.id,
      chargedAmountMinor: converted.amountMinor,
      chargedCurrency: converted.currency,
    };
  }

  if (provider === 'alipay') {
    const appId = required(env, 'ALIPAY_APP_ID').replace(/^["']+|["']+$/g, '').trim();
    const privateKey = await importPrivate(required(env, 'ALIPAY_PRIVATE_KEY'));
    const gateway = (env.ALIPAY_GATEWAY?.trim() || 'https://openapi.alipay.com/gateway.do').replace(/^["']+|["']+$/g, '').trim();
    if (!gateway.startsWith('https://')) throw new Error('ALIPAY_GATEWAY 必须使用 HTTPS');
    const notifyUrl = env.ALIPAY_NOTIFY_URL?.trim() || (base.protocol === 'https:' ? `${base.origin}/api/payments/webhook/alipay` : '');
    const returnUrl = `${base.origin}/?paymentOrder=${encodeURIComponent(order.id)}`;
    const totalAmount = minorToDecimal(order.amountMinor, order.currency);
    const ts = alipayTimestamp();
    const subject = `${order.productName}${order.quantity > 1 ? ` × ${order.quantity}` : ''}`.slice(0, 128);
    const sellerPart = env.ALIPAY_PID?.trim() ? { seller_id: env.ALIPAY_PID.trim() } : {};

    // 1. Signed Alipay PC Web Cashier URL (alipay.trade.page.pay) for browser redirect checkout
    const pageParams: Record<string, string> = {
      app_id: appId,
      method: 'alipay.trade.page.pay',
      format: 'JSON',
      return_url: returnUrl,
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: ts,
      version: '1.0',
      biz_content: JSON.stringify({
        out_trade_no: order.id,
        total_amount: totalAmount,
        subject,
        product_code: 'FAST_INSTANT_TRADE_PAY',
        ...sellerPart,
      }),
    };
    if (notifyUrl) pageParams.notify_url = notifyUrl;
    pageParams.sign = await rsaSign(buildAlipaySignedString(pageParams), privateKey);
    const redirectUrl = `${gateway}?${new URLSearchParams(pageParams).toString()}`;

    // 2. Signed Alipay Mini-QR Embed URL (qr_pay_mode=4) for official iframe/popup QR rendering
    const embedParams: Record<string, string> = {
      app_id: appId,
      method: 'alipay.trade.page.pay',
      format: 'JSON',
      return_url: returnUrl,
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: ts,
      version: '1.0',
      biz_content: JSON.stringify({
        out_trade_no: order.id,
        total_amount: totalAmount,
        subject,
        product_code: 'FAST_INSTANT_TRADE_PAY',
        qr_pay_mode: '4',
        qrcode_width: '220',
        ...sellerPart,
      }),
    };
    if (notifyUrl) embedParams.notify_url = notifyUrl;
    embedParams.sign = await rsaSign(buildAlipaySignedString(embedParams), privateKey);
    const qrEmbedUrl = `${gateway}?${new URLSearchParams(embedParams).toString()}`;

    // 3. Signed Mobile Web Cashier URL (alipay.trade.wap.pay) as guaranteed scannable QR fallback
    const wapParams: Record<string, string> = {
      app_id: appId,
      method: 'alipay.trade.wap.pay',
      format: 'JSON',
      return_url: returnUrl,
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: ts,
      version: '1.0',
      biz_content: JSON.stringify({
        out_trade_no: order.id,
        total_amount: totalAmount,
        subject,
        product_code: 'QUICK_WAP_WAY',
        quit_url: returnUrl,
        ...sellerPart,
      }),
    };
    if (notifyUrl) wapParams.notify_url = notifyUrl;
    wapParams.sign = await rsaSign(buildAlipaySignedString(wapParams), privateKey);
    const wapUrl = `${gateway}?${new URLSearchParams(wapParams).toString()}`;

    // 4. Request native Face-to-Face Pay QR code (alipay.trade.precreate)
    const qrParams: Record<string, string> = {
      app_id: appId,
      method: 'alipay.trade.precreate',
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: ts,
      version: '1.0',
      biz_content: JSON.stringify({
        out_trade_no: order.id,
        total_amount: totalAmount,
        subject,
        product_code: 'FACE_TO_FACE_PAYMENT',
        timeout_express: '30m',
        ...sellerPart,
      }),
    };
    if (notifyUrl) qrParams.notify_url = notifyUrl;
    qrParams.sign = await rsaSign(buildAlipaySignedString(qrParams), privateKey);

    try {
      const j = await responseJson(
        await request(gateway, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
          body: new URLSearchParams(qrParams),
        }),
        'Alipay',
      );
      const data = j.alipay_trade_precreate_response || j.error_response;
      if (data?.code === '10000' && data.qr_code) {
        return {
          qrCode: data.qr_code,
          qrMode: 'precreate',
          redirectUrl,
          wapUrl,
          qrEmbedUrl,
          providerOrderId: order.id,
        };
      }
      const detail = data ? `${data.code || ''}${data.sub_code ? ` / ${data.sub_code}` : ''}: ${safeMessage(data)}` : '未返回当面付二维码';
      return {
        qrCode: wapUrl,
        qrMode: 'wap_fallback',
        redirectUrl,
        wapUrl,
        qrEmbedUrl,
        providerOrderId: order.id,
        warning: `支付宝当面付未返回原生码（${detail}），已自动生成手机收银台扫码二维码与网页收银台链接（需在支付宝商家中心签约「手机网站支付」或「电脑网站支付」）。`,
      };
    } catch (qrErr: any) {
      return {
        qrCode: wapUrl,
        qrMode: 'wap_fallback',
        redirectUrl,
        wapUrl,
        qrEmbedUrl,
        providerOrderId: order.id,
        warning: `当面付接口调用异常（${String(qrErr?.message || qrErr).slice(0, 120)}），已自动切换为手机/网页收银台二维码与直达跳转。`,
      };
    }
  }

  if (provider === 'wechat') {
    const notify = env.WECHAT_NOTIFY_URL?.trim() || (base.protocol === 'https:' ? `${base.origin}/api/payments/webhook/wechat` : '');
    if (!notify || !notify.startsWith('https://')) {
      throw new Error('微信支付必须配置公网 HTTPS 回调地址 WECHAT_NOTIFY_URL');
    }
    const mch = required(env, 'WECHAT_MCHID');
    const appid = required(env, 'WECHAT_APPID');
    const serial = required(env, 'WECHAT_SERIAL_NO');
    const key = await importPrivate(required(env, 'WECHAT_PRIVATE_KEY'));
    const body = JSON.stringify({
      appid,
      mchid: mch,
      description: `${order.productName} × ${order.quantity}`.slice(0, 127),
      out_trade_no: order.id,
      notify_url: notify,
      amount: { total: order.amountMinor, currency: order.currency.toUpperCase() },
    });
    const path = '/v3/pay/transactions/native';
    const ts = String(Math.floor(Date.now() / 1000));
    const nonce = crypto.randomUUID().replace(/-/g, '');
    const signature = await rsaSign(`POST\n${path}\n${ts}\n${nonce}\n${body}\n`, key);
    const auth = `WECHATPAY2-SHA256-RSA2048 mchid="${mch}",nonce_str="${nonce}",timestamp="${ts}",serial_no="${serial}",signature="${signature}"`;
    const j = await responseJson(
      await request(`https://api.mch.weixin.qq.com${path}`, {
        method: 'POST',
        headers: {
          Authorization: auth,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'fox3-blog/1.0',
        },
        body,
      }),
      'WeChat Pay',
    );
    if (!j.code_url) throw new Error('微信支付未返回 Native 收款二维码链接');
    return { qrCode: j.code_url, providerOrderId: order.id };
  }

  throw new Error(`不支持的支付方式：${provider}`);
}

export async function queryPaymentStatus(
  provider: PaymentProvider,
  order: PaymentOrder,
  env: PaymentEnv,
): Promise<PaymentQueryResult> {
  if (provider === 'alipay') {
    const appId = required(env, 'ALIPAY_APP_ID');
    const privateKey = await importPrivate(required(env, 'ALIPAY_PRIVATE_KEY'));
    const gateway = (env.ALIPAY_GATEWAY?.trim() || 'https://openapi.alipay.com/gateway.do').trim();
    const params: Record<string, string> = {
      app_id: appId,
      method: 'alipay.trade.query',
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: alipayTimestamp(),
      version: '1.0',
      biz_content: JSON.stringify({ out_trade_no: order.id }),
    };
    params.sign = await rsaSign(buildAlipaySignedString(params), privateKey);
    const j = await responseJson(
      await request(gateway, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: new URLSearchParams(params),
      }),
      'Alipay',
    );
    const data = j.alipay_trade_query_response;
    if (!data || data.code === '40004') return { status: 'pending' };
    if (data.code !== '10000') return { status: 'pending' };
    if (data.trade_status === 'TRADE_SUCCESS' || data.trade_status === 'TRADE_FINISHED') {
      return {
        status: 'paid',
        paymentId: data.trade_no,
        amountMinor: data.total_amount ? decimalToMinor(String(data.total_amount), order.currency) : undefined,
        currency: order.currency.toUpperCase(),
      };
    }
    if (data.trade_status === 'TRADE_CLOSED') return { status: 'cancelled' };
    return { status: 'pending' };
  }

  if (provider === 'stripe') {
    if (!order.providerOrderId) return { status: 'pending' };
    const secret = required(env, 'STRIPE_SECRET_KEY');
    const j = await responseJson(
      await request(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(order.providerOrderId)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${secret}` },
      }),
      'Stripe',
    );
    if (j.payment_status === 'paid') {
      const pi = typeof j.payment_intent === 'string' ? j.payment_intent : j.payment_intent?.id;
      return {
        status: 'paid',
        paymentId: pi || j.id,
        amountMinor: typeof j.amount_total === 'number' ? j.amount_total : undefined,
        currency: j.currency ? String(j.currency).toUpperCase() : undefined,
      };
    }
    if (j.status === 'expired') return { status: 'cancelled' };
    return { status: 'pending' };
  }

  if (provider === 'wechat') {
    const mch = required(env, 'WECHAT_MCHID');
    const serial = required(env, 'WECHAT_SERIAL_NO');
    const key = await importPrivate(required(env, 'WECHAT_PRIVATE_KEY'));
    const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(order.id)}?mchid=${encodeURIComponent(mch)}`;
    const ts = String(Math.floor(Date.now() / 1000));
    const nonce = crypto.randomUUID().replace(/-/g, '');
    const signature = await rsaSign(`GET\n${path}\n${ts}\n${nonce}\n\n`, key);
    const auth = `WECHATPAY2-SHA256-RSA2048 mchid="${mch}",nonce_str="${nonce}",timestamp="${ts}",serial_no="${serial}",signature="${signature}"`;
    const j = await responseJson(
      await request(`https://api.mch.weixin.qq.com${path}`, {
        method: 'GET',
        headers: { Authorization: auth, Accept: 'application/json', 'User-Agent': 'fox3-blog/1.0' },
      }),
      'WeChat Pay',
    );
    if (j.trade_state === 'SUCCESS') {
      return {
        status: 'paid',
        paymentId: j.transaction_id,
        amountMinor: typeof j.amount?.total === 'number' ? j.amount.total : undefined,
        currency: j.amount?.currency ? String(j.amount.currency).toUpperCase() : undefined,
      };
    }
    if (j.trade_state === 'CLOSED' || j.trade_state === 'REVOKED') return { status: 'cancelled' };
    if (j.trade_state === 'PAYERROR') return { status: 'failed' };
    return { status: 'pending' };
  }

  if (provider === 'paypal') {
    if (!order.providerOrderId) return { status: 'pending' };
    const token = await paypalToken(env);
    const api = paypalBase(env);
    const j = await responseJson(
      await request(`${api}/v2/checkout/orders/${encodeURIComponent(order.providerOrderId)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }),
      'PayPal',
    );
    if (j.status === 'COMPLETED') {
      const cap = j.purchase_units?.[0]?.payments?.captures?.[0];
      const amt = cap?.amount;
      return {
        status: 'paid',
        paymentId: cap?.id,
        amountMinor: amt?.value && amt?.currency_code ? decimalToMinor(String(amt.value), String(amt.currency_code)) : undefined,
        currency: amt?.currency_code ? String(amt.currency_code).toUpperCase() : undefined,
      };
    }
    if (j.status === 'VOIDED') return { status: 'cancelled' };
    return { status: 'pending' };
  }

  return { status: 'pending' };
}

function paypalBase(env: PaymentEnv): string {
  const b = env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';
  if (!b.startsWith('https://')) throw new Error('PayPal API base must use HTTPS');
  return b.replace(/\/$/, '');
}

async function paypalToken(env: PaymentEnv): Promise<string> {
  const id = required(env, 'PAYPAL_CLIENT_ID');
  const secret = required(env, 'PAYPAL_CLIENT_SECRET');
  const auth = btoa(`${id}:${secret}`);
  const j = await responseJson(
    await request(`${paypalBase(env)}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    }),
    'PayPal',
  );
  if (!j.access_token) throw new Error('PayPal 鉴权失败');
  return j.access_token;
}

export async function capturePayPalOrder(
  paypalOrderId: string,
  env: PaymentEnv,
): Promise<{ status: 'COMPLETED' | 'PENDING' | 'DECLINED' | string; paymentId?: string; amountMinor?: number; currency?: string }> {
  if (!paypalOrderId) throw new Error('PayPal order ID is required');
  const token = await paypalToken(env);
  const api = paypalBase(env);
  const r = await request(`${api}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `capture-${paypalOrderId}`,
    },
    body: '{}',
  });
  const j = await responseJson(r, 'PayPal');
  const capture = j.purchase_units?.[0]?.payments?.captures?.[0];
  if (!capture || typeof capture.status !== 'string') throw new Error('PayPal 捕获响应不完整');
  const amount = capture.amount;
  return {
    status: capture.status,
    paymentId: typeof capture.id === 'string' ? capture.id : undefined,
    amountMinor: amount?.value != null && amount?.currency_code ? decimalToMinor(String(amount.value), String(amount.currency_code)) : undefined,
    currency: typeof amount?.currency_code === 'string' ? amount.currency_code : undefined,
  };
}

export async function verifyPaymentWebhook(
  provider: PaymentProvider,
  req: Request,
  rawBody: string | undefined,
  env: PaymentEnv,
): Promise<WebhookResult> {
  const body = await readBody(req, rawBody);

  if (provider === 'stripe') {
    const secret = required(env, 'STRIPE_WEBHOOK_SECRET');
    const header = req.headers.get('Stripe-Signature') || '';
    let t = '';
    const sigs: string[] = [];
    for (const part of header.split(',')) {
      const [k, v] = part.split('=', 2);
      if (k === 't') t = v || '';
      if (k === 'v1' && v) sigs.push(v);
    }
    if (!/^\d+$/.test(t) || !sigs.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) {
      throw new Error('Invalid or expired Stripe webhook signature');
    }
    const expected = await hmacHex(enc.encode(secret), `${t}.${body}`);
    if (!sigs.some(s => /^[0-9a-f]{64}$/.test(s) && equal(s, expected))) {
      throw new Error('Invalid Stripe webhook signature');
    }
    let e: any;
    try {
      e = JSON.parse(body);
    } catch {
      throw new Error('Invalid Stripe webhook JSON');
    }
    const o = e.data?.object || {};
    const type = e.type || '';
    let status: WebhookResult['status'] = 'ignored';
    if ((type === 'checkout.session.completed' && o.payment_status === 'paid') || type === 'checkout.session.async_payment_succeeded') {
      status = 'paid';
    } else if (type === 'checkout.session.async_payment_failed') {
      status = 'failed';
    } else if (type === 'checkout.session.expired') {
      status = 'cancelled';
    } else if (type === 'charge.refunded') {
      status = o.refunded ? 'refunded' : 'refund_pending';
    } else if (type === 'refund.updated' || type === 'refund.created') {
      status = o.status === 'succeeded' ? 'refunded' : o.status === 'failed' ? 'failed' : 'refund_pending';
    }
    const pi = typeof o.payment_intent === 'string' ? o.payment_intent : o.payment_intent?.id;
    const charge = type.startsWith('charge.') ? o.id : undefined;
    return {
      eventId: String(e.id || ''),
      orderId: String(o.metadata?.order_id || o.client_reference_id || o.metadata?.orderId || ''),
      status,
      paymentId: pi || charge,
      amountMinor: typeof o.amount_total === 'number' ? o.amount_total : typeof o.amount === 'number' ? o.amount : undefined,
      currency: o.currency?.toUpperCase(),
      raw: e,
    };
  }

  if (provider === 'paypal') {
    let e: any;
    try {
      e = JSON.parse(body);
    } catch {
      throw new Error('Invalid PayPal webhook JSON');
    }
    const token = await paypalToken(env);
    const headers = req.headers;
    const transmission = {
      auth_algo: headers.get('paypal-auth-algo'),
      cert_url: headers.get('paypal-cert-url'),
      transmission_id: headers.get('paypal-transmission-id'),
      transmission_sig: headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id: required(env, 'PAYPAL_WEBHOOK_ID'),
      webhook_event: e,
    };
    if (Object.values(transmission).some(v => !v)) throw new Error('Missing PayPal webhook signature headers');
    const vr = await responseJson(
      await request(`${paypalBase(env)}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(transmission),
      }),
      'PayPal',
    );
    if (vr.verification_status !== 'SUCCESS') throw new Error('Invalid PayPal webhook signature');
    const type = e.event_type || '';
    const r = e.resource || {};
    const related = r.supplementary_data?.related_ids || {};
    const unit = r.purchase_units?.[0];
    let status: WebhookResult['status'] = 'ignored';
    if (type === 'PAYMENT.CAPTURE.COMPLETED' && r.status === 'COMPLETED') status = 'paid';
    else if (type === 'PAYMENT.CAPTURE.DENIED') status = 'failed';
    else if (type === 'CHECKOUT.ORDER.VOIDED') status = 'cancelled';
    else if (type === 'PAYMENT.CAPTURE.REFUNDED') status = 'refunded';
    const amt = r.amount || r.seller_receivable_breakdown?.gross_amount;
    return {
      eventId: String(e.id || ''),
      orderId: String(r.invoice_id || r.custom_id || unit?.invoice_id || unit?.custom_id || related.order_id || related.capture_id || ''),
      status,
      paymentId: String(r.id || related.capture_id || ''),
      amountMinor: amt?.value ? decimalToMinor(String(amt.value), String(amt.currency_code || 'USD')) : undefined,
      currency: amt?.currency_code,
      raw: e,
    };
  }

  if (provider === 'alipay') {
    if (!req.headers.get('content-type')?.toLowerCase().includes('application/x-www-form-urlencoded')) {
      throw new Error('Alipay webhook must be form-urlencoded');
    }
    const p = new URLSearchParams(body);
    const obj: Record<string, string> = {};
    for (const [k, v] of p) obj[k] = v;
    const sign = obj.sign;
    const signType = obj.sign_type;
    if (!sign || signType !== 'RSA2') throw new Error('Missing Alipay RSA2 signature');
    delete obj.sign;
    delete obj.sign_type;
    const canonical = buildAlipaySignedString(obj);
    if (!(await rsaVerify(canonical, sign, await importPublic(required(env, 'ALIPAY_PUBLIC_KEY'))))) {
      throw new Error('Invalid Alipay webhook signature');
    }
    if (obj.app_id !== required(env, 'ALIPAY_APP_ID')) throw new Error('Alipay app_id mismatch');
    const st = obj.trade_status;
    const status: WebhookResult['status'] =
      st === 'TRADE_SUCCESS' || st === 'TRADE_FINISHED' ? 'paid' : st === 'TRADE_CLOSED' ? 'cancelled' : 'ignored';
    return {
      eventId: `${obj.trade_no || ''}:${obj.out_trade_no || ''}:${st || ''}`,
      orderId: obj.out_trade_no || '',
      status,
      paymentId: obj.trade_no,
      amountMinor: obj.total_amount ? decimalToMinor(obj.total_amount, obj.currency || 'CNY') : undefined,
      currency: (obj.currency || 'CNY').toUpperCase(),
      raw: obj,
    };
  }

  if (provider === 'wechat') {
    const ts = req.headers.get('Wechatpay-Timestamp') || '';
    const nonce = req.headers.get('Wechatpay-Nonce') || '';
    const sig = req.headers.get('Wechatpay-Signature') || '';
    if (!/^\d+$/.test(ts) || Math.abs(Date.now() / 1000 - Number(ts)) > 300) {
      throw new Error('Invalid or expired WeChat Pay timestamp');
    }
    const canonical = `${ts}\n${nonce}\n${body}\n`;
    if (!(await rsaVerify(canonical, sig, await importPublic(required(env, 'WECHAT_PLATFORM_CERT'))))) {
      throw new Error('Invalid WeChat Pay webhook signature');
    }
    let e: any;
    try {
      e = JSON.parse(body);
    } catch {
      throw new Error('Invalid WeChat Pay webhook JSON');
    }
    if (!e.resource || e.resource.algorithm !== 'AEAD_AES_256_GCM') {
      throw new Error('Unsupported WeChat Pay resource algorithm');
    }
    const rawKey = enc.encode(required(env, 'WECHAT_API_V3_KEY'));
    if (rawKey.length !== 32) throw new Error('WECHAT_API_V3_KEY must be exactly 32 bytes');
    const k = await crypto.subtle.importKey('raw', asBuffer(rawKey), 'AES-GCM', false, ['decrypt']);
    const cipher = b64bytes(e.resource.ciphertext);
    let plain: string;
    try {
      plain = new TextDecoder().decode(
        await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: asBuffer(enc.encode(e.resource.nonce)), additionalData: asBuffer(enc.encode(e.resource.associated_data || '')) },
          k,
          asBuffer(cipher),
        ),
      );
    } catch {
      throw new Error('WeChat Pay resource decryption failed');
    }
    const r = JSON.parse(plain);
    const eventType = String(e.event_type || '');
    const st = String(r.trade_state || r.refund_status || r.status || '');
    let status: WebhookResult['status'] = 'ignored';
    if ((eventType === 'PAYMENT.SUCCESS' && st === 'SUCCESS') || (!eventType && st === 'SUCCESS')) status = 'paid';
    else if (eventType === 'REFUND.SUCCESS' && st === 'SUCCESS') status = 'refunded';
    else if (eventType === 'REFUND.ABNORMAL') status = 'refund_pending';
    else if (eventType === 'REFUND.CLOSED') status = 'failed';
    else if (eventType === 'PAYMENT.CLOSED' || eventType === 'PAYMENT.REVOKED' || (!eventType && (st === 'CLOSED' || st === 'REVOKED'))) status = 'cancelled';
    else if (eventType === 'PAYMENT.PAYERROR' || (!eventType && st === 'PAYERROR')) status = 'failed';
    const refund = eventType.startsWith('REFUND.');
    const orderId = String(r.out_trade_no || '');
    return {
      eventId: String(e.id || `${eventType}:${r.refund_id || r.transaction_id || ''}:${orderId}:${st}`),
      orderId,
      status,
      paymentId: refund ? r.refund_id : r.transaction_id,
      amountMinor: refund
        ? typeof r.amount?.refund === 'number'
          ? r.amount.refund
          : undefined
        : typeof r.amount?.total === 'number'
          ? r.amount.total
          : undefined,
      currency: r.amount?.currency,
      raw: { event: e, resource: r },
    };
  }

  throw new Error(`Unsupported payment provider: ${provider}`);
}

export async function refundPayment(
  provider: PaymentProvider,
  order: PaymentOrder,
  reason: string,
  env: PaymentEnv,
): Promise<{ status: 'refunded' | 'refund_pending'; refundId?: string }> {
  assertOrder(order);
  const why = (reason || 'Customer requested refund').slice(0, 200);

  if (provider === 'stripe') {
    const secret = required(env, 'STRIPE_SECRET_KEY');
    const id = order.providerPaymentId;
    if (!id) throw new Error('Stripe 退款需要交易流水号 (PaymentIntent 或 Charge)');
    const f = new URLSearchParams({ reason: 'requested_by_customer' });
    if (id.startsWith('ch_')) f.set('charge', id);
    else f.set('payment_intent', id);
    f.set('metadata[order_id]', order.id);
    const j = await responseJson(
      await request('https://api.stripe.com/v1/refunds', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Idempotency-Key': `refund-${order.id}`,
        },
        body: f,
      }),
      'Stripe',
    );
    return { status: j.status === 'succeeded' ? 'refunded' : 'refund_pending', refundId: j.id };
  }

  if (provider === 'paypal') {
    const capture = order.providerPaymentId;
    if (!capture) throw new Error('PayPal 退款需要捕获交易号 (Capture ID)');
    const token = await paypalToken(env);
    const j = await responseJson(
      await request(`${paypalBase(env)}/v2/payments/captures/${encodeURIComponent(capture)}/refund`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `refund-${order.id}`,
        },
        body: JSON.stringify({ note_to_payer: why }),
      }),
      'PayPal',
    );
    return { status: j.status === 'COMPLETED' ? 'refunded' : 'refund_pending', refundId: j.id };
  }

  if (provider === 'alipay') {
    const params: Record<string, string> = {
      app_id: required(env, 'ALIPAY_APP_ID'),
      method: 'alipay.trade.refund',
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: alipayTimestamp(),
      version: '1.0',
      biz_content: JSON.stringify({
        out_trade_no: order.id,
        refund_amount: minorToDecimal(order.amountMinor, order.currency),
        refund_reason: why,
        out_request_no: `refund-${order.id}`,
      }),
    };
    params.sign = await rsaSign(buildAlipaySignedString(params), await importPrivate(required(env, 'ALIPAY_PRIVATE_KEY')));
    const gateway = env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do';
    if (!gateway.startsWith('https://')) throw new Error('Alipay gateway must use HTTPS');
    const j = await responseJson(
      await request(gateway, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: new URLSearchParams(params),
      }),
      'Alipay',
    );
    const r = j.alipay_trade_refund_response;
    if (r?.code === '10000' && r.fund_change === 'Y') return { status: 'refunded', refundId: r.trade_no || r.out_request_no };
    if (r?.code === '10000' && r.fund_change === 'N') return { status: 'refund_pending', refundId: r.trade_no || r.out_request_no };
    throw new Error(`Alipay refund failed: ${safeMessage(r)}`);
  }

  if (provider === 'wechat') {
    const notify = env.WECHAT_NOTIFY_URL?.trim();
    if (!notify || !notify.startsWith('https://')) throw new Error('WECHAT_NOTIFY_URL 必须为公网 HTTPS');
    const mch = required(env, 'WECHAT_MCHID');
    const serial = required(env, 'WECHAT_SERIAL_NO');
    const key = await importPrivate(required(env, 'WECHAT_PRIVATE_KEY'));
    const transactionId = order.providerPaymentId;
    const merchantOrderId = order.id;
    const body = JSON.stringify({
      transaction_id: transactionId || undefined,
      out_trade_no: transactionId ? undefined : merchantOrderId,
      out_refund_no: `refund-${order.id}`,
      reason: why,
      notify_url: notify,
      amount: { refund: order.amountMinor, total: order.amountMinor, currency: order.currency.toUpperCase() },
    });
    const path = '/v3/refund/domestic/refunds';
    const ts = String(Math.floor(Date.now() / 1000));
    const nonce = crypto.randomUUID().replace(/-/g, '');
    const signature = await rsaSign(`POST\n${path}\n${ts}\n${nonce}\n${body}\n`, key);
    const auth = `WECHATPAY2-SHA256-RSA2048 mchid="${mch}",nonce_str="${nonce}",timestamp="${ts}",serial_no="${serial}",signature="${signature}"`;
    const j = await responseJson(
      await request(`https://api.mch.weixin.qq.com${path}`, {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json', 'User-Agent': 'fox3-blog/1.0' },
        body,
      }),
      'WeChat Pay',
    );
    return { status: j.status === 'SUCCESS' ? 'refunded' : 'refund_pending', refundId: j.refund_id };
  }

  throw new Error(`Unsupported payment provider: ${provider}`);
}
