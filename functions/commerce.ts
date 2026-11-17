import { capturePayPalOrder, createPayment, verifyPaymentWebhook, refundPayment, type PaymentProvider } from './payment-providers';

type UserIdentity = { id: string; username: string };
type MailSender = (to: string, subject: string, text: string, html: string) => Promise<{ success: boolean; error?: string }>;
type CommerceAuth = {
  isAdmin: (request: Request) => Promise<boolean>;
  getUser: (request: Request) => Promise<UserIdentity | null>;
  sendMail: MailSender;
};

const PAGE_KEYS = ['refund', 'privacy', 'terms', 'contact'] as const;
const LEGAL_DEFAULTS: Record<(typeof PAGE_KEYS)[number], string> = {
  refund: '退款政策\n\n请在此说明订单取消、退款申请入口、适用条件、处理时限、原支付渠道退款规则及不可退款情形。\n\n请站长根据实际商品、支付服务商规则和适用法律审阅后发布。',
  privacy: '隐私政策\n\n请在此说明收集的账户、订单、收货、客服和技术信息，处理目的、保存期限、服务商共享、用户权利、删除/更正请求方式以及联系方式。\n\n请站长根据实际数据处理活动和适用法律审阅后发布。',
  terms: '服务条款\n\n请在此说明网站和商品服务范围、账户责任、价格和订单规则、付款以服务端验签结果为准、交付/发货、知识产权、责任限制、争议处理和条款变更。\n\n请站长根据实际业务和适用法律审阅后发布。',
  contact: '联系方式\n\n请填写真实有效的运营主体/商户名称、客服邮箱、联系电话、服务时间、通信地址以及售后与投诉渠道。不要在此填写支付密钥。',
};

function json(data: unknown, status = 200, headers = new Headers()): Response {
  const resultHeaders = new Headers(headers);
  resultHeaders.set('Content-Type', 'application/json; charset=utf-8');
  resultHeaders.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(data), { status, headers: resultHeaders });
}
function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function uuid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}
async function ensureCommerceTables(db: any): Promise<void> {
  await db.prepare(`CREATE TABLE IF NOT EXISTS fox3_orders (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    username TEXT NOT NULL,
    productId TEXT NOT NULL,
    productName TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unitAmountMinor INTEGER NOT NULL,
    amountMinor INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CNY',
    paymentProvider TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    providerOrderId TEXT,
    providerPaymentId TEXT,
    paymentUrl TEXT,
    customerName TEXT NOT NULL,
    customerPhone TEXT NOT NULL,
    customerEmail TEXT NOT NULL,
    shippingAddress TEXT NOT NULL,
    couponCode TEXT NOT NULL DEFAULT '',
    discountMinor INTEGER NOT NULL DEFAULT 0,
    trackingNumber TEXT,
    carrier TEXT,
    refundId TEXT,
    refundReason TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    paidAt INTEGER,
    shippedAt INTEGER,
    refundedAt INTEGER
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS fox3_orders_user_created ON fox3_orders(userId, createdAt DESC)').run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS fox3_payment_events (
    eventId TEXT NOT NULL,
    provider TEXT NOT NULL,
    orderId TEXT NOT NULL,
    receivedAt INTEGER NOT NULL,
    PRIMARY KEY (provider, eventId)
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS fox3_conversations (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS fox3_chat_messages (
    id TEXT PRIMARY KEY,
    conversationId TEXT NOT NULL,
    senderId TEXT NOT NULL,
    senderRole TEXT NOT NULL,
    senderName TEXT NOT NULL,
    message TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    readAt INTEGER
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS fox3_chat_messages_conversation ON fox3_chat_messages(conversationId, createdAt)').run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS fox3_notifications (
    id TEXT PRIMARY KEY,
    recipientRole TEXT NOT NULL,
    recipientId TEXT NOT NULL DEFAULT '',
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    refId TEXT NOT NULL DEFAULT '',
    createdAt INTEGER NOT NULL,
    readAt INTEGER
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS fox3_notifications_recipient ON fox3_notifications(recipientRole, recipientId, readAt, createdAt DESC)').run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS fox3_legal_pages (
    pageKey TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    updatedAt INTEGER NOT NULL
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS fox3_payment_preferences (
    id TEXT PRIMARY KEY,
    adminEmail TEXT NOT NULL DEFAULT '',
    notifyEmail INTEGER NOT NULL DEFAULT 0,
    updatedAt INTEGER NOT NULL
  )`).run();
}
async function addNotification(db: any, recipientRole: 'admin' | 'user', recipientId: string, kind: string, title: string, body: string, refId: string, id?: string): Promise<void> {
  await db.prepare(`INSERT OR IGNORE INTO fox3_notifications
    (id, recipientRole, recipientId, kind, title, body, refId, createdAt, readAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`)
    .bind(id || uuid('notice'), recipientRole, recipientId, kind, title.slice(0, 180), body.slice(0, 1200), refId.slice(0, 200), Date.now()).run();
}
function rowToOrder(row: any, admin = false): any {
  const order = {
    id: String(row.id), userId: String(row.userId), username: String(row.username),
    productId: String(row.productId), productName: String(row.productName),
    quantity: Number(row.quantity), unitAmountMinor: Number(row.unitAmountMinor),
    amountMinor: Number(row.amountMinor), currency: String(row.currency || 'CNY'),
    paymentProvider: String(row.paymentProvider), status: String(row.status),
    paymentUrl: row.paymentUrl || undefined, customerName: String(row.customerName || ''),
    customerPhone: String(row.customerPhone || ''), customerEmail: String(row.customerEmail || ''),
    shippingAddress: String(row.shippingAddress || ''), couponCode: String(row.couponCode || ''),
    discountMinor: Number(row.discountMinor || 0), trackingNumber: row.trackingNumber || undefined,
    carrier: row.carrier || undefined, refundReason: row.refundReason || undefined,
    createdAt: Number(row.createdAt || 0), updatedAt: Number(row.updatedAt || 0),
    paidAt: row.paidAt ? Number(row.paidAt) : undefined,
    shippedAt: row.shippedAt ? Number(row.shippedAt) : undefined,
    refundedAt: row.refundedAt ? Number(row.refundedAt) : undefined,
  };
  if (!admin) {
    delete (order as any).userId;
    delete (order as any).username;
    delete (order as any).paymentUrl;
  }
  return order;
}
async function loadOrder(db: any, id: string): Promise<any | null> {
  return db.prepare('SELECT * FROM fox3_orders WHERE id = ? LIMIT 1').bind(id).first();
}
async function notifyPaid(db: any, row: any, sendMail: MailSender): Promise<void> {
  await addNotification(db, 'admin', '', 'payment_succeeded', '新订单已支付', `${row.username} 已支付订单 ${row.id}，金额 ${(Number(row.amountMinor) / 100).toFixed(2)} ${row.currency}。`, String(row.id), `payment-paid:${row.id}`);
  const prefs = await db.prepare('SELECT adminEmail, notifyEmail FROM fox3_payment_preferences WHERE id = ?').bind('default').first();
  const to = text(prefs?.adminEmail, 254);
  if (Number(prefs?.notifyEmail) === 1 && to) {
    const subject = `订单已支付：${row.id}`;
    const body = `用户 ${row.username} 的订单 ${row.id} 已由支付服务端验证为到账。\n商品：${row.productName}\n数量：${row.quantity}\n金额：${(Number(row.amountMinor) / 100).toFixed(2)} ${row.currency}\n请登录管理页面处理发货。`;
    try { await sendMail(to, subject, body, `<div style="white-space:pre-wrap">${body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`); } catch {}
  }
}
async function applyWebhook(db: any, provider: string, event: any, sendMail: MailSender): Promise<Response> {
  if (!event || !event.eventId || (!event.orderId && !event.paymentId)) return new Response('Invalid event', { status: 400 });
  const row = event.orderId ? await loadOrder(db, String(event.orderId)) : null;
  const mappedRow = row || await db.prepare('SELECT * FROM fox3_orders WHERE providerOrderId = ? OR providerPaymentId = ? LIMIT 1')
    .bind(String(event.orderId || ''), String(event.paymentId || '')).first();
  if (!mappedRow || String(mappedRow.paymentProvider) !== provider) return new Response('Order not found', { status: 404 });
  const order = mappedRow;
  if (event.status === 'paid') {
    if (Number(event.amountMinor) !== Number(order.amountMinor) || String(event.currency || '').toUpperCase() !== String(order.currency).toUpperCase()) {
      console.error(`[Payment] Verified webhook amount mismatch for order ${order.id}`);
      return new Response('Order amount or currency mismatch', { status: 400 });
    }
  }
  if (event.status === 'refunded' && event.amountMinor != null && Number(event.amountMinor) !== Number(order.amountMinor)) {
    console.error(`[Payment] Verified refund amount mismatch for order ${order.id}`);
    return new Response('Refund amount mismatch', { status: 400 });
  }
  const inserted = await db.prepare(`INSERT OR IGNORE INTO fox3_payment_events (eventId, provider, orderId, receivedAt) VALUES (?, ?, ?, ?)`)
    .bind(`${provider}:${String(event.eventId).slice(0, 240)}`, provider, String(order.id), Date.now()).run();
  if (!Number(inserted?.meta?.changes || 0)) return new Response('OK', { status: 200 });
  const now = Date.now();
  const paymentId = text(event.paymentId, 240) || null;
  if (event.status === 'paid') {
    await db.prepare(`UPDATE fox3_orders SET status = 'paid', providerPaymentId = COALESCE(?, providerPaymentId), paidAt = COALESCE(paidAt, ?), updatedAt = ?
      WHERE id = ? AND status NOT IN ('refunded','refund_pending')`).bind(paymentId, now, now, order.id).run();
    const fresh = await loadOrder(db, String(order.id));
    if (fresh?.status === 'paid' && !order.paidAt) await notifyPaid(db, fresh, sendMail);
  } else if (event.status === 'failed') {
    if (order.status === 'refund_pending') {
      await db.prepare(`UPDATE fox3_orders SET status = 'paid', updatedAt = ? WHERE id = ? AND status = 'refund_pending'`).bind(now, order.id).run();
      await addNotification(db, 'user', String(order.userId), 'refund_failed', '退款未完成', `订单 ${order.id} 的退款未能完成，请联系站长处理。`, String(order.id), `refund-failed:${order.id}`);
    } else {
      await db.prepare(`UPDATE fox3_orders SET status = 'failed', updatedAt = ? WHERE id = ? AND status = 'pending'`).bind(now, order.id).run();
    }
  } else if (event.status === 'cancelled') {
    await db.prepare(`UPDATE fox3_orders SET status = 'cancelled', updatedAt = ? WHERE id = ? AND status = 'pending'`).bind(now, order.id).run();
  } else if (event.status === 'refund_pending') {
    await db.prepare(`UPDATE fox3_orders SET status = 'refund_pending', updatedAt = ? WHERE id = ? AND status IN ('paid','shipped','refund_pending')`).bind(now, order.id).run();
  } else if (event.status === 'refunded') {
    await db.prepare(`UPDATE fox3_orders SET status = 'refunded', providerPaymentId = COALESCE(?, providerPaymentId), refundedAt = COALESCE(refundedAt, ?), updatedAt = ? WHERE id = ? AND status IN ('paid','shipped','refund_pending','refunded')`).bind(paymentId, now, now, order.id).run();
    await addNotification(db, 'user', String(order.userId), 'refund_succeeded', '退款已完成', `订单 ${order.id} 的退款已由支付平台确认。`, String(order.id), `refund-done:${order.id}`);
  }
  return new Response('OK', { status: 200 });
}

export async function handleCommerceRequest(
  request: Request,
  path: string,
  env: any,
  headers: Headers,
  auth: CommerceAuth,
): Promise<Response | null> {
  const matchOrder = path.match(/^\/orders\/([^/]+)(?:\/(cancel|capture|ship|refund))?$/);
  const isCommercePath = path === '/orders' || Boolean(matchOrder) || path.startsWith('/chat/') || path.startsWith('/notifications') || path === '/legal-pages' || path === '/payment-settings' || path.startsWith('/payments/webhook/');
  if (!isCommercePath) return null;
  if (!env.DB) return json({ success: false, error: '此功能需要已绑定且迁移成功的 Cloudflare D1（DB）数据库' }, 503, headers);
  try {
    await ensureCommerceTables(env.DB);

    const webhook = path.match(/^\/payments\/webhook\/(alipay|wechat|stripe|paypal)$/);
    if (webhook && request.method === 'POST') {
      const provider = webhook[1];
      const rawBody = await request.text();
      if (rawBody.length > 1_000_000) return new Response('Webhook too large', { status: 413 });
      let event: any;
      try { event = await verifyPaymentWebhook(provider as PaymentProvider, request, rawBody, env); }
      catch (error: any) {
        console.warn(`[Payment] ${provider} webhook signature/verification rejected: ${String(error?.message || error).slice(0, 160)}`);
        return new Response('Invalid payment webhook', { status: 401 });
      }
      if (event.status === 'ignored') return provider === 'wechat'
        ? json({ code: 'SUCCESS', message: '成功' }, 200, headers)
        : new Response(provider === 'alipay' ? 'success' : 'OK', { status: 200 });
      const response = await applyWebhook(env.DB, provider, event, auth.sendMail);
      if (response.ok && provider === 'wechat') return json({ code: 'SUCCESS', message: '成功' }, 200, headers);
      if (response.ok && provider === 'alipay') return new Response('success', { status: 200 });
      return response;
    }

    const isAdmin = await auth.isAdmin(request);
    const user = isAdmin ? null : await auth.getUser(request);
    const actorId = isAdmin ? 'admin' : user?.id || '';
    if (!actorId) return json({ success: false, error: '请先登录有效账户后使用订单、客服和消息功能' }, 401, headers);

    if (path === '/orders' && request.method === 'GET') {
      const result = isAdmin
        ? await env.DB.prepare('SELECT * FROM fox3_orders ORDER BY createdAt DESC LIMIT 500').all()
        : await env.DB.prepare('SELECT * FROM fox3_orders WHERE userId = ? ORDER BY createdAt DESC LIMIT 100').bind(actorId).all();
      return json({ success: true, orders: (result?.results || []).map((row: any) => rowToOrder(row, isAdmin)) }, 200, headers);
    }

    if (path === '/orders' && request.method === 'POST') {
      if (isAdmin || !user) return json({ success: false, error: '订单必须由已注册的普通用户账户创建' }, 403, headers);
      const body = await request.json() as any;
      const productId = text(body?.productId, 200);
      const quantity = Number(body?.quantity);
      const provider = text(body?.paymentProvider, 16).toLowerCase();
      const customerName = text(body?.customerName, 160);
      const customerPhone = text(body?.customerPhone, 60);
      const customerEmail = text(body?.customerEmail, 254);
      const shippingAddress = text(body?.shippingAddress, 1000);
      const couponCode = text(body?.couponCode, 50).toUpperCase();
      if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 99 || !['alipay','wechat','stripe','paypal'].includes(provider)) {
        return json({ success: false, error: '商品、数量或支付渠道无效' }, 400, headers);
      }
      if (!customerName || !customerPhone || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(customerEmail) || !shippingAddress) {
        return json({ success: false, error: '请填写有效的姓名、联系电话、邮箱和收货地址' }, 400, headers);
      }
      const published = await env.DB.prepare('SELECT value FROM fox3_site_content WHERE id = ?').bind('published').first();
      if (!published?.value) return json({ success: false, error: '商品目录尚未发布到站点数据库' }, 503, headers);
      let products: any[] = [];
      try { products = JSON.parse(String(published.value))?.products || []; } catch {}
      const product = products.find((item: any) => item?.id === productId);
      if (!product || !Number.isFinite(Number(product.price)) || Number(product.price) <= 0) return json({ success: false, error: '商品不存在或价格无效，请刷新页面' }, 404, headers);
      const stock = Number(product.stock || 50);
      if (quantity > stock) return json({ success: false, error: `库存不足，目前可购买 ${stock} 件` }, 409, headers);
      const priceCents = Math.round(Number(product.price) * 100);
      const discountRate = couponCode === 'FOX3' ? 0.15 : 0;
      const amountMinor = Math.round(priceCents * quantity * (1 - discountRate));
      if (amountMinor < 1 || amountMinor > 2_000_000_000) return json({ success: false, error: '订单金额超出安全范围' }, 400, headers);
      const id = `F3${Date.now().toString(36).toUpperCase()}${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`.slice(0, 32);
      const now = Date.now();
      const discountMinor = priceCents * quantity - amountMinor;
      await env.DB.prepare(`INSERT INTO fox3_orders
        (id,userId,username,productId,productName,quantity,unitAmountMinor,amountMinor,currency,paymentProvider,status,customerName,customerPhone,customerEmail,shippingAddress,couponCode,discountMinor,createdAt,updatedAt)
        VALUES (?,?,?,?,?,?,?,?,? ,?,'pending',?,?,?,?,?,?,?,?)`)
        .bind(id, user.id, user.username, productId, text(product.name, 250), quantity, priceCents, amountMinor, 'CNY', provider,
          customerName, customerPhone, customerEmail.toLowerCase(), shippingAddress, discountRate ? couponCode : '', discountMinor, now, now).run();
      const draft = { id, amountMinor, currency: 'CNY', productName: text(product.name, 250), quantity };
      try {
        const payment = await createPayment(provider as PaymentProvider, draft, env, new URL(request.url).origin);
        await env.DB.prepare('UPDATE fox3_orders SET providerOrderId = ?, paymentUrl = ?, updatedAt = ? WHERE id = ?')
          .bind(payment.providerOrderId || null, payment.redirectUrl || null, Date.now(), id).run();
        const saved = await loadOrder(env.DB, id);
        return json({ success: true, order: rowToOrder(saved), payment }, 201, headers);
      } catch (error: any) {
        await env.DB.prepare(`UPDATE fox3_orders SET status = 'failed', updatedAt = ? WHERE id = ? AND status = 'pending'`).bind(Date.now(), id).run();
        console.warn(`[Payment] ${provider} create payment failed for order ${id}: ${String(error?.message || error).slice(0, 180)}`);
        return json({ success: false, error: String(error?.publicMessage || error?.message || '支付服务当前不可用；订单未付款，请检查服务端商户配置').slice(0, 300), orderId: id }, 502, headers);
      }
    }

    if (matchOrder) {
      const [, orderId, action] = matchOrder;
      const row = await loadOrder(env.DB, decodeURIComponent(orderId));
      if (!row) return json({ success: false, error: '订单不存在' }, 404, headers);
      if (!isAdmin && row.userId !== actorId) return json({ success: false, error: '无权访问此订单' }, 403, headers);
      if (!action && request.method === 'GET') return json({ success: true, order: rowToOrder(row, isAdmin) }, 200, headers);
      if (action === 'cancel' && request.method === 'POST') {
        if (isAdmin || row.status !== 'pending') return json({ success: false, error: '仅订单本人可取消尚未支付的订单' }, 409, headers);
        await env.DB.prepare(`UPDATE fox3_orders SET status = 'cancelled', updatedAt = ? WHERE id = ? AND userId = ? AND status = 'pending'`).bind(Date.now(), row.id, actorId).run();
        return json({ success: true, order: rowToOrder(await loadOrder(env.DB, row.id)) }, 200, headers);
      }
      if (action === 'capture' && request.method === 'POST') {
        // A PayPal return redirect is only a prompt to perform server-side capture; paid state still comes from verified server response/webhook.
        if (isAdmin || row.userId !== actorId || row.paymentProvider !== 'paypal' || !['pending','failed'].includes(String(row.status))) return json({ success: false, error: '当前订单不可执行 PayPal 捕获' }, 409, headers);
        if (!row.providerOrderId) return json({ success: false, error: 'PayPal 支付订单标识缺失' }, 409, headers);
        try {
          const capture = await capturePayPalOrder(String(row.providerOrderId), env);
          if (capture.status === 'COMPLETED' && capture.paymentId) {
            if (Number(capture.amountMinor) !== Number(row.amountMinor) || String(capture.currency || '').toUpperCase() !== String(row.currency).toUpperCase()) {
              return json({ success: false, error: 'PayPal 捕获金额/币种与订单不符，已阻止订单确认' }, 409, headers);
            }
            await env.DB.prepare('UPDATE fox3_orders SET providerPaymentId = ?, updatedAt = ? WHERE id = ? AND userId = ? AND status = \'pending\'')
              .bind(capture.paymentId, Date.now(), row.id, actorId).run();
          } else if (capture.status === 'DECLINED') {
            await env.DB.prepare(`UPDATE fox3_orders SET status = 'failed', updatedAt = ? WHERE id = ? AND status = 'pending'`).bind(Date.now(), row.id).run();
          }
          return json({ success: true, captureStatus: capture.status, order: rowToOrder(await loadOrder(env.DB, row.id)), message: capture.status === 'COMPLETED' ? 'PayPal 已确认捕获请求；订单到账状态仍以验签的 PayPal Webhook 为准。' : '支付平台尚未确认完成，请稍后刷新订单。' }, 200, headers);
        } catch {
          return json({ success: false, error: 'PayPal 服务端捕获失败；请重试或检查 PayPal 控制台' }, 502, headers);
        }
      }
      if (action === 'ship' && request.method === 'POST') {
        if (!isAdmin || row.status !== 'paid') return json({ success: false, error: '只有管理员可为已支付订单确认发货' }, 403, headers);
        const body = await request.json() as any;
        const trackingNumber = text(body?.trackingNumber, 160);
        const carrier = text(body?.carrier, 100);
        const now = Date.now();
        await env.DB.prepare(`UPDATE fox3_orders SET status = 'shipped', trackingNumber = ?, carrier = ?, shippedAt = ?, updatedAt = ? WHERE id = ? AND status = 'paid'`)
          .bind(trackingNumber || null, carrier || null, now, now, row.id).run();
        await addNotification(env.DB, 'user', String(row.userId), 'order_shipped', '订单已确认发货', `订单 ${row.id} 已确认发货。${carrier ? `承运方：${carrier}。` : ''}${trackingNumber ? `运单号：${trackingNumber}` : ''}`, String(row.id), `shipped:${row.id}`);
        return json({ success: true, order: rowToOrder(await loadOrder(env.DB, row.id), true) }, 200, headers);
      }
      if (action === 'refund' && request.method === 'POST') {
        if (!isAdmin || !['paid','shipped','refund_pending'].includes(String(row.status))) return json({ success: false, error: '仅管理员可为已支付且未退款的订单申请原路退款' }, 403, headers);
        if (!row.providerPaymentId && !row.providerOrderId) return json({ success: false, error: '支付平台尚未返回可用于退款的交易标识' }, 409, headers);
        const body = await request.json() as any;
        const reason = text(body?.reason, 500);
        try {
          const result = await refundPayment(String(row.paymentProvider) as PaymentProvider, { ...row, id: String(row.id), amountMinor: Number(row.amountMinor), currency: String(row.currency) }, reason, env);
          const status = result.status === 'refunded' ? 'refunded' : 'refund_pending';
          const now = Date.now();
          await env.DB.prepare(`UPDATE fox3_orders SET status = ?, refundId = ?, refundReason = ?, refundedAt = CASE WHEN ? = 'refunded' THEN ? ELSE refundedAt END, updatedAt = ? WHERE id = ? AND status IN ('paid','shipped','refund_pending')`)
            .bind(status, result.refundId || null, reason, status, now, now, row.id).run();
          await addNotification(env.DB, 'user', String(row.userId), status === 'refunded' ? 'refund_succeeded' : 'refund_pending', status === 'refunded' ? '退款已完成' : '退款处理中', `订单 ${row.id}：${status === 'refunded' ? '退款已由支付平台确认' : '退款请求已提交，最终状态以支付平台确认通知为准'}`, String(row.id), `${status}:${row.id}`);
          return json({ success: true, order: rowToOrder(await loadOrder(env.DB, row.id), true) }, 200, headers);
        } catch (error: any) {
          console.warn(`[Payment] refund call failed for order ${row.id}: ${String(error?.message || error).slice(0, 180)}`);
          return json({ success: false, error: String(error?.publicMessage || error?.message || '支付平台拒绝退款请求；订单状态未被标记为退款成功').slice(0, 300) }, 502, headers);
        }
      }
      return json({ success: false, error: 'Method not allowed' }, 405, headers);
    }

    if (path === '/payment-settings') {
      if (!isAdmin) return json({ success: false, error: '仅管理员可查看和修改支付通知设置' }, 403, headers);
      if (request.method === 'GET') {
        const row = await env.DB.prepare('SELECT adminEmail, notifyEmail, updatedAt FROM fox3_payment_preferences WHERE id = ?').bind('default').first();
        return json({ success: true, settings: { adminEmail: String(row?.adminEmail || ''), notifyEmail: Number(row?.notifyEmail) === 1, updatedAt: Number(row?.updatedAt || 0) } }, 200, headers);
      }
      if (request.method === 'POST') {
        const body = await request.json() as any;
        const email = text(body?.adminEmail, 254).toLowerCase();
        const enabled = body?.notifyEmail === true;
        if (enabled && !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)) return json({ success: false, error: '启用支付邮件通知前，请填写有效的接收邮箱' }, 400, headers);
        const now = Date.now();
        await env.DB.prepare(`INSERT INTO fox3_payment_preferences (id, adminEmail, notifyEmail, updatedAt) VALUES ('default', ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET adminEmail = excluded.adminEmail, notifyEmail = excluded.notifyEmail, updatedAt = excluded.updatedAt`)
          .bind(email, enabled ? 1 : 0, now).run();
        return json({ success: true, settings: { adminEmail: email, notifyEmail: enabled, updatedAt: now } }, 200, headers);
      }
      return json({ success: false, error: 'Method not allowed' }, 405, headers);
    }

    if (path === '/legal-pages') {
      if (request.method === 'GET') {
        const result = await env.DB.prepare('SELECT pageKey, content, updatedAt FROM fox3_legal_pages').all();
        const pages: Record<string, string> = { ...LEGAL_DEFAULTS };
        const updatedAt: Record<string, number> = {};
        for (const row of result?.results || []) if ((PAGE_KEYS as readonly string[]).includes(String(row.pageKey))) {
          pages[String(row.pageKey)] = String(row.content || ''); updatedAt[String(row.pageKey)] = Number(row.updatedAt || 0);
        }
        return json({ success: true, pages, updatedAt }, 200, headers);
      }
      if (request.method === 'PUT') {
        if (!isAdmin) return json({ success: false, error: '仅管理员可编辑法律与联系方式页面' }, 403, headers);
        const body = await request.json() as any;
        if (!body?.pages || typeof body.pages !== 'object' || Array.isArray(body.pages)) return json({ success: false, error: '页面内容格式无效' }, 400, headers);
        const now = Date.now();
        const statements = PAGE_KEYS.map(key => env.DB.prepare(`INSERT INTO fox3_legal_pages (pageKey, content, updatedAt) VALUES (?, ?, ?)
          ON CONFLICT(pageKey) DO UPDATE SET content = excluded.content, updatedAt = excluded.updatedAt`)
          .bind(key, text(body.pages[key], 50000), now));
        await env.DB.batch(statements);
        return json({ success: true, updatedAt: now }, 200, headers);
      }
      return json({ success: false, error: 'Method not allowed' }, 405, headers);
    }

    if (path === '/notifications/unread' && request.method === 'GET') {
      const role = isAdmin ? 'admin' : 'user';
      const recipient = isAdmin ? '' : actorId;
      const unread = await env.DB.prepare(`SELECT COUNT(*) AS count FROM fox3_notifications WHERE recipientRole = ? AND recipientId = ? AND readAt IS NULL`)
        .bind(role, recipient).first();
      const messages = await env.DB.prepare(`SELECT COUNT(*) AS count FROM fox3_chat_messages m JOIN fox3_conversations c ON c.id = m.conversationId
        WHERE m.readAt IS NULL AND m.senderRole <> ? AND (? = 1 OR c.userId = ?)`)
        .bind(isAdmin ? 'admin' : 'user', isAdmin ? 1 : 0, actorId).first();
      return json({ success: true, count: Number(unread?.count || 0) + Number(messages?.count || 0) }, 200, headers);
    }
    if (path === '/notifications/read' && request.method === 'POST') {
      const role = isAdmin ? 'admin' : 'user';
      await env.DB.prepare('UPDATE fox3_notifications SET readAt = ? WHERE recipientRole = ? AND recipientId = ? AND readAt IS NULL')
        .bind(Date.now(), role, isAdmin ? '' : actorId).run();
      return json({ success: true }, 200, headers);
    }

    const deleteConversationMatch = path.match(/^\/chat\/conversations\/([^/]+)$/);
    if (deleteConversationMatch && request.method === 'DELETE') {
      if (!isAdmin) return json({ success: false, error: '仅管理员可删除客服对话' }, 403, headers);
      const conversationId = decodeURIComponent(deleteConversationMatch[1]);
      const conversation = await env.DB.prepare('SELECT id FROM fox3_conversations WHERE id = ?').bind(conversationId).first();
      if (!conversation) return json({ success: false, error: '对话不存在或已被删除' }, 404, headers);
      await env.DB.batch([
        env.DB.prepare('DELETE FROM fox3_chat_messages WHERE conversationId = ?').bind(conversationId),
        env.DB.prepare("DELETE FROM fox3_notifications WHERE kind = 'chat_message' AND refId = ?").bind(conversationId),
        env.DB.prepare('DELETE FROM fox3_conversations WHERE id = ?').bind(conversationId),
      ]);
      return json({ success: true }, 200, headers);
    }
    if (path === '/chat/conversations' && request.method === 'GET') {
      if (isAdmin) {
        const result = await env.DB.prepare(`SELECT c.id,c.userId,c.username,c.createdAt,c.updatedAt,
          (SELECT message FROM fox3_chat_messages m WHERE m.conversationId=c.id ORDER BY m.createdAt DESC LIMIT 1) AS lastMessage,
          (SELECT COUNT(*) FROM fox3_chat_messages m WHERE m.conversationId=c.id AND m.readAt IS NULL AND m.senderRole <> 'admin') AS unread
          FROM fox3_conversations c ORDER BY c.updatedAt DESC LIMIT 200`).all();
        return json({ success: true, conversations: result?.results || [] }, 200, headers);
      }
      const result = await env.DB.prepare('SELECT id,userId,username,createdAt,updatedAt FROM fox3_conversations WHERE userId = ? LIMIT 1').bind(actorId).first();
      return json({ success: true, conversations: result ? [result] : [] }, 200, headers);
    }
    if (path === '/chat/messages' && request.method === 'GET') {
      const conversationId = text(new URL(request.url).searchParams.get('conversationId'), 200);
      if (!conversationId) return json({ success: false, error: '缺少对话编号' }, 400, headers);
      const conversation = await env.DB.prepare('SELECT id,userId FROM fox3_conversations WHERE id = ?').bind(conversationId).first();
      if (!conversation || (!isAdmin && conversation.userId !== actorId)) return json({ success: false, error: '无权读取此对话' }, 403, headers);
      const result = await env.DB.prepare('SELECT id,conversationId,senderId,senderRole,senderName,message,createdAt FROM fox3_chat_messages WHERE conversationId = ? ORDER BY createdAt ASC LIMIT 500').bind(conversationId).all();
      await env.DB.prepare('UPDATE fox3_chat_messages SET readAt = ? WHERE conversationId = ? AND senderRole <> ? AND readAt IS NULL')
        .bind(Date.now(), conversationId, isAdmin ? 'admin' : 'user').run();
      return json({ success: true, messages: result?.results || [] }, 200, headers);
    }
    if (path === '/chat/messages' && request.method === 'POST') {
      const body = await request.json() as any;
      const message = text(body?.message, 4000);
      if (!message) return json({ success: false, error: '对话内容不能为空' }, 400, headers);
      let conversationId = text(body?.conversationId, 200);
      let conversation: any = conversationId ? await env.DB.prepare('SELECT id,userId,username FROM fox3_conversations WHERE id = ?').bind(conversationId).first() : null;
      if (isAdmin) {
        if (!conversation) return json({ success: false, error: '管理员回复必须选择现有用户对话' }, 400, headers);
      } else {
        if (conversation && conversation.userId !== actorId) return json({ success: false, error: '无权向其他账户对话' }, 403, headers);
        if (!conversation) {
          const existing = await env.DB.prepare('SELECT id,userId,username FROM fox3_conversations WHERE userId = ?').bind(actorId).first();
          if (existing) { conversation = existing; conversationId = String(existing.id); }
          else {
            conversationId = uuid('chat');
            const now = Date.now();
            await env.DB.prepare('INSERT INTO fox3_conversations (id,userId,username,createdAt,updatedAt) VALUES (?,?,?,?,?)').bind(conversationId, actorId, user!.username, now, now).run();
            conversation = { id: conversationId, userId: actorId, username: user!.username };
          }
        }
      }
      const now = Date.now();
      const senderRole = isAdmin ? 'admin' : 'user';
      const senderId = isAdmin ? 'admin' : actorId;
      const senderName = isAdmin ? '站长' : user!.username;
      const messageId = uuid('msg');
      await env.DB.batch([
        env.DB.prepare('INSERT INTO fox3_chat_messages (id,conversationId,senderId,senderRole,senderName,message,createdAt,readAt) VALUES (?,?,?,?,?,?,?,NULL)')
          .bind(messageId, conversationId, senderId, senderRole, senderName, message, now),
        env.DB.prepare('UPDATE fox3_conversations SET updatedAt = ? WHERE id = ?').bind(now, conversationId),
      ]);
      if (isAdmin) await addNotification(env.DB, 'user', String(conversation.userId), 'chat_message', '站长回复了你的消息', message.slice(0, 200), conversationId);
      else await addNotification(env.DB, 'admin', '', 'chat_message', '收到新的用户咨询', `${user!.username}：${message.slice(0, 180)}`, conversationId);
      return json({ success: true, conversationId, message: { id: messageId, conversationId, senderId, senderRole, senderName, message, createdAt: now } }, 201, headers);
    }
    if (path === '/chat/read' && request.method === 'POST') {
      const body = await request.json() as any;
      const conversationId = text(body?.conversationId, 200);
      if (conversationId) {
        const conversation = await env.DB.prepare('SELECT id,userId FROM fox3_conversations WHERE id = ?').bind(conversationId).first();
        if (!conversation || (!isAdmin && conversation.userId !== actorId)) return json({ success: false, error: '无权标记此对话' }, 403, headers);
        await env.DB.prepare('UPDATE fox3_chat_messages SET readAt = ? WHERE conversationId = ? AND senderRole <> ? AND readAt IS NULL').bind(Date.now(), conversationId, isAdmin ? 'admin' : 'user').run();
      }
      return json({ success: true }, 200, headers);
    }
    return json({ success: false, error: 'Method not allowed' }, 405, headers);
  } catch (error: any) {
    console.error('[Commerce] API failure:', String(error?.stack || error?.message || error).slice(0, 700));
    return json({ success: false, error: '订单、对话或页面数据库操作失败；请检查 D1 绑定与迁移' }, 503, headers);
  }
}
