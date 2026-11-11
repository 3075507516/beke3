export type Locale = 'zh-CN' | 'zh-TW' | 'en-US' | 'ko-KR' | 'ar-SA' | 'hi-IN';

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
  settings: {
    siteName: string;
    themeColor: string;
    bgColor: string;
    avatar: string;
    siteBg: string;
    heroBg: string;
    saveSettings: string;
    userManage: string;
    storageManage: string;
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
      sites: '网站图床',
      books: '书架',
      gallery: '相册',
      media: '影音',
      shop: '商品',
      backup: '备份区',
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
    settings: {
      siteName: '自定义网站名称',
      themeColor: '主题调色按键 (一键快速配色)',
      bgColor: '自定义背景调色板',
      avatar: '自定义头像',
      siteBg: '全站背景照片',
      heroBg: '首页介绍区照片',
      saveSettings: '保存系统设置',
      userManage: '已注册用户管理列表',
      storageManage: '对象存储与云盘文件管理',
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
      sites: '網站圖床',
      books: '書架',
      gallery: '相簿',
      media: '影音',
      shop: '商品',
      backup: 'WebDAV容災',
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
    settings: {
      siteName: '自訂網站名稱',
      themeColor: '主題配色按鍵 (一鍵快速配色)',
      bgColor: '自訂背景調色盤',
      avatar: '自訂頭像',
      siteBg: '全站背景相片',
      heroBg: '首頁介紹區相片',
      saveSettings: '儲存系統設定',
      userManage: '已註冊使用者管理列表',
      storageManage: '物件儲存與雲端硬碟檔案管理',
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
      sites: 'Websites & Host',
      books: 'Bookshelf',
      gallery: 'Gallery',
      media: 'Media',
      shop: 'Store',
      backup: 'WebDAV Backup',
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
    settings: {
      siteName: 'Custom Site Name',
      themeColor: 'Theme Color Palette',
      bgColor: 'Custom Background Palette',
      avatar: 'Custom Avatar',
      siteBg: 'Global Background Image',
      heroBg: 'Hero Banner Image',
      saveSettings: 'Save Settings',
      userManage: 'Registered Users Management',
      storageManage: 'Object Storage & Drive Files',
    },
  },
  'ko-KR': {
    common: {
      offline: '연결 끊김 / 오프라인',
      refresh: '수동 동기화',
      syncing: '동기화 중...',
      realtimeSync: '실시간 동기화',
    },
    header: {
      quickJump: '빠른 탐색',
      channelStatus: '채널 상태',
      channelOnline: '정상 온라인',
      channelOffline: '오프라인 캐시 모드',
      adminBadge: '관리자',
      logout: '로그아웃',
      login: '로그인 / 회원가입',
      expand: '헤더 확장',
      collapse: '헤더 접기',
      mobileView: '모바일 뷰',
      desktopView: '데스크톱 반응형',
    },
    privacy: {
      guestNotice: '개인정보 보호 모드: 비로그인 시 블로그만 열람 가능합니다.',
      loginNow: '지금 로그인',
    },
    theme: {
      retro: '클래식 콘솔',
      modern: '모던 글래스모피즘',
    },
    nav: {
      blog: '블로그',
      bookmarks: '북마크',
      sites: '웹사이트 및 이미지호스트',
      books: '서재',
      gallery: '갤러리',
      media: '미디어',
      shop: '쇼핑몰',
      backup: 'WebDAV 백업',
      mail: '메일 허브',
      settings: '설정',
      guide: '배포 가이드',
      quickBar: '빠른 탐색',
      liveSync: '실시간 동기화',
      syncing: '동기화 중...',
      synced: '동기화 완료',
      offline: '오프라인',
      connected: '연결됨',
      disconnected: '연결 끊김',
      themeToggle: '테마',
      retroMode: '레트로',
      modernMode: '모던',
      viewMobile: '모바일 뷰',
      viewDesktop: 'PC 뷰',
      login: '로그인',
      logout: '로그아웃',
      admin: '관리자',
      user: '회원',
      guest: '손님',
    },
    action: {
      save: '저장',
      cancel: '취소',
      new: '새로 만들기',
      delete: '삭제',
      batchDelete: '일괄 삭제',
      batchDownload: '일괄 다운로드 (ZIP)',
      batchUpload: '일괄 업로드',
      select: '선택',
      selectAll: '전체 선택',
      deselectAll: '선택 해제',
      download: '다운로드',
      upload: '업로드',
      search: '검색...',
      filter: '필터',
      refresh: '새로고침',
      edit: '수정',
      preview: '미리보기',
      fullscreen: '전체화면',
      exitFullscreen: '전체화면 종료',
      confirm: '확인',
      close: '닫기',
      readNow: '지금 읽기',
      addToCart: '장바구니 담기',
      buyNow: '주문하기',
    },
    views: {
      big: '크게 보기',
      medium: '그리드',
      small: '상세 목록',
      original: '기본형',
      viewMode: '보기 모드',
    },
    auth: {
      titleLogin: '계정 로그인',
      titleRegister: '회원가입',
      email: '이메일 주소',
      emailPlaceholder: 'you@example.com',
      password: '비밀번호',
      passwordPlaceholder: '비밀번호 입력 (기본 관리자: admin123)',
      name: '닉네임',
      namePlaceholder: '사용할 닉네임',
      code: '인증 코드',
      codePlaceholder: '6자리 코드',
      sendCode: '코드 전송',
      resendIn: '초 후 재전송',
      loginBtn: '로그인',
      registerBtn: '가입하기',
      switchToRegister: '계정이 없으신가요? 회원가입',
      switchToLogin: '이미 계정이 있으신가요? 로그인',
      guestNotice: '개인정보 보호가 활성화되어 있습니다. 로그인 후 이용해 주세요.',
      privacyRestricted: '회원 또는 관리자 전용 영역입니다.',
    },
    retro: {
      title: 'fox3 레트로 콘솔',
      emailNotice: '이메일 알림',
      statusAway: '자리비움',
      statusOn: '켬',
      save: '저장',
      cancel: '취소',
      new: '신규',
      delete: '삭제',
      tipTitle: '보안 안내',
      tipContent: '보안을 위해 앱 전용 키를 사용하세요.',
      returnTop: '맨위로',
      icons: {
        status: '상태',
        redirect: '리디렉션',
        groups: '그룹',
        backup: '백업',
        dns: 'DNS',
        alias: '별칭',
        port: '포트',
        dnsQuery: 'DNS 조회',
        zoneImport: '영역 가져오기',
        wildcard: '와일드카드',
        offline: '오프라인',
        ipHistory: 'IP 기록',
        domainReg: '도메인',
        emailService: '메일',
        ssl: 'SSL',
        apiCred: 'API',
      },
    },
    reader: {
      fontSize: '글자 크기',
      chapters: '목차',
      downloadBook: '원문 파일 다운로드',
      readingProgress: '독서 진행도',
      noContent: '내용이 없거나 로딩 중입니다...',
      loading: '도서 데이터 분석 중...',
    },
    shop: {
      title: '디지털 굿즈 & 스토어',
      subtitle: '다양한 전시 부스 관리 및 결제 게이트웨이 연동',
      showcases: '전시 부스',
      allProducts: '전체 상품',
      price: '가격',
      stock: '재고',
      orderNow: '지금 주문',
      chatWithAdmin: '고객 센터 실시간 문의',
      ordersManage: '주문 및 배송 관리',
      paymentSettings: '결제 시스템 설정',
      customerName: '수령인 성명',
      customerPhone: '연락처',
      customerEmail: '이메일',
      customerAddress: '배송 주소',
      statusUnpaid: '미결제',
      statusPaid: '결제완료',
      statusShipped: '배송중',
      statusCompleted: '완료됨',
      statusRefunded: '환불됨',
      trackingNumber: '운송장 번호',
      carrier: '배송 택배사',
    },
    settings: {
      siteName: '사용자 정의 사이트 이름',
      themeColor: '테마 색상 팔레트 (원클릭 전환)',
      bgColor: '사용자 지정 배경 색상',
      avatar: '아바타 이미지 변경',
      siteBg: '사이트 전체 배경 사진',
      heroBg: '홈페이지 소개 배경 사진',
      saveSettings: '설정 저장',
      userManage: '등록된 회원 목록 관리',
      storageManage: 'R2 스토리지 및 클라우드 파일 관리',
    },
  },
  'ar-SA': {
    common: {
      offline: 'غير متصل / دون اتصال',
      refresh: 'مزامنة يدوية',
      syncing: 'جارٍ المزامنة...',
      realtimeSync: 'مزامنة فورية',
    },
    header: {
      quickJump: 'انتقال سريع',
      channelStatus: 'حالة القناة',
      channelOnline: 'القناة متصلة بنجاح',
      channelOffline: 'القناة غير متصلة (وضع التخزين المؤقت)',
      adminBadge: 'المسؤول',
      logout: 'تسجيل الخروج',
      login: 'تسجيل الدخول / إنشاء حساب',
      expand: 'توسيع الشريط',
      collapse: 'طي الشريط',
      mobileView: 'عرض الجوال',
      desktopView: 'عرض سطح المكتب',
    },
    privacy: {
      guestNotice: 'وضع الخصوصية مفعل: يُسمح للزوار غير المسجلين بقراءة المدونة فقط.',
      loginNow: 'تسجيل الدخول الآن',
    },
    theme: {
      retro: 'لوحة التحكم الكلاسيكية',
      modern: 'الزجاجي العصري',
    },
    nav: {
      blog: 'المدونة',
      bookmarks: 'المحفوظات',
      sites: 'المواقع ومستودع الصور',
      books: 'المكتبة',
      gallery: 'معرض الصور',
      media: 'الوسائط',
      shop: 'المتجر',
      backup: 'نسخ احتياطي WebDAV',
      mail: 'مركز البريد',
      settings: 'الإعدادات',
      guide: 'دليل النشر',
      quickBar: 'شريط الانتقال',
      liveSync: 'مزامنة مباشرة',
      syncing: 'مزامنة...',
      synced: 'تمت المزامنة',
      offline: 'غير متصل',
      connected: 'متصل',
      disconnected: 'غير متصل',
      themeToggle: 'المظهر',
      retroMode: 'كلاسيكي',
      modernMode: 'عصري',
      viewMobile: 'عرض الجوال',
      viewDesktop: 'عرض الشاشة',
      login: 'دخول',
      logout: 'خروج',
      admin: 'مسؤول',
      user: 'مستخدم',
      guest: 'زائر',
    },
    action: {
      save: 'حفظ',
      cancel: 'إلغاء',
      new: 'جديد / إضافة',
      delete: 'حذف',
      batchDelete: 'حذف متعدد',
      batchDownload: 'تنزيل الكل (ZIP)',
      batchUpload: 'رفع متعدد',
      select: 'تحديد',
      selectAll: 'تحديد الكل',
      deselectAll: 'إلغاء التحديد',
      download: 'تنزيل',
      upload: 'رفع',
      search: 'بحث...',
      filter: 'تصفية',
      refresh: 'تحديث',
      edit: 'تعديل',
      preview: 'معاينة',
      fullscreen: 'ملء الشاشة',
      exitFullscreen: 'إنهاء ملء الشاشة',
      confirm: 'تأكيد',
      close: 'إغلاق',
      readNow: 'اقرأ الآن',
      addToCart: 'إضافة للسلة',
      buyNow: 'اطلب الآن',
    },
    views: {
      big: 'كبير',
      medium: 'شبكة',
      small: 'قائمة تفصيلية',
      original: 'الأصلي',
      viewMode: 'وضع العرض',
    },
    auth: {
      titleLogin: 'تسجيل دخول المستخدم',
      titleRegister: 'إنشاء حساب جديد',
      email: 'البريد الإلكتروني',
      emailPlaceholder: 'you@example.com',
      password: 'كلمة المرور',
      passwordPlaceholder: 'أدخل كلمة المرور (الافتراضي للمسؤول: admin123)',
      name: 'اسم العرض',
      namePlaceholder: 'اسمك المستعار',
      code: 'رمز التحقق',
      codePlaceholder: 'رمز مكون من 6 أرقام',
      sendCode: 'إرسال الرمز',
      resendIn: 'ثوانٍ للإعادة',
      loginBtn: 'تسجيل الدخول',
      registerBtn: 'إنشاء حساب',
      switchToRegister: 'ليس لديك حساب؟ سجل الآن',
      switchToLogin: 'لديك حساب بالفعل؟ سجل دخولك',
      guestNotice: 'وضع الخصوصية نشط. يرجى تسجيل الدخول للوصول إلى كافة الأقسام.',
      privacyRestricted: 'هذا القسم مخصص للمستخدمين المسجلين فقط.',
    },
    retro: {
      title: 'fox3 لوحة التحكم الكلاسيكية',
      emailNotice: 'إشعارات البريد',
      statusAway: 'بالخارج',
      statusOn: 'يعمل',
      save: 'حفظ',
      cancel: 'إلغاء',
      new: 'جديد',
      delete: 'حذف',
      tipTitle: 'نصيحة أمنية',
      tipContent: 'استخدم مفتاح التطبيق بدلاً من كلمة المرور الرئيسية.',
      returnTop: 'للأعلى',
      icons: {
        status: 'الحالة',
        redirect: 'إعادة التوجيه',
        groups: 'المجموعات',
        backup: 'النسخ الاحتياطي',
        dns: 'سجلات DNS',
        alias: 'الأسماء المستعارة',
        port: 'فحص المنفذ',
        dnsQuery: 'استعلام DNS',
        zoneImport: 'استيراد المنطقة',
        wildcard: 'البدائل',
        offline: 'دون اتصال',
        ipHistory: 'سجل IP',
        domainReg: 'النطاقات',
        emailService: 'خدمة البريد',
        ssl: 'شهادات SSL',
        apiCred: 'مفاتيح API',
      },
    },
    reader: {
      fontSize: 'حجم الخط',
      chapters: 'الفصول والمحتويات',
      downloadBook: 'تنزيل الملف الأصلي',
      readingProgress: 'تقدم القراءة',
      noContent: 'لا يوجد محتوى أو جارٍ تحميل الكتاب...',
      loading: 'جارٍ تحليل بيانات الكتاب...',
    },
    shop: {
      title: 'متجر المنتجات الرقمية والإبداعية',
      subtitle: 'إدارة أجنحة العرض مع بوابات دفع متعددة وواجهات مرنة',
      showcases: 'أجنحة العرض',
      allProducts: 'جميع المنتجات',
      price: 'السعر',
      stock: 'المخزون',
      orderNow: 'اطلب الآن',
      chatWithAdmin: 'محادثة فورية مع الإدارة',
      ordersManage: 'إدارة الطلبات والشحن',
      paymentSettings: 'إعدادات بوابات الدفع',
      customerName: 'اسم المستلم',
      customerPhone: 'رقم الهاتف',
      customerEmail: 'البريد الإلكتروني',
      customerAddress: 'عنوان التوصيل التفصيلي',
      statusUnpaid: 'بانتظار الدفع',
      statusPaid: 'مدفوع',
      statusShipped: 'تم الشحن',
      statusCompleted: 'مكتمل',
      statusRefunded: 'مسترجع',
      trackingNumber: 'رقم التتبع',
      carrier: 'شركة الشحن',
    },
    settings: {
      siteName: 'تخصيص اسم الموقع',
      themeColor: 'لوحة ألوان المظهر (تغيير بنقرة واحدة)',
      bgColor: 'تخصيص لون الخلفية',
      avatar: 'تخصيص الصورة الرمزية',
      siteBg: 'صورة خلفية الموقع بالكامل',
      heroBg: 'صورة منطقة التعريف الرئيسية',
      saveSettings: 'حفظ إعدادات النظام',
      userManage: 'قائمة إدارة المستخدمين المسجلين',
      storageManage: 'إدارة ملفات R2 والتخزين السحابي',
    },
  },
  'hi-IN': {
    common: {
      offline: 'डिस्कनेक्ट / ऑफलाइन',
      refresh: 'मैन्युअल सिंक',
      syncing: 'सिंकिंग हो रही है...',
      realtimeSync: 'रियल-टाइम सिंक',
    },
    header: {
      quickJump: 'त्वरित नेविगेशन',
      channelStatus: 'चैनल स्थिति',
      channelOnline: 'सेवा चैनल ऑनलाइन',
      channelOffline: 'चैनल डिस्कनेक्ट (ऑफलाइन कैश मोड)',
      adminBadge: 'व्यवस्थापक (Admin)',
      logout: 'लॉग आउट',
      login: 'साइन इन / रजिस्टर',
      expand: 'हेडर फैलाएं',
      collapse: 'हेडर समेटें',
      mobileView: 'मोबाइल व्यू',
      desktopView: 'डेस्कटॉप व्यू',
    },
    privacy: {
      guestNotice: 'गोपनीयता सुरक्षा सक्रिय: केवल ब्लॉग आम दर्शकों के लिए उपलब्ध है।',
      loginNow: 'अभी लॉग इन करें',
    },
    theme: {
      retro: 'क्लासिक कंसोल',
      modern: 'आधुनिक ग्लास शैली',
    },
    nav: {
      blog: 'ब्लॉग',
      bookmarks: 'बुकमार्क',
      sites: 'वेबसाइटें और इमेज होस्ट',
      books: 'पुस्तकालय',
      gallery: 'गैलरी',
      media: 'मीडिया',
      shop: 'दुकान (Shop)',
      backup: 'WebDAV बैकअप',
      mail: 'ईमेल केंद्र',
      settings: 'सेटिंग्स',
      guide: 'तैनाती गाइड (Deploy)',
      quickBar: 'त्वरित बार',
      liveSync: 'लाइव सिंक',
      syncing: 'सिंक हो रहा है...',
      synced: 'सिंक पूर्ण हुआ',
      offline: 'ऑफलाइन',
      connected: 'कनेक्टेड',
      disconnected: 'डिस्कनेक्टेड',
      themeToggle: 'थीम बदलें',
      retroMode: 'रेट्रो',
      modernMode: 'मॉडर्न',
      viewMobile: 'मोबाइल दृश्य',
      viewDesktop: 'पीसी दृश्य',
      login: 'लॉग इन',
      logout: 'लॉग आउट',
      admin: 'एडमिन',
      user: 'उपयोगकर्ता',
      guest: 'अतिथि',
    },
    action: {
      save: 'सहेजें (Save)',
      cancel: 'रद्द करें',
      new: 'नया / जोड़ें',
      delete: 'हटाएं (Delete)',
      batchDelete: 'एक साथ हटाएं',
      batchDownload: 'डाउनलोड करें (ZIP)',
      batchUpload: 'एक साथ अपलोड करें',
      select: 'चुनें',
      selectAll: 'सब चुनें',
      deselectAll: 'चयन हटाएं',
      download: 'डाउनलोड',
      upload: 'अपलोड',
      search: 'खोजें...',
      filter: 'फ़िल्टर',
      refresh: 'रिफ्रेश',
      edit: 'संपादित करें',
      preview: 'पूर्वावलोकन',
      fullscreen: 'फुल स्क्रीन',
      exitFullscreen: 'फुल स्क्रीन से बाहर',
      confirm: 'पुष्टि करें',
      close: 'बंद करें',
      readNow: 'अभी पढ़ें',
      addToCart: 'सूची में जोड़ें',
      buyNow: 'अभी ऑर्डर करें',
    },
    views: {
      big: 'बड़ा कार्ड',
      medium: 'ग्रिड ग्रिड',
      small: 'विस्तृत सूची',
      original: 'मूल लेआउट',
      viewMode: 'दृश्य मोड',
    },
    auth: {
      titleLogin: 'खाता लॉगिन',
      titleRegister: 'नया खाता बनाएं',
      email: 'ईमेल पता',
      emailPlaceholder: 'you@example.com',
      password: 'पासवर्ड',
      passwordPlaceholder: 'पासवर्ड दर्ज करें (डिफ़ॉल्ट एडमिन: admin123)',
      name: 'प्रदर्शित नाम',
      namePlaceholder: 'आपका उपनाम',
      code: 'सत्यापन कोड (OTP)',
      codePlaceholder: '6-अंकीय कोड',
      sendCode: 'कोड भेजें',
      resendIn: 'सेकंड में पुनः प्रयास करें',
      loginBtn: 'लॉग इन करें',
      registerBtn: 'पंजीकरण करें',
      switchToRegister: 'खाता नहीं है? नया पंजीकरण करें',
      switchToLogin: 'पहले से खाता है? सीधे लॉगिन करें',
      guestNotice: 'गोपनीयता सुरक्षा लागू है। अन्य अनुभाग देखने के लिए कृपया लॉगिन करें।',
      privacyRestricted: 'यह अनुभाग केवल पंजीकृत उपयोगकर्ताओं के लिए है।',
    },
    retro: {
      title: 'fox3 क्लासिक कंसोल',
      emailNotice: 'ईमेल सूचनाएं',
      statusAway: 'दूर',
      statusOn: 'चालू',
      save: 'सहेजें',
      cancel: 'रद्द करें',
      new: 'नया',
      delete: 'हटाएं',
      tipTitle: 'सुरक्षा सूचना',
      tipContent: 'मास्टर पासवर्ड के स्थान पर एप्लिकेशन एक्सेस टोकन का उपयोग करें।',
      returnTop: 'शीर्ष पर',
      icons: {
        status: 'स्थिति',
        redirect: 'रीडायरेक्ट',
        groups: 'समूह',
        backup: 'बैकअप',
        dns: 'DNS रिकॉर्ड्स',
        alias: 'उपनाम (Aliases)',
        port: 'पोर्ट चेक',
        dnsQuery: 'DNS क्वेरी',
        zoneImport: 'ज़ोन आयात',
        wildcard: 'वाइल्डकार्ड',
        offline: 'ऑफलाइन',
        ipHistory: 'IP इतिहास',
        domainReg: 'डोमेन',
        emailService: 'ईमेल सेवा',
        ssl: 'SSL प्रमाणपत्र',
        apiCred: 'API क्रेडेंशियल',
      },
    },
    reader: {
      fontSize: 'फ़ॉन्ट आकार',
      chapters: 'विषय सूची (Chapters)',
      downloadBook: 'मूल पुस्तक फ़ाइल डाउनलोड करें',
      readingProgress: 'पढ़ने की प्रगति',
      noContent: 'सामग्री लोड हो रही है या उपलब्ध नहीं है...',
      loading: 'पुस्तक का डेटा पार्स हो रहा है...',
    },
    shop: {
      title: 'डिजिटल उत्पाद और मर्चेंडाइज स्टोर',
      subtitle: 'मल्टी-शोकेस प्रबंधन, इमेज स्लाइडर और भुगतान गेटवे',
      showcases: 'शोकेस श्रेणियां',
      allProducts: 'सभी उत्पाद',
      price: 'मूल्य',
      stock: 'स्टॉक',
      orderNow: 'अभी ऑर्डर करें',
      chatWithAdmin: 'ग्राहक सहायता चैट',
      ordersManage: 'ऑर्डर और लॉजिस्टिक्स प्रबंधन',
      paymentSettings: 'भुगतान गेटवे सेटिंग्स',
      customerName: 'ग्राहक का नाम',
      customerPhone: 'फ़ोन नंबर',
      customerEmail: 'ईमेल पता',
      customerAddress: 'वितरण का पूरा पता',
      statusUnpaid: 'भुगतान लंबित',
      statusPaid: 'भुगतान पूर्ण',
      statusShipped: 'भेज दिया गया (Shipped)',
      statusCompleted: 'पूर्ण (Completed)',
      statusRefunded: 'वापस किया गया (Refunded)',
      trackingNumber: 'ट्रैकिंग नंबर',
      carrier: 'कूरियर कंपनी',
    },
    settings: {
      siteName: 'वेबसाइट का नाम अनुकूलित करें',
      themeColor: 'थीम रंग पैलेट (एक-क्लिक रंग)',
      bgColor: 'कस्टम पृष्ठभूमि रंग',
      avatar: 'अवतार छवि बदलें',
      siteBg: 'वेबसाइट पृष्ठभूमि फ़ोटो',
      heroBg: 'होमपेज परिचय बैनर फ़ोटो',
      saveSettings: 'सिस्टम सेटिंग्स सहेजें',
      userManage: 'पंजीकृत उपयोगकर्ता सूची प्रबंधन',
      storageManage: 'R2 ऑब्जेक्ट स्टोरेज और क्लाउड ड्राइव फ़ाइलें',
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
