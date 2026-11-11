import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Order, OrderStatus, ChatMessage } from '../../types';
import { SafeImage } from '../common/SafeImage';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Edit3,
  CreditCard,
  MessageCircle,
  X,
  Send,
  CheckCircle,
  Truck,
  ShieldCheck,
  Search,
  Check,
} from 'lucide-react';

export const ShopSection: React.FC = () => {
  const {
    products,
    setProducts,
    orders,
    setOrders,
    chatMessages,
    setChatMessages,
    currentUser,
    paymentSettings,
    updatePaymentSettings,
    uploadFile,
    systemSettings,
    deviceMode,
  } = useApp();

  const [activeShowcase, setActiveShowcase] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Chat window state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Currency selection: CNY (¥), USD ($), EUR (€)
  const [currency, setCurrency] = useState<'CNY' | 'USD' | 'EUR'>('CNY');
  const currencyRate: Record<'CNY' | 'USD' | 'EUR', { symbol: string; rate: number }> = {
    CNY: { symbol: '¥', rate: 1 },
    USD: { symbol: '$', rate: 0.14 },
    EUR: { symbol: '€', rate: 0.13 },
  };

  // Checkout modal
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<
    'paypal' | 'worldfirst' | 'wechat' | 'alipay' | 'stripe' | 'usdt' | 'unionpay'
  >('wechat');
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // Admin view tabs
  const [adminView, setAdminView] = useState<'showcase' | 'orders' | 'gateways'>('showcase');
  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>('all');
  const [orderSearch, setOrderSearch] = useState('');

  // Product editor modal state
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 99.0,
    images: [],
    category: '数字化产品',
    stock: 50,
    showcaseId: 'showcase-main',
  });

  // Tracking edit state for admin
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [carrierInput, setCarrierInput] = useState('');

  const showcases = [
    { id: 'all', name: '全系列展区' },
    { id: 'showcase-main', name: '主打数字化展区' },
    { id: 'showcase-hardware', name: '限定周边展区' },
    { id: 'showcase-service', name: '定制服务展区' },
  ];

  const filteredProducts = products.filter(p => {
    if (activeShowcase === 'all') return true;
    return p.showcaseId === activeShowcase;
  });

  const filteredOrders = orders.filter(o => {
    const matchFilter = orderFilter === 'all' || o.status === orderFilter;
    const matchSearch =
      !orderSearch ||
      o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerPhone.includes(orderSearch) ||
      o.customerEmail.toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.trackingNumber && o.trackingNumber.toLowerCase().includes(orderSearch.toLowerCase()));
    return matchFilter && matchSearch;
  });

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const res = await uploadFile(files[i]);
      setEditingProduct(prev => ({
        ...prev,
        images: [...(prev.images || []), res.url],
      }));
    }
  };

  const handleRemoveImage = (index: number) => {
    setEditingProduct(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, idx) => idx !== index),
    }));
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct.name || !editingProduct.price) return;

    const defaultImg =
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80';
    const imgs =
      editingProduct.images && editingProduct.images.length > 0
        ? editingProduct.images
        : [defaultImg];

    if (editingProduct.id) {
      setProducts(prev =>
        prev.map(p =>
          p.id === editingProduct.id
            ? ({ ...p, ...editingProduct, images: imgs, updatedAt: Date.now() } as Product)
            : p
        )
      );
    } else {
      const newP: Product = {
        id: `prod-${Date.now()}`,
        name: editingProduct.name,
        description: editingProduct.description || '',
        price: Number(editingProduct.price),
        images: imgs,
        category: editingProduct.category || '默认',
        stock: Number(editingProduct.stock || 10),
        showcaseId: editingProduct.showcaseId || 'showcase-main',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setProducts(prev => [newP, ...prev]);
    }

    setIsEditingProduct(false);
  };

  const handleDeleteProduct = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确认删除此商品展示吗？')) {
      setProducts(prev => prev.filter(p => p.id !== id));
      if (selectedProduct?.id === id) setSelectedProduct(null);
    }
  };

  const handleApplyCoupon = () => {
    if (couponCode.toUpperCase() === 'FOX3' || couponCode.toUpperCase() === 'WELCOME') {
      setDiscountPercent(15);
      alert('优惠券兑换成功！立享 85 折专享特惠。');
    } else {
      alert('无效或已过期的优惠码！');
    }
  };

  // Submit checkout order
  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutProduct) return;

    if (!customerAddress || !customerPhone || !customerEmail) {
      alert('请完整填写联系地址、联系电话与联系邮箱！');
      return;
    }

    const baseTotal = checkoutProduct.price * orderQuantity;
    const finalTotal = discountPercent > 0 ? baseTotal * ((100 - discountPercent) / 100) : baseTotal;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      productId: checkoutProduct.id,
      productName: checkoutProduct.name,
      productImage: checkoutProduct.images[0],
      quantity: orderQuantity,
      totalPrice: finalTotal,
      customerName: customerName || '客户',
      customerEmail,
      customerPhone,
      customerAddress,
      paymentMethod,
      status: 'paid',
      createdAt: Date.now(),
    };

    // Deduct stock if valid
    setProducts(prev =>
      prev.map(p =>
        p.id === checkoutProduct.id
          ? { ...p, stock: Math.max(0, (p.stock || 10) - orderQuantity) }
          : p
      )
    );

    setOrders(prev => [newOrder, ...prev]);
    setOrderSuccess(`订单创建成功！编号: ${newOrder.id}。我们已向 ${customerEmail} 发送确认函。`);
    setTimeout(() => {
      setCheckoutProduct(null);
      setOrderSuccess(null);
      setDiscountPercent(0);
      setCouponCode('');
    }, 2000);
  };

  // Update order status & tracking
  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status, updatedAt: Date.now() } : o))
    );
  };

  const handleSaveTracking = (orderId: string) => {
    setOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? {
              ...o,
              trackingNumber: trackingNumberInput,
              carrier: carrierInput || '顺丰速运',
              status: o.status === 'paid' ? 'shipped' : o.status,
              updatedAt: Date.now(),
            }
          : o
      )
    );
    setEditingOrderId(null);
  };

  // Chat message send
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      sender: currentUser?.role === 'admin' ? 'admin' : 'customer',
      userName: currentUser ? currentUser.username : '在线访客',
      userEmail: currentUser?.email,
      message: chatInput.trim(),
      createdAt: Date.now(),
    };

    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`p-5 rounded-3xl border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        systemSettings.transparentCards
          ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
      }`}>
        <div>
          <h2 className="text-xl font-bold font-serif-sc text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-sky-500" />
            <span>商品专区 & 定制展示台</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            多展区管理、多图轮播、全通道支付 (PayPal/万里汇/微信/支付宝/Stripe/USDT/银联)、订单全程物流追踪与在线客服对话
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {currentUser?.role === 'admin' && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setAdminView('showcase')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  adminView === 'showcase' ? 'bg-white dark:bg-slate-700 shadow-xs text-sky-600' : 'text-slate-500'
                }`}
              >
                商品展厅
              </button>
              <button
                onClick={() => setAdminView('orders')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  adminView === 'orders' ? 'bg-white dark:bg-slate-700 shadow-xs text-sky-600' : 'text-slate-500'
                }`}
              >
                订单中心 ({orders.length})
              </button>
              <button
                onClick={() => setAdminView('gateways')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  adminView === 'gateways' ? 'bg-white dark:bg-slate-700 shadow-xs text-sky-600' : 'text-slate-500'
                }`}
              >
                收费接口设置 (仅管理员)
              </button>
            </div>
          )}

          {currentUser?.role === 'admin' && adminView === 'showcase' && (
            <button
              onClick={() => {
                setEditingProduct({
                  name: '',
                  description: '',
                  price: 99.0,
                  images: [],
                  category: '数字化产品',
                  stock: 50,
                  showcaseId: activeShowcase === 'all' ? 'showcase-main' : activeShowcase,
                });
                setIsEditingProduct(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-xl shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>新增展示商品</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW: Admin Payment Gateways Settings (Visible ONLY to Admin) */}
      {currentUser?.role === 'admin' && adminView === 'gateways' && (
        <div className={`p-6 rounded-3xl border shadow-sm space-y-6 animate-in fade-in ${
          systemSettings.transparentCards
            ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-500" />
              <span>全通道支付网关接口预留与配置说明 (仅管理员可见)</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              前台客户下单时将唤起对应支付凭据或预留结算网关
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* PayPal */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" /> PayPal 国际支付
                </span>
                <input
                  type="checkbox"
                  checked={paymentSettings.paypal.enabled}
                  onChange={e =>
                    updatePaymentSettings({
                      paypal: { ...paymentSettings.paypal, enabled: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-sky-500 rounded"
                />
              </div>
              <input
                type="text"
                value={paymentSettings.paypal.clientId}
                onChange={e =>
                  updatePaymentSettings({
                    paypal: { ...paymentSettings.paypal, clientId: e.target.value },
                  })
                }
                placeholder="PayPal Client ID"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
              />
              <input
                type="password"
                value={paymentSettings.paypal.secret}
                onChange={e =>
                  updatePaymentSettings({
                    paypal: { ...paymentSettings.paypal, secret: e.target.value },
                  })
                }
                placeholder="PayPal Client Secret"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
              />
            </div>

            {/* WorldFirst */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" /> 万里汇 (WorldFirst)
                </span>
                <input
                  type="checkbox"
                  checked={paymentSettings.worldfirst.enabled}
                  onChange={e =>
                    updatePaymentSettings({
                      worldfirst: { ...paymentSettings.worldfirst, enabled: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-sky-500 rounded"
                />
              </div>
              <input
                type="text"
                value={paymentSettings.worldfirst.partnerId}
                onChange={e =>
                  updatePaymentSettings({
                    worldfirst: { ...paymentSettings.worldfirst, partnerId: e.target.value },
                  })
                }
                placeholder="Partner ID / 商户编号"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
              />
              <input
                type="password"
                value={paymentSettings.worldfirst.privateKey}
                onChange={e =>
                  updatePaymentSettings({
                    worldfirst: { ...paymentSettings.worldfirst, privateKey: e.target.value },
                  })
                }
                placeholder="商户 RSA 签名私钥"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
              />
            </div>

            {/* WeChat Pay */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-green-600 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" /> 微信支付 (Native/JSAPI)
                </span>
                <input
                  type="checkbox"
                  checked={paymentSettings.wechatPay.enabled}
                  onChange={e =>
                    updatePaymentSettings({
                      wechatPay: { ...paymentSettings.wechatPay, enabled: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-sky-500 rounded"
                />
              </div>
              <input
                type="text"
                value={paymentSettings.wechatPay.appId}
                onChange={e =>
                  updatePaymentSettings({
                    wechatPay: { ...paymentSettings.wechatPay, appId: e.target.value },
                  })
                }
                placeholder="微信 AppID"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
              />
              <input
                type="text"
                value={paymentSettings.wechatPay.mchId}
                onChange={e =>
                  updatePaymentSettings({
                    wechatPay: { ...paymentSettings.wechatPay, mchId: e.target.value },
                  })
                }
                placeholder="微信商户号 MCHID"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
              />
            </div>

            {/* Alipay */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-600 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" /> 支付宝 (当面付/手机网页)
                </span>
                <input
                  type="checkbox"
                  checked={paymentSettings.alipay.enabled}
                  onChange={e =>
                    updatePaymentSettings({
                      alipay: { ...paymentSettings.alipay, enabled: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-sky-500 rounded"
                />
              </div>
              <input
                type="text"
                value={paymentSettings.alipay.appId}
                onChange={e =>
                  updatePaymentSettings({
                    alipay: { ...paymentSettings.alipay, appId: e.target.value },
                  })
                }
                placeholder="支付宝 AppID"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
              />
              <input
                type="password"
                value={paymentSettings.alipay.privateKey}
                onChange={e =>
                  updatePaymentSettings({
                    alipay: { ...paymentSettings.alipay, privateKey: e.target.value },
                  })
                }
                placeholder="应用私钥 Private Key"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
              />
            </div>

            {/* Stripe */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" /> Stripe 信用卡清算
                </span>
                <input
                  type="checkbox"
                  checked={paymentSettings.stripe?.enabled}
                  onChange={e =>
                    updatePaymentSettings({
                      stripe: { ...(paymentSettings.stripe || {} as any), enabled: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-sky-500 rounded"
                />
              </div>
              <input
                type="text"
                value={paymentSettings.stripe?.publishableKey || ''}
                onChange={e =>
                  updatePaymentSettings({
                    stripe: { ...(paymentSettings.stripe || {} as any), publishableKey: e.target.value },
                  })
                }
                placeholder="Stripe Publishable Key"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
              />
              <input
                type="password"
                value={paymentSettings.stripe?.secretKey || ''}
                onChange={e =>
                  updatePaymentSettings({
                    stripe: { ...(paymentSettings.stripe || {} as any), secretKey: e.target.value },
                  })
                }
                placeholder="Stripe Secret Key"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
              />
            </div>

            {/* USDT Crypto */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-600 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" /> USDT 加密货币收款
                </span>
                <input
                  type="checkbox"
                  checked={paymentSettings.usdt?.enabled}
                  onChange={e =>
                    updatePaymentSettings({
                      usdt: { ...(paymentSettings.usdt || {} as any), enabled: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-sky-500 rounded"
                />
              </div>
              <select
                value={paymentSettings.usdt?.network || 'TRC20'}
                onChange={e =>
                  updatePaymentSettings({
                    usdt: { ...(paymentSettings.usdt || {} as any), network: e.target.value as any },
                  })
                }
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="TRC20">TRC20 网络 (推荐)</option>
                <option value="ERC20">ERC20 网络</option>
              </select>
              <input
                type="text"
                value={paymentSettings.usdt?.walletAddress || ''}
                onChange={e =>
                  updatePaymentSettings({
                    usdt: { ...(paymentSettings.usdt || {} as any), walletAddress: e.target.value },
                  })
                }
                placeholder="USDT 钱包收款地址"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Admin Order Management (Paid vs Unpaid vs Shipped) */}
      {currentUser?.role === 'admin' && adminView === 'orders' && (
        <div className={`rounded-3xl border shadow-sm overflow-hidden animate-in fade-in ${
          systemSettings.transparentCards
            ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
        }`}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                订单列表 ({filteredOrders.length})
              </span>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs overflow-x-auto">
                <button
                  onClick={() => setOrderFilter('all')}
                  className={`px-2.5 py-1 rounded ${orderFilter === 'all' ? 'bg-white dark:bg-slate-700 font-semibold shadow-xs' : ''}`}
                >
                  全部
                </button>
                <button
                  onClick={() => setOrderFilter('paid')}
                  className={`px-2.5 py-1 rounded ${orderFilter === 'paid' ? 'bg-emerald-500 text-white font-semibold' : ''}`}
                >
                  已支付
                </button>
                <button
                  onClick={() => setOrderFilter('shipped')}
                  className={`px-2.5 py-1 rounded ${orderFilter === 'shipped' ? 'bg-sky-500 text-white font-semibold' : ''}`}
                >
                  已发货
                </button>
                <button
                  onClick={() => setOrderFilter('unpaid')}
                  className={`px-2.5 py-1 rounded ${orderFilter === 'unpaid' ? 'bg-amber-500 text-white font-semibold' : ''}`}
                >
                  待支付
                </button>
                <button
                  onClick={() => setOrderFilter('refunded')}
                  className={`px-2.5 py-1 rounded ${orderFilter === 'refunded' ? 'bg-rose-500 text-white font-semibold' : ''}`}
                >
                  已退款
                </button>
              </div>
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索订单号/买家/单号..."
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">暂无订单数据</div>
            ) : (
              filteredOrders.map(order => (
                <div key={order.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                      <SafeImage src={order.productImage} alt={order.productName} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {order.productName}
                        </span>
                        <span className="text-xs text-sky-500 font-bold">x{order.quantity}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                            order.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : order.status === 'shipped'
                              ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400'
                              : order.status === 'completed'
                              ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400'
                              : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}
                        >
                          {order.status}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          ({order.paymentMethod})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                        <p>买家: {order.customerName} ({order.customerPhone} / {order.customerEmail})</p>
                        <p className="truncate max-w-md">地址: {order.customerAddress}</p>
                        {order.trackingNumber && (
                          <p className="text-sky-600 dark:text-sky-400 flex items-center gap-1 font-mono">
                            <Truck className="w-3 h-3" /> {order.carrier || '顺丰速运'}: {order.trackingNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0 self-end md:self-center">
                    <div className="text-right">
                      <span className="text-base font-bold text-sky-500">
                        ¥{order.totalPrice.toFixed(2)}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-mono">
                        {new Date(order.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>

                    {/* Order Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {editingOrderId === order.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="物流单号"
                            value={trackingNumberInput}
                            onChange={e => setTrackingNumberInput(e.target.value)}
                            className="w-24 px-2 py-0.5 text-[10px] border rounded bg-white dark:bg-slate-800"
                          />
                          <button
                            onClick={() => handleSaveTracking(order.id)}
                            className="p-1 bg-emerald-500 text-white rounded text-[10px]"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingOrderId(order.id);
                            setTrackingNumberInput(order.trackingNumber || '');
                            setCarrierInput(order.carrier || '顺丰速运');
                          }}
                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] rounded hover:text-sky-500"
                        >
                          填单号
                        </button>
                      )}

                      <select
                        value={order.status}
                        onChange={e => handleUpdateOrderStatus(order.id, e.target.value as any)}
                        className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] rounded"
                      >
                        <option value="unpaid">设为未支付</option>
                        <option value="paid">设为已支付</option>
                        <option value="shipped">设为已发货</option>
                        <option value="completed">设为已完成</option>
                        <option value="refunded">设为已退款</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW: Main Showcase Grid (For Visitors and Admin) */}
      {adminView === 'showcase' && (
        <>
          {/* Multiple Showcase Switcher */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {showcases.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveShowcase(s.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  activeShowcase === s.id
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className={`grid gap-6 ${deviceMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className={`group rounded-3xl overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between ${
                  systemSettings.transparentCards
                    ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <SafeImage
                      src={product.images[0] || ''}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {product.images.length > 1 && (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] rounded-lg">
                        共 {product.images.length} 张图
                      </span>
                    )}

                    <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-[11px] font-medium rounded-lg">
                      {product.category}
                    </span>

                    {currentUser?.role === 'admin' && (
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setEditingProduct(product);
                            setIsEditingProduct(true);
                          }}
                          title="编辑商品与多图"
                          className="p-2 bg-black/75 hover:bg-black text-white rounded-xl shadow transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={e => handleDeleteProduct(product.id, e)}
                          title="删除商品"
                          className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="text-base font-bold font-serif-sc text-slate-800 dark:text-slate-100 line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400">库存 {product.stock || 50} 件</span>
                    <div className="text-xl font-black text-sky-500 font-mono">
                      ¥{product.price.toFixed(2)}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setCheckoutProduct(product);
                      setOrderQuantity(1);
                      setDiscountPercent(0);
                      setCouponCode('');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-xl shadow-md transition"
                  >
                    <span>立即选购</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 z-40 p-4 bg-sky-500 hover:bg-sky-600 text-white rounded-full shadow-2xl hover:scale-105 transition flex items-center justify-center gap-2 group"
        title="打开商品展台在线客服"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="hidden sm:inline text-xs font-bold pr-1">商品展台客服</span>
      </button>

      {/* Chat Dialog Widget */}
      {isChatOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col h-[460px] overflow-hidden animate-in fade-in slide-in-from-bottom-5">
          <div className="p-3.5 bg-sky-500 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <div>
                <h4 className="text-xs font-bold">商品展台咨询 & 客服对话</h4>
                <span className="text-[10px] text-white/80">管理员站内实时对话系统</span>
              </div>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="p-1 hover:bg-white/20 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {chatMessages.map(msg => {
              const isAdmin = msg.sender === 'admin';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                >
                  <span className="text-[10px] text-slate-400 mb-0.5">
                    {msg.userName} {isAdmin && ' (官方客服)'}
                  </span>
                  <div
                    className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                      isAdmin
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs'
                        : 'bg-sky-500 text-white rounded-tr-xs'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="输入咨询内容或留言..."
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
            />
            <button
              type="submit"
              className="p-2 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Checkout Order Form Modal */}
      {checkoutProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold font-serif-sc text-slate-900 dark:text-slate-100">
                提交订单并选择数量
              </h3>
              <button
                onClick={() => setCheckoutProduct(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {orderSuccess ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {orderSuccess}
                </h4>
              </div>
            ) : (
              <form onSubmit={handleSubmitOrder} className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                    <SafeImage
                      src={checkoutProduct.images[0] || ''}
                      alt={checkoutProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {checkoutProduct.name}
                    </h4>
                    <span className="text-sm font-black text-sky-500 font-mono">
                      单价: ¥{checkoutProduct.price.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    选购数量
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-bold"
                    >
                      -
                    </button>
                    <span className="font-bold text-sm">{orderQuantity}</span>
                    <button
                      type="button"
                      onClick={() => setOrderQuantity(Math.min(checkoutProduct.stock || 50, orderQuantity + 1))}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-bold"
                    >
                      +
                    </button>
                    <span className="text-xs text-slate-400 ml-auto">
                      小计: <b className="text-sky-500 text-base">¥{(checkoutProduct.price * orderQuantity * ((100 - discountPercent) / 100)).toFixed(2)}</b>
                    </span>
                  </div>
                </div>

                {/* Coupon Code Section */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    优惠券代码 (输入 FOX3 享 85 折)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value)}
                      placeholder="优惠码 (如 FOX3)"
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-mono uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs rounded-xl font-medium"
                    >
                      应用
                    </button>
                  </div>
                  {discountPercent > 0 && (
                    <span className="text-[11px] text-emerald-500 font-medium block mt-1">
                      已享受 {discountPercent}% 折扣减免
                    </span>
                  )}
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      联系人姓名 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="您的姓名"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        联系电话 <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        placeholder="138xxxxxxxx"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        联系邮箱 <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={e => setCustomerEmail(e.target.value)}
                        placeholder="yourname@domain.com"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      收件地址 / 寄送地址 <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={customerAddress}
                      onChange={e => setCustomerAddress(e.target.value)}
                      placeholder="省市区街道门牌号"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                      required
                    />
                  </div>
                </div>

                {/* Extended Payment Gateway Options */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    选择支付通道
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('wechat')}
                      className={`p-2 rounded-xl border flex items-center justify-center gap-1 font-medium ${
                        paymentMethod === 'wechat'
                          ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      <span>微信支付</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('alipay')}
                      className={`p-2 rounded-xl border flex items-center justify-center gap-1 font-medium ${
                        paymentMethod === 'alipay'
                          ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      <span>支付宝</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('paypal')}
                      className={`p-2 rounded-xl border flex items-center justify-center gap-1 font-medium ${
                        paymentMethod === 'paypal'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      <span>PayPal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('worldfirst')}
                      className={`p-2 rounded-xl border flex items-center justify-center gap-1 font-medium ${
                        paymentMethod === 'worldfirst'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      <span>万里汇</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('stripe')}
                      className={`p-2 rounded-xl border flex items-center justify-center gap-1 font-medium ${
                        paymentMethod === 'stripe'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      <span>Stripe</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('usdt')}
                      className={`p-2 rounded-xl border flex items-center justify-center gap-1 font-medium ${
                        paymentMethod === 'usdt'
                          ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      <span>USDT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('unionpay')}
                      className={`p-2 rounded-xl border flex items-center justify-center gap-1 font-medium ${
                        paymentMethod === 'unionpay'
                          ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      <span>银联</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl text-sm shadow-md transition"
                >
                  确认提交并支付 ¥{(checkoutProduct.price * orderQuantity).toFixed(2)}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Product Creator & Multi-image Editor Modal */}
      {isEditingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold font-serif-sc text-slate-900 dark:text-slate-100 mb-4">
              {editingProduct.id ? '编辑商品展示信息' : '创建新商品与多图展示'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  商品名称
                </label>
                <input
                  type="text"
                  value={editingProduct.name || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="例如: fox3 全能知识库交付套件"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    价格 (元)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.price || 0}
                    onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    归属展示区
                  </label>
                  <select
                    value={editingProduct.showcaseId}
                    onChange={e => setEditingProduct({ ...editingProduct, showcaseId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                  >
                    <option value="showcase-main">主打数字化展区</option>
                    <option value="showcase-hardware">限定周边展区</option>
                    <option value="showcase-service">定制服务展区</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  商品说明
                </label>
                <textarea
                  rows={3}
                  value={editingProduct.description || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="详细介绍商品特性..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  商品多图展示区 (可上传与删除多张图片)
                </label>

                <div className="grid grid-cols-3 gap-2 mb-2">
                  {editingProduct.images?.map((imgUrl, idx) => (
                    <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <SafeImage src={imgUrl} alt={`Prod Img ${idx}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-md"
                        title="删除该图"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl cursor-pointer transition">
                  <Plus className="w-3.5 h-3.5" />
                  <span>添加本地展示图片</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleUploadImage}
                    accept="image/*"
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingProduct(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-xl shadow-md transition"
                >
                  保存商品
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
