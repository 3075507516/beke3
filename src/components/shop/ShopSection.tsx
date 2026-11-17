import React, { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { SafeImage } from '../common/SafeImage';
import { getUserSessionToken } from '../../utils/userSession';
import { getAdminSessionToken } from '../../utils/adminSession';
import { CheckCircle, Edit3, MessageCircle, Plus, Send, ShoppingBag, Trash2, Truck, X } from 'lucide-react';

type Provider = 'alipay' | 'wechat' | 'stripe' | 'paypal';
type Order = {
  id: string; status: string; amountMinor: number; amount?: number; currency: string;
  createdAt: number; productName: string; productId: string; quantity: number;
  customerName?: string; customerPhone?: string; customerEmail?: string; shippingAddress?: string; username?: string;
  paymentProvider: Provider; trackingNumber?: string; carrier?: string;
};
type Conversation = { id: string; username?: string; userName?: string; lastMessage?: string; unread?: number; unreadCount?: number };
type ChatMessage = { id: string; senderRole: 'admin' | 'user'; senderName: string; message: string; createdAt: number };
type PaymentState = { orderId: string; payment?: { redirectUrl?: string; qrCode?: string }; order?: Order };

const statusLabels: Record<string, string> = {
  paid: '已支付', failed: '支付失败', pending: '待支付', cancelled: '已取消',
  refunded: '已退款', refund_pending: '退款处理中', shipped: '已发货',
};
const money = (order: Order) => `${order.currency || 'CNY'} ${(Number(order.amountMinor || 0) / 100).toFixed(2)}`;

export const ShopSection: React.FC = () => {
  const { products, setProducts, currentUser, uploadFile, systemSettings, deviceMode } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  const token = isAdmin ? getAdminSessionToken() : getUserSessionToken();
  const headers = (): HeadersInit => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
  const api = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(path, { ...init, headers: { ...headers(), ...(init.headers as Record<string, string> || {}) }, cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.error || data.message || `请求失败 (${response.status})`);
    return data;
  };

  const [showcase, setShowcase] = useState('all');
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [checkout, setCheckout] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [provider, setProvider] = useState<Provider>('alipay');
  const [customerName, setCustomerName] = useState(currentUser?.username || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || '');
  const [shippingAddress, setShippingAddress] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [payment, setPayment] = useState<PaymentState | null>(null);
  const [search, setSearch] = useState('');
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [adminEmail, setAdminEmail] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadOrders = async () => {
    if (!currentUser || !token) return;
    try {
      const data = await api('/api/orders');
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (e) { setError(e instanceof Error ? e.message : '订单加载失败'); }
  };
  const loadConversations = async () => {
    if (!currentUser || !token) return;
    try {
      const data = await api('/api/chat/conversations');
      const list: Conversation[] = Array.isArray(data.conversations) ? data.conversations : [];
      setConversations(list);
      if (isAdmin && !list.some(item => item.id === conversationId)) setConversationId(list[0]?.id || '');
      if (!conversationId && list[0]) setConversationId(list[0].id);
    } catch (e) { setError(e instanceof Error ? e.message : '对话加载失败'); }
  };
  const loadMessages = async (id: string) => {
    if (!id || !token) return;
    try {
      const data = await api(`/api/chat/messages?conversationId=${encodeURIComponent(id)}`);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (e) { setError(e instanceof Error ? e.message : '消息加载失败'); }
  };

  useEffect(() => { void loadOrders(); void loadConversations(); }, [currentUser?.id, token]);
  useEffect(() => {
    const openMessages = () => {
      try { window.sessionStorage.removeItem('fox3-open-messages'); } catch {}
      setChatOpen(true);
      void loadConversations();
    };
    window.addEventListener('fox3-open-messages', openMessages);
    try { if (window.sessionStorage.getItem('fox3-open-messages') === '1') openMessages(); } catch {}
    return () => window.removeEventListener('fox3-open-messages', openMessages);
  }, [currentUser?.id, token]);
  useEffect(() => { if (conversationId) void loadMessages(conversationId); else setMessages([]); }, [conversationId, token]);
  useEffect(() => {
    if (!currentUser || !isAdmin) return;
    void api('/api/payment-settings').then(data => {
      setAdminEmail(data.settings?.adminEmail || ''); setNotifyEmail(Boolean(data.settings?.notifyEmail));
    }).catch(() => {});
  }, [currentUser?.id, isAdmin, token]);
  useEffect(() => {
    if (!orders.some(order => order.status === 'pending')) return;
    const timer = window.setInterval(() => { void loadOrders(); }, 8000);
    return () => window.clearInterval(timer);
  }, [orders, currentUser?.id, token]);
  useEffect(() => {
    if (!payment?.orderId || !currentUser) return;
    let active = true;
    const refresh = async () => {
      try {
        const data = await api(`/api/orders/${encodeURIComponent(payment.orderId)}`);
        if (active && data.order) setPayment(current => current?.orderId === payment.orderId ? { ...current, order: data.order } : current);
      } catch { /* The regular order list still exposes service-side errors. */ }
    };
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [payment?.orderId, currentUser?.id, token]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('paymentOrder');
    const cancelledId = params.get('paymentCancel');
    if (cancelledId) {
      setError(`支付流程已取消或中止（订单 ${cancelledId}）；这不代表支付成功。`);
      params.delete('paymentCancel');
      const query = params.toString(); window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
      return;
    }
    if (!orderId || !currentUser || !token) return;
    let active = true;
    const finishReturn = async () => {
      try {
        const data = await api(`/api/orders/${encodeURIComponent(orderId)}`);
        let order: Order = data.order;
        if (order.paymentProvider === 'paypal' && order.status === 'pending') {
          await api(`/api/orders/${encodeURIComponent(orderId)}/capture`, { method: 'POST', body: '{}' });
          const latest = await api(`/api/orders/${encodeURIComponent(orderId)}`);
          order = latest.order;
        }
        if (!active) return;
        setPayment({ orderId, order });
        await loadOrders();
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : '支付返回状态读取失败；请稍后刷新订单');
      } finally {
        params.delete('paymentOrder'); params.delete('session_id');
        const query = params.toString(); window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
      }
    };
    void finishReturn();
    return () => { active = false; };
  }, [currentUser?.id, token]);

  const filteredProducts = useMemo(() => products.filter(product => showcase === 'all' || product.showcaseId === showcase), [products, showcase]);
  const filteredOrders = useMemo(() => orders.filter(order => !search || `${order.id} ${order.customerName || ''} ${order.customerEmail || ''} ${order.username || ''}`.toLowerCase().includes(search.toLowerCase())), [orders, search]);
  const panel = `rounded-3xl border shadow-sm ${systemSettings.transparentCards ? 'bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border-white/30' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`;

  const saveProduct = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing?.name || !Number(editing.price)) return;
    const now = Date.now();
    const images = editing.images?.length ? editing.images : [];
    if (editing.id) setProducts(items => items.map(item => item.id === editing.id ? { ...item, ...editing, price: Number(editing.price), images, updatedAt: now } as Product : item));
    else setProducts(items => [{ id: `prod-${crypto.randomUUID()}`, name: String(editing.name), description: editing.description || '', price: Number(editing.price), images, category: editing.category || '默认', stock: Number(editing.stock || 10), showcaseId: editing.showcaseId || 'showcase-main', createdAt: now, updatedAt: now }, ...items]);
    setEditing(null);
  };

  const submitOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser || !token) { setError('请先登录已注册账户，再创建订单。'); return; }
    if (!checkout) return;
    setBusy(true); setError('');
    try {
      const data = await api('/api/orders', { method: 'POST', body: JSON.stringify({ productId: checkout.id, quantity, paymentProvider: provider, customerName, customerPhone, customerEmail, shippingAddress, couponCode: couponCode.trim() || undefined }) });
      const paymentData = data.payment || {};
      setPayment({ orderId: data.order.id, payment: paymentData, order: data.order });
      setCheckout(null);
      await loadOrders();
      if (paymentData.redirectUrl) window.location.assign(paymentData.redirectUrl);
    } catch (e) { setError(e instanceof Error ? e.message : '订单创建失败；请检查登录和支付服务配置'); }
    finally { setBusy(false); }
  };

  const orderAction = async (orderId: string, action: string, body: Record<string, unknown> = {}) => {
    try {
      const result = await api(`/api/orders/${encodeURIComponent(orderId)}/${action}`, { method: 'POST', body: JSON.stringify(body) });
      await loadOrders();
      if (result.order && payment?.orderId === orderId) setPayment(current => current ? { ...current, order: result.order } : current);
    } catch (e) { setError(e instanceof Error ? e.message : '订单操作失败'); }
  };
  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser || !token) { setError('请先登录后再联系客服，系统不会把访客留言伪存成已发送消息。'); return; }
    const message = messageText.trim(); if (!message) return;
    try {
      const result = await api('/api/chat/messages', { method: 'POST', body: JSON.stringify({ ...(conversationId ? { conversationId } : {}), message }) });
      setMessageText(''); setConversationId(result.conversationId || conversationId);
      if (result.conversationId) await loadMessages(result.conversationId);
      await loadConversations();
    } catch (e) { setError(e instanceof Error ? e.message : '消息发送失败'); }
  };
  const savePaymentNoticeSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const result = await api('/api/payment-settings', { method: 'POST', body: JSON.stringify({ adminEmail, notifyEmail }) });
      setAdminEmail(result.settings.adminEmail); setNotifyEmail(Boolean(result.settings.notifyEmail)); setSettingsSaved(true);
      window.setTimeout(() => setSettingsSaved(false), 2500);
    } catch (e) { setError(e instanceof Error ? e.message : '邮箱通知设置保存失败'); }
  };

  return <div className="space-y-6">
    <section className={`${panel} p-5 flex flex-wrap items-center justify-between gap-3`}>
      <div><h2 className="text-xl font-bold flex items-center gap-2"><ShoppingBag className="text-sky-500"/>商品专区与价格</h2><p className="mt-1 text-xs text-slate-500">商品浏览公开可见；支付订单要求注册账户，金额由服务端以 D1 已发布商品目录核验。</p></div>
      {isAdmin && <button onClick={() => setEditing({ name: '', description: '', price: 99, images: [], category: '数字化产品', stock: 50, showcaseId: 'showcase-main' })} className="rounded-xl bg-sky-500 px-4 py-2 text-xs text-white"><Plus className="mr-1 inline h-4 w-4"/>新增商品</button>}
    </section>

    {error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}<button aria-label="关闭提示" className="float-right" onClick={() => setError('')}><X className="h-4 w-4"/></button></div>}

    <nav aria-label="商品分类" className="flex gap-2 overflow-x-auto">
      {[['all', '全部商品'], ['showcase-main', '主打数字产品'], ['showcase-hardware', '限定周边'], ['showcase-service', '定制服务']].map(([id, label]) => <button key={id} onClick={() => setShowcase(id)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs ${showcase === id ? 'bg-sky-500 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{label}</button>)}
    </nav>

    {currentUser && <section className={`${panel} space-y-3 p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{isAdmin ? '订单管理' : '我的订单'}（{orders.length}）</h3>{isAdmin && <input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索订单号、客户" className="rounded-xl border bg-transparent p-2 text-sm dark:border-slate-700"/>}</div>
      {filteredOrders.map(order => <article key={order.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 py-3 text-sm dark:border-slate-800">
        <div className="min-w-[220px] flex-1"><b>{order.productName || order.productId} × {order.quantity}</b><div className="mt-1 break-all text-xs text-slate-500">{order.id} · {new Date(order.createdAt).toLocaleString()}</div><div className="mt-1 text-xs text-slate-500">{order.customerName}　{order.customerPhone}　{order.customerEmail}</div>{order.shippingAddress && <div className="text-xs text-slate-500">{order.shippingAddress}</div>}{order.trackingNumber && <div className="text-xs text-sky-600">{order.carrier || '物流'}：{order.trackingNumber}</div>}</div>
        <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{money(order)} · {statusLabels[order.status] || order.status}</span>
          {isAdmin && order.status === 'paid' && <><input value={tracking[order.id] || ''} onChange={event => setTracking(value => ({ ...value, [order.id]: event.target.value }))} placeholder="物流单号" className="w-28 rounded border bg-transparent p-1 text-xs dark:border-slate-700"/><button onClick={() => void orderAction(order.id, 'ship', { trackingNumber: tracking[order.id] || '' })} className="rounded bg-sky-500 px-2 py-1 text-xs text-white">确认发货 <Truck className="inline h-3 w-3"/></button><button onClick={() => void orderAction(order.id, 'refund', { reason: '管理员发起退款' })} className="rounded bg-rose-500 px-2 py-1 text-xs text-white">原路退款</button></>}
          {!isAdmin && order.status === 'pending' && <button onClick={() => void orderAction(order.id, 'cancel')} className="text-xs text-rose-600">取消订单</button>}
          {!isAdmin && order.status === 'failed' && <button onClick={() => { const product = products.find(item => item.id === order.productId); if (product) { setCheckout(product); setQuantity(order.quantity || 1); setError(''); } }} className="text-xs text-sky-600">重新下单</button>}
          {!isAdmin && order.paymentProvider === 'paypal' && order.status === 'pending' && <button onClick={() => void orderAction(order.id, 'capture')} className="text-xs text-sky-600">继续 PayPal 支付</button>}
        </div>
      </article>)}
      {!filteredOrders.length && <p className="text-xs text-slate-500">暂无订单。订单和付款状态保存在站点数据库，不通过浏览器本地缓存同步。</p>}
      {isAdmin && <form onSubmit={savePaymentNoticeSettings} className="grid gap-2 border-t border-slate-200 pt-3 dark:border-slate-800 sm:grid-cols-[1fr_auto_auto] sm:items-center">
        <label className="text-xs text-slate-600 dark:text-slate-300">支付成功邮件接收地址<input type="email" value={adminEmail} onChange={event => setAdminEmail(event.target.value)} placeholder="管理员邮箱（可选）" className="mt-1 w-full rounded-xl border bg-transparent p-2 text-sm dark:border-slate-700"/></label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={notifyEmail} onChange={event => setNotifyEmail(event.target.checked)}/>同时发邮件</label>
        <button className="rounded-xl bg-slate-800 px-3 py-2 text-xs text-white dark:bg-slate-200 dark:text-slate-900">{settingsSaved ? '已保存' : '保存通知设置'}</button>
      </form>}
      {isAdmin && <p className="text-[11px] text-slate-500">支付到账同时会生成管理员站内消息。邮件接收需要正确配置服务端发信环境变量；此处只保存接收邮箱，不保存支付密钥。</p>}
    </section>}

    <div className={`grid gap-6 ${deviceMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
      {filteredProducts.map(product => <article key={product.id} className={`${panel} flex flex-col overflow-hidden`}>
        <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800"><SafeImage src={product.images[0] || ''} alt={product.name} className="h-full w-full object-cover"/>{isAdmin && <div className="absolute right-2 top-2 flex gap-2"><button aria-label="编辑商品" onClick={() => setEditing({ ...product })} className="rounded bg-black/70 p-2 text-white"><Edit3 className="h-4 w-4"/></button><button aria-label="删除商品" onClick={() => { if (window.confirm('确认删除此商品展示？已创建订单不会被删除。')) setProducts(items => items.filter(item => item.id !== product.id)); }} className="rounded bg-rose-600 p-2 text-white"><Trash2 className="h-4 w-4"/></button></div>}</div>
        <div className="flex-1 p-5"><span className="text-xs text-sky-500">{product.category}</span><h3 className="mt-1 font-bold">{product.name}</h3><p className="mt-2 line-clamp-3 text-xs text-slate-500">{product.description}</p></div>
        <div className="flex items-center justify-between border-t border-slate-200 p-5 dark:border-slate-800"><div><span className="block text-xs text-slate-400">库存 {product.stock || 50}</span><b className="text-xl text-sky-500">¥{Number(product.price).toFixed(2)}</b></div><button onClick={() => { setCheckout(product); setQuantity(1); setCouponCode(''); setError(''); }} className="rounded-xl bg-sky-500 px-4 py-2 text-xs text-white">立即选购</button></div>
      </article>)}
    </div>

    <section className={`${panel} p-4`}>
      <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-bold"><MessageCircle className="text-sky-500"/>站内客服对话</h3><button onClick={() => setChatOpen(open => !open)} className="text-xs text-sky-600">{chatOpen ? '收起' : '打开对话'}</button></div>
      {!currentUser && <p className="mt-2 text-xs text-slate-500">登录注册账户后可与站长建立持久对话；访客留言不会显示为已发送。</p>}
      {chatOpen && <div className="mt-3">
        {isAdmin && <div className="mb-3 flex flex-wrap gap-2">{conversations.map(conversation => <div key={conversation.id} className={`flex max-w-full items-start gap-2 rounded-xl p-2 text-xs ${conversationId === conversation.id ? 'bg-sky-500 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}><button onClick={() => setConversationId(conversation.id)} className="min-w-0 text-left"><span className="block font-semibold">{conversation.username || conversation.userName || conversation.id}{(conversation.unread || conversation.unreadCount) ? ` · 未读 ${conversation.unread || conversation.unreadCount}` : ''}</span><span className="block max-w-[240px] truncate">{conversation.lastMessage || '打开对话'}</span></button><button type="button" aria-label={`删除与${conversation.username || '用户'}的对话`} title="删除对话及消息" onClick={async () => { if (!window.confirm('确定永久删除这段客服对话及其全部消息吗？')) return; try { await api(`/api/chat/conversations/${encodeURIComponent(conversation.id)}`, { method: 'DELETE' }); if (conversationId === conversation.id) { setConversationId(''); setMessages([]); } await loadConversations(); } catch (e) { setError(e instanceof Error ? e.message : '删除对话失败'); } }} className="rounded p-1 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/40"><Trash2 className="h-3.5 w-3.5"/></button></div>)}</div>}
        {currentUser && <><div className="max-h-72 space-y-2 overflow-auto border-y border-slate-200 py-3 dark:border-slate-800">{messages.map(message => <div key={message.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${message.senderRole === 'admin' ? 'bg-slate-100 dark:bg-slate-800' : 'ml-auto bg-sky-50 dark:bg-sky-950/50'}`}><div className="mb-1 text-[10px] text-slate-500">{message.senderName} · {new Date(message.createdAt).toLocaleString()}</div>{message.message}</div>)}{!messages.length && <p className="text-xs text-slate-500">{isAdmin ? '选择一位用户打开对话；新消息会显示在页眉通知灯。' : '你好，请留下问题，站长回复后页眉会显示提醒。'}</p>}</div><form onSubmit={sendMessage} className="mt-3 flex gap-2"><input value={messageText} onChange={event => setMessageText(event.target.value)} placeholder="输入消息…" maxLength={4000} className="min-w-0 flex-1 rounded-xl border bg-transparent px-3 py-2 text-sm dark:border-slate-700"/><button className="rounded-xl bg-sky-500 p-2 text-white" aria-label="发送消息"><Send className="h-4 w-4"/></button></form></>}
      </div>}
    </section>

    {checkout && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><form onSubmit={submitOrder} className={`${panel} max-h-[90vh] w-full max-w-lg space-y-3 overflow-auto p-6`}>
      <div className="flex items-center justify-between"><h3 className="font-bold">订单信息：{checkout.name}</h3><button type="button" onClick={() => setCheckout(null)} aria-label="关闭"><X/></button></div>
      {!currentUser && <p className="text-sm text-rose-600">请先登录注册账户。为了保存用户订单，游客不能付款。</p>}
      <p className="text-sm">商品展示价：¥{Number(checkout.price).toFixed(2)} / 件。最终金额由服务端根据 D1 已发布商品目录核验。</p>
      <label className="block text-xs">购买数量<input type="number" min={1} max={Math.max(1, Number(checkout.stock || 50))} value={quantity} onChange={event => setQuantity(Math.max(1, Math.min(Number(checkout.stock || 50), Number(event.target.value) || 1)))} className="mt-1 w-full rounded border bg-transparent p-2 dark:border-slate-700"/></label>
      <div className="grid grid-cols-2 gap-2">{([['alipay','支付宝'],['wechat','微信支付'],['stripe','Stripe'],['paypal','PayPal']] as const).map(([id, label]) => <button type="button" key={id} onClick={() => setProvider(id)} className={`rounded-xl border p-2 text-sm ${provider === id ? 'border-sky-500 text-sky-600' : 'border-slate-200 dark:border-slate-700'}`}>{label}</button>)}</div>
      <input required value={customerName} onChange={event => setCustomerName(event.target.value)} placeholder="联系人姓名" className="w-full rounded-xl border bg-transparent p-2 text-sm dark:border-slate-700"/>
      <input required type="tel" value={customerPhone} onChange={event => setCustomerPhone(event.target.value)} placeholder="联系电话" className="w-full rounded-xl border bg-transparent p-2 text-sm dark:border-slate-700"/>
      <input required type="email" value={customerEmail} onChange={event => setCustomerEmail(event.target.value)} placeholder="联系邮箱" className="w-full rounded-xl border bg-transparent p-2 text-sm dark:border-slate-700"/>
      <textarea required rows={2} value={shippingAddress} onChange={event => setShippingAddress(event.target.value)} placeholder="收货/服务联系地址" className="w-full rounded-xl border bg-transparent p-2 text-sm dark:border-slate-700"/>
      <input value={couponCode} onChange={event => setCouponCode(event.target.value)} placeholder="优惠码（如有）—服务端核验" className="w-full rounded-xl border bg-transparent p-2 text-sm dark:border-slate-700"/>
      <p className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">付款跳转或二维码展示不代表订单已付款。真正到账以本站服务端验签并处理支付平台异步通知为准。</p>
      <button disabled={busy || !currentUser} className="w-full rounded-xl bg-sky-500 p-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? '正在创建订单…' : '创建订单并继续支付'}</button>
    </form></div>}

    {payment && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className={`${panel} w-full max-w-sm space-y-3 p-6`}>
      <div className="flex items-center justify-between"><h3 className="font-bold">订单 {payment.orderId}</h3><button onClick={() => setPayment(null)} aria-label="关闭支付信息"><X/></button></div>
      {payment.order && <p className="text-sm">当前状态：<b>{statusLabels[payment.order.status] || payment.order.status}</b> · {money(payment.order)}</p>}
      <p className="text-xs text-amber-700 dark:text-amber-300">二维码/跳转成功不代表已到账；请等待服务端验签异步回调更新订单状态。</p>
      {payment.payment?.redirectUrl && <a href={payment.payment.redirectUrl} className="block rounded-xl bg-sky-500 p-3 text-center text-sm text-white">前往支付平台</a>}
      {payment.payment?.qrCode && <div className="mx-auto w-fit rounded-xl bg-white p-3"><QRCodeSVG value={payment.payment.qrCode} size={224} includeMargin/></div>}
      {payment.payment?.qrCode && <p className="break-all text-center text-[10px] text-slate-500">二维码由本站本地生成，不会将支付码发送给第三方。</p>}
      <button onClick={() => { void loadOrders(); if (payment.orderId) void api(`/api/orders/${encodeURIComponent(payment.orderId)}`).then(result => setPayment(current => current ? { ...current, order: result.order } : current)).catch(() => {}); }} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">刷新服务端订单状态</button>
    </div></div>}

    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><form onSubmit={saveProduct} className={`${panel} max-h-[90vh] w-full max-w-lg space-y-3 overflow-auto p-6`}>
      <h3 className="font-bold">{editing.id ? '编辑商品' : '新增商品'}</h3>
      <input required value={editing.name || ''} onChange={event => setEditing(value => value ? { ...value, name: event.target.value } : value)} placeholder="商品名称" className="w-full rounded border bg-transparent p-2 text-sm dark:border-slate-700"/>
      <input required type="number" min="0.01" step="0.01" value={editing.price || ''} onChange={event => setEditing(value => value ? { ...value, price: Number(event.target.value) } : value)} placeholder="价格（元）" className="w-full rounded border bg-transparent p-2 text-sm dark:border-slate-700"/>
      <input type="number" min="0" value={editing.stock ?? 50} onChange={event => setEditing(value => value ? { ...value, stock: Number(event.target.value) } : value)} placeholder="库存" className="w-full rounded border bg-transparent p-2 text-sm dark:border-slate-700"/>
      <select value={editing.showcaseId || 'showcase-main'} onChange={event => setEditing(value => value ? { ...value, showcaseId: event.target.value } : value)} className="w-full rounded border bg-transparent p-2 text-sm dark:border-slate-700"><option value="showcase-main">主打数字产品</option><option value="showcase-hardware">限定周边</option><option value="showcase-service">定制服务</option></select>
      <textarea value={editing.description || ''} onChange={event => setEditing(value => value ? { ...value, description: event.target.value } : value)} placeholder="商品说明" rows={3} className="w-full rounded border bg-transparent p-2 text-sm dark:border-slate-700"/>
      <div className="flex flex-wrap gap-2">{(editing.images || []).map((image, index) => <div key={`${image}-${index}`} className="relative"><SafeImage src={image} alt="商品图片" className="h-16 w-20 rounded object-cover"/><button type="button" onClick={() => setEditing(value => value ? { ...value, images: value.images?.filter((_, i) => i !== index) } : value)} className="absolute -right-2 -top-2 rounded-full bg-rose-500 p-1 text-white"><X className="h-3 w-3"/></button></div>)}<label className="flex cursor-pointer items-center rounded-xl border px-3 text-xs dark:border-slate-700">上传图片<input type="file" accept="image/*" multiple className="hidden" onChange={async event => { const files = Array.from(event.target.files || []); for (const file of files) { try { const result = await uploadFile(file); setEditing(value => value ? { ...value, images: [...(value.images || []), result.url] } : value); } catch (e) { setError(e instanceof Error ? e.message : '图片上传失败'); } } event.target.value = ''; }}/></label></div>
      <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-sm">取消</button><button className="rounded-xl bg-sky-500 px-4 py-2 text-sm text-white">保存商品</button></div>
    </form></div>}
  </div>;
};
