export type Locale = 'zh-CN' | 'zh-TW' | 'en-US';

export interface Translations {
  common: {
    offline: string;
    refresh: string;
    syncing: string;
    realtimeSync: string;
  };
  header: {
    quickJump: string;
    channelStatus: string;
    channelOnline: string;
    channelOffline: string;
    adminBadge: string;
    logout: string;
    login: string;
    expand: string;
    collapse: string;
    mobileView: string;
    desktopView: string;
  };
  privacy: {
    guestNotice: string;
    loginNow: string;
  };
  theme: {
    retro: string;
    modern: string;
  };
  // Navigation & General
  nav: {
    blog: string;
    bookmarks: string;
    books: string;
    gallery: string;
    media: string;
    shop: string;
    backup: string;
    mail: string;
    settings: string;
    guide: string;
    quickBar: string;
    liveSync: string;
    syncing: string;
    synced: string;
    offline: string;
    connected: string;
    disconnected: string;
    themeToggle: string;
    retroMode: string;
    modernMode: string;
    viewMobile: string;
    viewDesktop: string;
    login: string;
    logout: string;
    admin: string;
    user: string;
    guest: string;
  };
  // Actions
  action: {
    save: string;
    cancel: string;
    new: string;
    delete: string;
    batchDelete: string;
    batchDownload: string;
    batchUpload: string;
    select: string;
    selectAll: string;
    deselectAll: string;
    download: string;
    upload: string;
    search: string;
    filter: string;
    refresh: string;
    edit: string;
    preview: string;
    fullscreen: string;
    exitFullscreen: string;
    confirm: string;
    close: string;
    readNow: string;
    addToCart: string;
    buyNow: string;
  };
  // View Modes
  views: {
    big: string;
    medium: string;
    small: string;
    original: string;
    viewMode: string;
  };
  // Auth Modal
  auth: {
    titleLogin: string;
    titleRegister: string;
    email: string;
    emailPlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    name: string;
    namePlaceholder: string;
    code: string;
    codePlaceholder: string;
    sendCode: string;
    resendIn: string;
    loginBtn: string;
    registerBtn: string;
    switchToRegister: string;
    switchToLogin: string;
    guestNotice: string;
    privacyRestricted: string;
  };
  // Retro Mode
  retro: {
    title: string;
    emailNotice: string;
    statusAway: string;
    statusOn: string;
    save: string;
    cancel: string;
    new: string;
    delete: string;
    tipTitle: string;
    tipContent: string;
    returnTop: string;
    icons: {
      status: string;
      redirect: string;
      groups: string;
      backup: string;
      dns: string;
      alias: string;
      port: string;
      dnsQuery: string;
      zoneImport: string;
      wildcard: string;
      offline: string;
      ipHistory: string;
      domainReg: string;
      emailService: string;
      ssl: string;
      apiCred: string;
    };
  };
  // Reader
  reader: {
    fontSize: string;
    chapters: string;
    downloadBook: string;
    readingProgress: string;
    noContent: string;
    loading: string;
  };
  // Shop
  shop: {
    title: string;
    subtitle: string;
    showcases: string;
    allProducts: string;
    price: string;
    stock: string;
    orderNow: string;
    chatWithAdmin: string;
    ordersManage: string;
    paymentSettings: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    customerAddress: string;
    statusUnpaid: string;
    statusPaid: string;
    statusShipped: string;
    statusCompleted: string;
    statusRefunded: string;
    trackingNumber: string;
    carrier: string;
  };
}

export const i18nDict: Record<Locale, Translations> = {
  'zh-CN': {
    common: {
      offline: '未连接 / 离线',
      refresh: '手动同步',
      syncing: '同步中...',
      realtimeSync: '实时同步',
    },
    header: {
      quickJump: '快速选区',
      channelStatus: '通道状态',
      channelOnline: '通道正常在线',
      channelOffline: '通道未连接 (离线缓存模式)',
      adminBadge: '管理员',
      logout: '退出登录',
      login: '登录 / 注册',
      expand: '展开顶栏',
      collapse: '收拢顶栏',
      mobileView: '手机端视图',
      desktopView: '电脑端自适应',
    },
    privacy: {
      guestNotice: '当前站点已开启全站隐私保护（未登录仅可浏览博客）。',
      loginNow: '立即登录',
    },
    theme: {
      retro: '经典怀旧控制台',
      modern: '现代极简毛玻璃',
    },
    nav: {
      blog: '博客',
      bookmarks: '收藏',
      books: '书架',
      gallery: '相册',
      media: '影音',
      shop: '商品',
      backup: '坚果云容灾',
      mail: '邮箱中枢',
      settings: '设置',
      guide: '部署指南',
      quickBar: '快速选区',
      liveSync: '实时同步',
      syncing: '同步中...',
      synced: '云端同步成功',
      offline: '离线/本地缓存',
      connected: '服务通道在线',
      disconnected: '通道未连接/未配置',
      themeToggle: '外观风格',
      retroMode: '怀旧控制台',
      modernMode: '现代毛玻璃',
      viewMobile: '手机视图',
      viewDesktop: '自适应视图',
      login: '登录 / 注册',
      logout: '退出登录',
      admin: '管理员',
      user: '注册用户',
      guest: '访客',
    },
    action: {
      save: '节省 / 保存',
      cancel: '取消',
      new: '新的 / 添加',
      delete: '消除 / 删除',
      batchDelete: '批量消除',
      batchDownload: '批量下载 (ZIP)',
      batchUpload: '批量上传',
      select: '选择',
      selectAll: '全选',
      deselectAll: '反选',
      download: '下载',
      upload: '上传',
      search: '搜索...',
      filter: '筛选',
      refresh: '刷新',
      edit: '编辑',
      preview: '预览',
      fullscreen: '全屏模式',
      exitFullscreen: '退出全屏',
      confirm: '确认',
      close: '关闭',
      readNow: '立即阅读',
      addToCart: '加入清单',
      buyNow: '立即下单',
    },
    views: {
      big: '大图模式',
      medium: '中图网格',
      small: '小图详情',
      original: '原始布局',
      viewMode: '视图模式',
    },
    auth: {
      titleLogin: '用户身份登录',
      titleRegister: '新用户注册',
      email: '电子邮箱',
      emailPlaceholder: 'you@example.com',
      password: '安全密码',
      passwordPlaceholder: '请输入密码 (管理员默认: admin123)',
      name: '用户昵称',
      namePlaceholder: '您的展示昵称',
      code: '邮箱验证码',
      codePlaceholder: '6位数字验证码',
      sendCode: '获取验证码',
      resendIn: '后重试',
      loginBtn: '立即登入',
      registerBtn: '提交注册',
      switchToRegister: '没有账号？点击注册新账号',
      switchToLogin: '已有账号？返回直接登入',
      guestNotice: '当前站点已开启隐私模式，请登录后访问知识库、相册与书架内容。',
      privacyRestricted: '此分区需登录注册用户或管理员方可浏览。',
    },
    retro: {
      title: 'fox3 经典控制中心 (Classic Skeuomorphic Panel)',
      emailNotice: '电子邮件通知',
      statusAway: '离开',
      statusOn: '开启',
      save: '节省',
      cancel: '取消',
      new: '新的',
      delete: '消除',
      tipTitle: '为了增强安全性',
      tipContent: '您可以使用系统应用专用密钥代替您的主账户密码来接入各端同步客户端。',
      returnTop: '顶部',
      icons: {
        status: '当前状态',
        redirect: '网页重定向',
        groups: '团体管理',
        backup: '配置备份',
        dns: 'DNS记录',
        alias: '别名管理',
        port: '端口检查',
        dnsQuery: 'DNS 查询',
        zoneImport: '区域导入',
        wildcard: '通配符设置',
        offline: '离线设置',
        ipHistory: 'IP 更新历史',
        domainReg: '域名注册',
        emailService: '电子邮件服务',
        ssl: 'SSL证书',
        apiCred: 'API凭证',
      },
    },
    reader: {
      fontSize: '字体大小',
      chapters: '目录章节',
      downloadBook: '下载原书文件',
      readingProgress: '当前阅读进度',
      noContent: '暂无图书内容或正文加载中...',
      loading: '解析书籍数据中...',
    },
    shop: {
      title: '数字文创与周边展台',
      subtitle: '支持多展台展区管理，多图轮播与全渠道支付网关',
      showcases: '展台分类',
      allProducts: '全部展品',
      price: '单价',
      stock: '库存',
      orderNow: '立即订购',
      chatWithAdmin: '商品展台实时咨询',
      ordersManage: '订单与物流管理',
      paymentSettings: '支付网关接口设定',
      customerName: '联系人姓名',
      customerPhone: '联系电话',
      customerEmail: '电子邮箱',
      customerAddress: '详细收件地址',
      statusUnpaid: '待支付',
      statusPaid: '已支付',
      statusShipped: '已发货',
      statusCompleted: '已完成',
      statusRefunded: '已退款',
      trackingNumber: '物流运单号',
      carrier: '承运快递公司',
    },
  },
  'zh-TW': {
    common: {
      offline: '未連線 / 離線',
      refresh: '手動同步',
      syncing: '同步中...',
      realtimeSync: '即時同步',
    },
    header: {
      quickJump: '快速選區',
      channelStatus: '通道狀態',
      channelOnline: '通道正常在線',
      channelOffline: '通道未連線 (離線快取模式)',
      adminBadge: '管理員',
      logout: '登出',
      login: '登入 / 註冊',
      expand: '展開頂欄',
      collapse: '收攏頂欄',
      mobileView: '手機端檢視',
      desktopView: '電腦端自適應',
    },
    privacy: {
      guestNotice: '目前站點已開啟全站隱私保護（未登入僅可瀏覽部落格）。',
      loginNow: '立即登入',
    },
    theme: {
      retro: '經典懷舊控制台',
      modern: '現代極簡毛玻璃',
    },
    nav: {
      blog: '部落格',
      bookmarks: '收藏',
      books: '書架',
      gallery: '相簿',
      media: '影音',
      shop: '商品',
      backup: '堅果雲容災',
      mail: '郵箱中樞',
      settings: '設定',
      guide: '部署指南',
      quickBar: '快速選區',
      liveSync: '即時同步',
      syncing: '同步中...',
      synced: '雲端同步成功',
      offline: '離線/本地快取',
      connected: '服務通道在線',
      disconnected: '通道未連線/未配置',
      themeToggle: '外觀風格',
      retroMode: '懷舊控制台',
      modernMode: '現代毛玻璃',
      viewMobile: '手機檢視',
      viewDesktop: '自適應檢視',
      login: '登入 / 註冊',
      logout: '登出',
      admin: '管理員',
      user: '註冊用戶',
      guest: '訪客',
    },
    action: {
      save: '節省 / 儲存',
      cancel: '取消',
      new: '新的 / 新增',
      delete: '消除 / 刪除',
      batchDelete: '批次消除',
      batchDownload: '批次下載 (ZIP)',
      batchUpload: '批次上傳',
      select: '選擇',
      selectAll: '全選',
      deselectAll: '反選',
      download: '下載',
      upload: '上傳',
      search: '搜尋...',
      filter: '篩選',
      refresh: '重新整理',
      edit: '編輯',
      preview: '預覽',
      fullscreen: '全螢幕模式',
      exitFullscreen: '退出全螢幕',
      confirm: '確認',
      close: '關閉',
      readNow: '立即閱讀',
      addToCart: '加入清單',
      buyNow: '立即下單',
    },
    views: {
      big: '大圖模式',
      medium: '中圖網格',
      small: '小圖詳情',
      original: '原始版面',
      viewMode: '檢視模式',
    },
    auth: {
      titleLogin: '使用者身分登入',
      titleRegister: '新使用者註冊',
      email: '電子郵件',
      emailPlaceholder: 'you@example.com',
      password: '安全密碼',
      passwordPlaceholder: '請輸入密碼 (管理員預設: admin123)',
      name: '使用者暱稱',
      namePlaceholder: '您的展示暱稱',
      code: '信箱驗證碼',
      codePlaceholder: '6位數字驗證碼',
      sendCode: '取得驗證碼',
      resendIn: '後重試',
      loginBtn: '立即登入',
      registerBtn: '送出註冊',
      switchToRegister: '沒有帳號？點擊註冊新帳號',
      switchToLogin: '已有帳號？返回直接登入',
      guestNotice: '目前站點已開啟隱私模式，請登入後造訪知識庫、相簿與書架內容。',
      privacyRestricted: '此分區需登入註冊使用者或管理員方可瀏覽。',
    },
    retro: {
      title: 'fox3 經典控制中心 (Classic Skeuomorphic Panel)',
      emailNotice: '電子郵件通知',
      statusAway: '離開',
      statusOn: '開啟',
      save: '節省',
      cancel: '取消',
      new: '新的',
      delete: '消除',
      tipTitle: '為了增強安全性',
      tipContent: '您可以使用系統應用專用金鑰代替您的主帳戶密碼來接入各端同步用戶端。',
      returnTop: '頂部',
      icons: {
        status: '目前狀態',
        redirect: '網頁重新導向',
        groups: '團體管理',
        backup: '配置備份',
        dns: 'DNS記錄',
        alias: '別名管理',
        port: '連接埠檢查',
        dnsQuery: 'DNS 查詢',
        zoneImport: '區域匯入',
        wildcard: '萬用字元設定',
        offline: '離線設定',
        ipHistory: 'IP 更新歷程記錄',
        domainReg: '網域名稱註冊',
        emailService: '電子郵件服務',
        ssl: 'SSL憑證',
        apiCred: 'API憑證',
      },
    },
    reader: {
      fontSize: '字體大小',
      chapters: '目錄章節',
      downloadBook: '下載原書檔案',
      readingProgress: '目前閱讀進度',
      noContent: '暫無圖書內容或內文載入中...',
      loading: '解析書籍資料中...',
    },
    shop: {
      title: '數位文創與周邊展台',
      subtitle: '支援多展台展區管理，多圖輪播與全通路支付閘道',
      showcases: '展台分類',
      allProducts: '全部展品',
      price: '單價',
      stock: '庫存',
      orderNow: '立即訂購',
      chatWithAdmin: '商品展台即時諮詢',
      ordersManage: '訂單與物流管理',
      paymentSettings: '支付閘道介面設定',
      customerName: '聯絡人姓名',
      customerPhone: '聯絡電話',
      customerEmail: '電子郵件',
      customerAddress: '詳細收件地址',
      statusUnpaid: '待支付',
      statusPaid: '已支付',
      statusShipped: '已出貨',
      statusCompleted: '已完成',
      statusRefunded: '已退款',
      trackingNumber: '物流追蹤號',
      carrier: '承运快遞公司',
    },
  },
  'en-US': {
    common: {
      offline: 'Disconnected / Offline',
      refresh: 'Manual Sync',
      syncing: 'Syncing...',
      realtimeSync: 'Live Sync',
    },
    header: {
      quickJump: 'Quick Jump',
      channelStatus: 'Channel Status',
      channelOnline: 'Channel Online',
      channelOffline: 'Channel Disconnected (Offline Cache)',
      adminBadge: 'Admin',
      logout: 'Sign Out',
      login: 'Sign In / Register',
      expand: 'Expand Header',
      collapse: 'Collapse Header',
      mobileView: 'Mobile View',
      desktopView: 'Desktop View',
    },
    privacy: {
      guestNotice: 'Privacy mode active: Only blog is visible to unauthenticated guests.',
      loginNow: 'Sign In Now',
    },
    theme: {
      retro: 'Retro Classic Console',
      modern: 'Modern Minimal Glass',
    },
    nav: {
      blog: 'Blog',
      bookmarks: 'Bookmarks',
      books: 'Bookshelf',
      gallery: 'Gallery',
      media: 'Media',
      shop: 'Store',
      backup: 'NutStore WebDAV',
      mail: 'Mail Hub',
      settings: 'Settings',
      guide: 'Deploy Guide',
      quickBar: 'Quick Navigation',
      liveSync: 'Real-time Sync',
      syncing: 'Syncing...',
      synced: 'Cloud Synced',
      offline: 'Offline / Local Cache',
      connected: 'Channel Online',
      disconnected: 'Channel Disconnected',
      themeToggle: 'Theme Mode',
      retroMode: 'Retro cPanel',
      modernMode: 'Modern Glass',
      viewMobile: 'Mobile View',
      viewDesktop: 'Desktop View',
      login: 'Sign In / Register',
      logout: 'Sign Out',
      admin: 'Administrator',
      user: 'User',
      guest: 'Guest',
    },
    action: {
      save: 'Save',
      cancel: 'Cancel',
      new: 'New / Add',
      delete: 'Delete',
      batchDelete: 'Batch Delete',
      batchDownload: 'Batch Download (ZIP)',
      batchUpload: 'Batch Upload',
      select: 'Select',
      selectAll: 'Select All',
      deselectAll: 'Deselect All',
      download: 'Download',
      upload: 'Upload',
      search: 'Search...',
      filter: 'Filter',
      refresh: 'Refresh',
      edit: 'Edit',
      preview: 'Preview',
      fullscreen: 'Fullscreen',
      exitFullscreen: 'Exit Fullscreen',
      confirm: 'Confirm',
      close: 'Close',
      readNow: 'Read Now',
      addToCart: 'Add to List',
      buyNow: 'Order Now',
    },
    views: {
      big: 'Big Card',
      medium: 'Grid Card',
      small: 'Detail List',
      original: 'Original',
      viewMode: 'View Mode',
    },
    auth: {
      titleLogin: 'Sign In to Account',
      titleRegister: 'Create New Account',
      email: 'Email Address',
      emailPlaceholder: 'you@example.com',
      password: 'Password',
      passwordPlaceholder: 'Enter your password (Admin default: admin123)',
      name: 'Display Name',
      namePlaceholder: 'Your nickname',
      code: 'Verification Code',
      codePlaceholder: '6-digit code',
      sendCode: 'Send Code',
      resendIn: 's to retry',
      loginBtn: 'Sign In',
      registerBtn: 'Register',
      switchToRegister: "Don't have an account? Sign up",
      switchToLogin: 'Already have an account? Sign in',
      guestNotice: 'Site privacy protection is active. Please log in to view books, media, and gallery.',
      privacyRestricted: 'This section is strictly restricted to authenticated users or administrators.',
    },
    retro: {
      title: 'fox3 Classic Control Center (Skeuomorphic cPanel)',
      emailNotice: 'Email Notifications',
      statusAway: 'Away',
      statusOn: 'On',
      save: 'Save',
      cancel: 'Cancel',
      new: 'New',
      delete: 'Delete',
      tipTitle: 'Security Advisory',
      tipContent: 'For enhanced security, you may use an Application Access Token instead of your master password.',
      returnTop: 'Top',
      icons: {
        status: 'Status',
        redirect: 'Redirects',
        groups: 'Groups',
        backup: 'Backups',
        dns: 'DNS Records',
        alias: 'Aliases',
        port: 'Port Check',
        dnsQuery: 'DNS Query',
        zoneImport: 'Zone Import',
        wildcard: 'Wildcards',
        offline: 'Offline Mode',
        ipHistory: 'IP History',
        domainReg: 'Domains',
        emailService: 'Email Hub',
        ssl: 'SSL Certificates',
        apiCred: 'API Keys',
      },
    },
    reader: {
      fontSize: 'Font Size',
      chapters: 'Table of Contents',
      downloadBook: 'Download Original File',
      readingProgress: 'Reading Progress',
      noContent: 'No content loaded or file is being processed...',
      loading: 'Parsing book chapters...',
    },
    shop: {
      title: 'Digital Goods & Merch Store',
      subtitle: 'Multi-showcase exhibits with full payment gateway presets',
      showcases: 'Showcases',
      allProducts: 'All Products',
      price: 'Price',
      stock: 'Stock',
      orderNow: 'Order Now',
      chatWithAdmin: 'Live Store Support',
      ordersManage: 'Orders & Logistics',
      paymentSettings: 'Payment Gateway Integrations',
      customerName: 'Contact Name',
      customerPhone: 'Phone Number',
      customerEmail: 'Email Address',
      customerAddress: 'Shipping Address',
      statusUnpaid: 'Unpaid',
      statusPaid: 'Paid',
      statusShipped: 'Shipped',
      statusCompleted: 'Completed',
      statusRefunded: 'Refunded',
      trackingNumber: 'Tracking Number',
      carrier: 'Carrier',
    },
  },
};

// Helper function to safely get nested translation key (e.g., 'nav.blog')
export function getTranslation(dict: Translations, path: string): string {
  const parts = path.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = dict;
  for (const part of parts) {
    if (cur && typeof cur === 'object' && part in cur) {
      cur = cur[part];
    } else {
      return path;
    }
  }
  return typeof cur === 'string' ? cur : path;
}
