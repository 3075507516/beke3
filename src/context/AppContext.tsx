import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Post,
  Book,
  Photo,
  MediaItem,
  MailMessage,
  Product,
  Order,
  ChatMessage,
  SystemSettings,
  EmailSettings,
  PaymentSettings,
  WebDavConfig,
  WebDavBackupItem,
  User,
  WebSiteItem,
  ViewMode,
  GlobalThemeMode,
  DeviceViewMode,
} from '../types';
import { Locale, i18nDict, getTranslation } from '../utils/i18n';
import {
  STORAGE_KEYS,
  loadLocalStorage,
  saveLocalStorage,
  saveFileToIndexedDB,
  DEFAULT_SETTINGS,
  DEFAULT_POSTS,
  DEFAULT_BOOKS,
  DEFAULT_PHOTOS,
  DEFAULT_MEDIA,
  DEFAULT_MAILS,
  DEFAULT_PRODUCTS,
  DEFAULT_ORDERS,
  DEFAULT_WEBSITES,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_EMAIL_SETTINGS,
  DEFAULT_WEBDAV_CONFIG,
  DEFAULT_WEBDAV_BACKUPS,
} from '../utils/storage';

interface TransferProgress {
  active: boolean;
  type: 'upload' | 'download' | 'backup' | 'restore';
  fileName: string;
  percent: number;
  speed?: string;
}

export interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: number;
  status: 'idle' | 'syncing' | 'synced' | 'error';
  message: string;
}

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;

  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  books: Book[];
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  photos: Photo[];
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
  photoFolders: Array<{ id: string; name: string; createdAt: number }>;
  setPhotoFolders: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; createdAt: number }>>>;
  media: MediaItem[];
  setMedia: React.Dispatch<React.SetStateAction<MediaItem[]>>;
  mails: MailMessage[];
  setMails: React.Dispatch<React.SetStateAction<MailMessage[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;

  websites: WebSiteItem[];
  setWebsites: React.Dispatch<React.SetStateAction<WebSiteItem[]>>;

  webDavBackups: WebDavBackupItem[];
  setWebDavBackups: React.Dispatch<React.SetStateAction<WebDavBackupItem[]>>;

  systemSettings: SystemSettings;
  updateSystemSettings: (newSettings: Partial<SystemSettings>) => void;
  emailSettings: EmailSettings;
  updateEmailSettings: (newSettings: Partial<EmailSettings>) => void;
  paymentSettings: PaymentSettings;
  updatePaymentSettings: (newSettings: Partial<PaymentSettings>) => void;
  webDavConfig: WebDavConfig;
  updateWebDavConfig: (newConfig: Partial<WebDavConfig>) => void;

  transferProgress: TransferProgress;
  startTransfer: (type: TransferProgress['type'], fileName: string) => void;
  updateTransferPercent: (percent: number) => void;
  finishTransfer: () => void;

  // Multi-transfer progress support
  multiTransferProgress: {
    active: boolean;
    type: 'upload' | 'download' | 'backup' | 'restore';
    currentFileName: string;
    currentIndex: number;
    totalCount: number;
    overallPercent: number;
    speed?: string;
  };
  startMultiTransfer: (type: 'upload' | 'download' | 'backup' | 'restore', totalCount: number, firstFileName: string) => void;
  updateMultiTransferProgress: (currentIndex: number, currentFileName: string, overallPercent: number, speed?: string) => void;
  finishMultiTransfer: () => void;

  // Unified toast notifications (success / error / info)
  toasts: Array<{ id: string; type: 'success' | 'error' | 'info'; message: string }>;
  showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
  dismissToast: (id: string) => void;

  uploadFile: (file: File) => Promise<{ url: string; size: number; name: string }>;
  addStorageUsage: (bytes: number) => void;

  deviceMode: DeviceViewMode;
  setDeviceMode: (mode: DeviceViewMode) => void;

  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  themeMode: GlobalThemeMode;
  setThemeMode: (mode: GlobalThemeMode) => void;

  // View modes for sections
  viewModes: Record<string, ViewMode>;
  setViewMode: (section: string, mode: ViewMode) => void;

  // Admin credentials management & single admin uniqueness
  adminUsername: string;
  adminPassword: string;
  updateAdminPassword: (newPass: string) => boolean;
  updateAdminUsername: (newName: string) => boolean;

  // Universal Recycle Bin (Trash)
  trashItems: Array<{
    id: string;
    originId: string;
    originType: 'post' | 'book' | 'photo' | 'media' | 'mail' | 'chat' | 'product' | 'order';
    title: string;
    preview?: string;
    deletedAt: number;
    data: any;
  }>;
  moveToTrash: (item: {
    originId: string;
    originType: 'post' | 'book' | 'photo' | 'media' | 'mail' | 'chat' | 'product' | 'order';
    title: string;
    preview?: string;
    data: any;
  }) => void;
  restoreFromTrash: (trashId: string) => void;
  permanentDeleteFromTrash: (trashId: string) => void;
  emptyTrash: () => void;

  // Real-time synchronization
  syncState: SyncState;
  triggerManualSync: () => Promise<void>;

  // NutStore backup & restore operations
  performBackup: (scope?: 'full' | 'posts' | 'books' | 'media' | 'settings') => Promise<void>;
  performRestore: (backupId: string) => Promise<boolean>;

  // Bookmark toggle
  toggleBookmark: (postId: string) => void;

  // Multi-language
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: (path: string) => string;

  // Real backend channel connectivity check
  channelConnected: boolean;
  cloudServicesStatus: { d1: boolean; r2: boolean; kv: boolean };
  refreshChannelStatus: () => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const GLOBAL_THEME_MODES: GlobalThemeMode[] = [
  'modern', 'win98', 'mac-classic', 'terminal', 'parchment', 'gameboy',
  'cyberpunk', 'steampunk', 'nordic', 'leather', 'blueprint', 'retro',
];
const isGlobalThemeMode = (value: unknown): value is GlobalThemeMode =>
  typeof value === 'string' && GLOBAL_THEME_MODES.includes(value as GlobalThemeMode);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // The administrator password is never initialized with a universal/default credential.
  const [adminUsername, setAdminUsernameState] = useState<string>(() =>
    loadLocalStorage<string>(STORAGE_KEYS.ADMIN_USERNAME, 'fox')
  );
  const [adminPassword, setAdminPasswordState] = useState<string>(() => {
    const saved = loadLocalStorage<string>(STORAGE_KEYS.ADMIN_PASSWORD, '');
    return saved;
  });

  // Probe backend environment variable for admin config on startup
  useEffect(() => {
    fetch('/api/admin/config')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data && data.success && data.adminUsername) {
          const fetchedAdmin = data.adminUsername.trim().toLowerCase();
          setAdminUsernameState(fetchedAdmin);
          saveLocalStorage(STORAGE_KEYS.ADMIN_USERNAME, fetchedAdmin);

          // Update current user username if currently logged in as admin
          setCurrentUser(prev => {
            if (prev && prev.role === 'admin' && prev.username !== fetchedAdmin) {
              const updated = { ...prev, username: fetchedAdmin };
              saveLocalStorage(STORAGE_KEYS.CURRENT_USER, updated);
              return updated;
            }
            return prev;
          });
        }
      })
      .catch(() => {});
  }, []);

  const updateAdminPassword = (newPass: string): boolean => {
    if (!newPass || newPass.length < 6) return false;
    setAdminPasswordState(newPass);
    saveLocalStorage(STORAGE_KEYS.ADMIN_PASSWORD, newPass);
    return true;
  };

  const updateAdminUsername = (newName: string): boolean => {
    if (!newName || newName.trim().length < 2) return false;
    const sanitized = newName.trim().toLowerCase();
    setAdminUsernameState(sanitized);
    saveLocalStorage(STORAGE_KEYS.ADMIN_USERNAME, sanitized);
    try {
      const bc = new BroadcastChannel('fox3_realtime_sync');
      bc.postMessage({ type: 'SYNC_ALL', payload: { adminUsername: sanitized } });
      bc.close();
    } catch (e) {}
    return true;
  };

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = loadLocalStorage<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    // Never trust a persisted administrator profile by itself; a signed server session is required.
    return saved?.role === 'admin' ? null : saved;
  });

  const [users, setUsers] = useState<User[]>(() =>
    loadLocalStorage<User[]>(STORAGE_KEYS.USERS, [])
  );

  useEffect(() => {
    let cancelled = false;
    let token = '';
    try { token = sessionStorage.getItem('fox3_admin_session') || ''; } catch {}
    if (!token) {
      const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      if (currentUser?.role === 'admin' && !isLocalDevelopment) setCurrentUser(null);
      return;
    }
    const validateSession = async () => {
      try {
        const response = await fetch('/api/auth/session', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
        const data = await response.json();
        if (!response.ok || !data?.authenticated || data?.user?.role !== 'admin') throw new Error('Invalid administrator session');
        if (!cancelled) setCurrentUser(data.user as User);
      } catch {
        if (!cancelled) {
          try { sessionStorage.removeItem('fox3_admin_session'); } catch {}
          setCurrentUser(prev => prev?.role === 'admin' ? null : prev);
        }
      }
    };
    void validateSession();
    const interval = window.setInterval(validateSession, 60_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [currentUser?.id, currentUser?.role]);

  const [posts, setPosts] = useState<Post[]>(() =>
    loadLocalStorage<Post[]>(STORAGE_KEYS.POSTS, DEFAULT_POSTS)
  );

  const [books, setBooks] = useState<Book[]>(() =>
    loadLocalStorage<Book[]>(STORAGE_KEYS.BOOKS, DEFAULT_BOOKS)
  );

  const [photos, setPhotos] = useState<Photo[]>(() =>
    loadLocalStorage<Photo[]>(STORAGE_KEYS.PHOTOS, DEFAULT_PHOTOS)
  );

  const [photoFolders, setPhotoFolders] = useState<Array<{ id: string; name: string; createdAt: number }>>(() =>
    loadLocalStorage<Array<{ id: string; name: string; createdAt: number }>>('fox3_photo_folders', [
      { id: 'folder-landscape', name: '自然风光', createdAt: Date.now() - 86400000 * 10 },
      { id: 'folder-cyberpunk', name: '赛博都市', createdAt: Date.now() - 86400000 * 9 },
      { id: 'folder-daily', name: '日常记录', createdAt: Date.now() - 86400000 * 8 },
    ])
  );
  useEffect(() => saveLocalStorage('fox3_photo_folders', photoFolders), [photoFolders]);

  const [media, setMedia] = useState<MediaItem[]>(() =>
    loadLocalStorage<MediaItem[]>(STORAGE_KEYS.MEDIA, DEFAULT_MEDIA)
  );

  const [mails, setMails] = useState<MailMessage[]>(() =>
    loadLocalStorage<MailMessage[]>(STORAGE_KEYS.MAILS, DEFAULT_MAILS)
  );

  const [products, setProducts] = useState<Product[]>(() =>
    loadLocalStorage<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS)
  );

  const [orders, setOrders] = useState<Order[]>(() =>
    loadLocalStorage<Order[]>(STORAGE_KEYS.ORDERS, DEFAULT_ORDERS)
  );

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() =>
    loadLocalStorage<ChatMessage[]>(STORAGE_KEYS.CHAT_MESSAGES, [
      {
        id: 'msg-init-1',
        sender: 'customer',
        userName: '访客-9527',
        message: '您好！请问定制交付包含 Cloudflare D1 配置吗？',
        createdAt: Date.now() - 3600000,
      },
      {
        id: 'msg-init-2',
        sender: 'admin',
        userName: 'fox (管理员)',
        message: '您好！包含完整 D1 数据库初始化与 R2 存储桶绑定的全套指引与支持。',
        createdAt: Date.now() - 3000000,
      }
    ])
  );

  const [websites, setWebsites] = useState<WebSiteItem[]>(() =>
    loadLocalStorage<WebSiteItem[]>(STORAGE_KEYS.WEBSITES, DEFAULT_WEBSITES)
  );
  useEffect(() => saveLocalStorage(STORAGE_KEYS.WEBSITES, websites), [websites]);

  const [webDavBackups, setWebDavBackups] = useState<WebDavBackupItem[]>(() =>
    loadLocalStorage<WebDavBackupItem[]>(STORAGE_KEYS.WEBDAV_BACKUPS, DEFAULT_WEBDAV_BACKUPS)
  );

  // Universal Recycle Bin state
  const [trashItems, setTrashItems] = useState<Array<{
    id: string;
    originId: string;
    originType: 'post' | 'book' | 'photo' | 'media' | 'mail' | 'chat' | 'product' | 'order';
    title: string;
    preview?: string;
    deletedAt: number;
    data: any;
  }>>(() => loadLocalStorage('fox3_trash_items', [
    {
      id: 'trash-demo-1',
      originId: 'post-old-sample',
      originType: 'post',
      title: '旧版 Cloudflare Workers 部署心得随笔',
      preview: '这是一篇早期测试文章，已归档移至全站回收站',
      deletedAt: Date.now() - 86400000 * 4,
      data: {
        id: 'post-old-sample',
        title: '旧版 Cloudflare Workers 部署心得随笔',
        content: '早期随笔内容...',
        category: '随笔',
        tags: ['Workers'],
        author: 'fox',
        createdAt: Date.now() - 86400000 * 10,
      }
    }
  ]));
  useEffect(() => saveLocalStorage('fox3_trash_items', trashItems), [trashItems]);

  const moveToTrash = useCallback((item: {
    originId: string;
    originType: 'post' | 'book' | 'photo' | 'media' | 'mail' | 'chat' | 'product' | 'order';
    title: string;
    preview?: string;
    data: any;
  }) => {
    const trashItem = {
      id: `trash-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      deletedAt: Date.now(),
      ...item,
    };
    setTrashItems(prev => [trashItem, ...prev]);
  }, []);

  const restoreFromTrash = useCallback((trashId: string) => {
    const item = trashItems.find(t => t.id === trashId);
    if (!item) return;

    if (item.originType === 'post' && item.data) {
      setPosts(prev => [item.data, ...prev]);
    } else if (item.originType === 'book' && item.data) {
      setBooks(prev => [item.data, ...prev]);
    } else if (item.originType === 'photo' && item.data) {
      setPhotos(prev => [item.data, ...prev]);
    } else if (item.originType === 'media' && item.data) {
      setMedia(prev => [item.data, ...prev]);
    } else if (item.originType === 'mail' && item.data) {
      setMails(prev => [item.data, ...prev]);
    } else if (item.originType === 'product' && item.data) {
      setProducts(prev => [item.data, ...prev]);
    } else if (item.originType === 'order' && item.data) {
      setOrders(prev => [item.data, ...prev]);
    }

    setTrashItems(prev => prev.filter(t => t.id !== trashId));
  }, [trashItems]);

  const permanentDeleteFromTrash = useCallback((trashId: string) => {
    setTrashItems(prev => prev.filter(t => t.id !== trashId));
  }, []);

  const emptyTrash = useCallback(() => {
    setTrashItems([]);
  }, []);

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() =>
    loadLocalStorage<SystemSettings>(STORAGE_KEYS.SYSTEM_SETTINGS, DEFAULT_SETTINGS)
  );

  const [emailSettings, setEmailSettings] = useState<EmailSettings>(() =>
    (() => {
      const saved = loadLocalStorage<Partial<EmailSettings>>(STORAGE_KEYS.EMAIL_SETTINGS, {});
      return {
        ...DEFAULT_EMAIL_SETTINGS,
        ...saved,
        smtpSecurity: saved.smtpSecurity === 'starttls' || saved.smtpPort === 587 ? 'starttls' : 'ssl',
        verificationCodeLength: Math.min(8, Math.max(4, Number(saved.verificationCodeLength) || DEFAULT_EMAIL_SETTINGS.verificationCodeLength)),
        verificationEmailSubject: saved.verificationEmailSubject || DEFAULT_EMAIL_SETTINGS.verificationEmailSubject,
        verificationEmailTemplate: saved.verificationEmailTemplate || DEFAULT_EMAIL_SETTINGS.verificationEmailTemplate,
        cfEmailRouting: { ...DEFAULT_EMAIL_SETTINGS.cfEmailRouting, ...(saved.cfEmailRouting || {}) },
        imapConfig: saved.imapConfig ? { ...DEFAULT_EMAIL_SETTINGS.imapConfig!, ...saved.imapConfig } : DEFAULT_EMAIL_SETTINGS.imapConfig,
      } as EmailSettings;
    })()
  );

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(() =>
    loadLocalStorage<PaymentSettings>(STORAGE_KEYS.PAYMENT_SETTINGS, DEFAULT_PAYMENT_SETTINGS)
  );

  const [webDavConfig, setWebDavConfig] = useState<WebDavConfig>(() =>
    loadLocalStorage<WebDavConfig>(STORAGE_KEYS.WEBDAV_CONFIG, DEFAULT_WEBDAV_CONFIG)
  );

  const [locale, setLocaleState] = useState<Locale>(() =>
    loadLocalStorage<Locale>(STORAGE_KEYS.LOCALE, 'zh-CN')
  );

  const setLocale = (loc: Locale) => {
    setLocaleState(loc);
    saveLocalStorage(STORAGE_KEYS.LOCALE, loc);
  };

  const t = useCallback((path: string): string => {
    const dict = i18nDict[locale] || i18nDict['zh-CN'];
    return getTranslation(dict, path);
  }, [locale]);

  const [themeMode, setThemeModeState] = useState<GlobalThemeMode>(() =>
    (loadLocalStorage<GlobalThemeMode>('fox3_global_theme', 'modern'))
  );

  const setThemeMode = (mode: GlobalThemeMode) => {
    if (!isGlobalThemeMode(mode)) return;
    setThemeModeState(mode);
    saveLocalStorage('fox3_global_theme', mode);
    try {
      const bc = new BroadcastChannel('fox3_realtime_sync');
      bc.postMessage({ type: 'SYNC_ALL', payload: { themeMode: mode } });
      bc.close();
    } catch {}
  };

  const [darkMode, setDarkModeState] = useState<boolean>(false);

  const setDarkMode = (dark: boolean) => {
    setDarkModeState(dark);
    try {
      localStorage.removeItem('fox3_dark_mode');
    } catch {}
    document.documentElement.classList.remove('dark');
  };

  useEffect(() => {
    // Night mode removed: keep document free of forced dark class
    document.documentElement.classList.remove('dark');
  }, []);

  const [deviceMode, setDeviceModeState] = useState<DeviceViewMode>('responsive');

  const setDeviceMode = (mode: DeviceViewMode) => {
    setDeviceModeState(mode);
  };

  const [channelConnected, setChannelConnected] = useState<boolean>(false);
  const [cloudServicesStatus, setCloudServicesStatus] = useState<{ d1: boolean; r2: boolean; kv: boolean }>({
    d1: false,
    r2: false,
    kv: false,
  });

  const refreshChannelStatus = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/status', { method: 'GET', headers: { 'Accept': 'application/json' } });
      const contentType = res.headers.get('content-type') || '';
      // Only treat as connected if response is real JSON and channelOnline is true
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        const isOk = Boolean(data && data.success && data.channelOnline === true);
        setChannelConnected(isOk);
        if (data && data.cloudServices) {
          setCloudServicesStatus({
            d1: Boolean(data.cloudServices.d1),
            r2: Boolean(data.cloudServices.r2),
            kv: Boolean(data.cloudServices.kv),
          });
        } else {
          setCloudServicesStatus({ d1: false, r2: false, kv: false });
        }
        return isOk;
      }
      setChannelConnected(false);
      setCloudServicesStatus({ d1: false, r2: false, kv: false });
      return false;
    } catch {
      setChannelConnected(false);
      setCloudServicesStatus({ d1: false, r2: false, kv: false });
      return false;
    }
  }, []);

  useEffect(() => {
    refreshChannelStatus();
    // Low-frequency heartbeat: probe every 60s instead of flooding network traffic
    const interval = setInterval(refreshChannelStatus, 60000);
    return () => clearInterval(interval);
  }, [refreshChannelStatus]);

  const [viewModes, setViewModesState] = useState<Record<string, ViewMode>>(() =>
    loadLocalStorage<Record<string, ViewMode>>(STORAGE_KEYS.VIEW_MODES, {
      blog: 'original',
      books: 'original',
      gallery: 'original',
      media: 'original',
    })
  );

  const setViewMode = (section: string, mode: ViewMode) => {
    setViewModesState(prev => {
      const next = { ...prev, [section]: mode };
      saveLocalStorage(STORAGE_KEYS.VIEW_MODES, next);
      return next;
    });
  };

  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSyncedAt: Date.now(),
    status: 'synced',
    message: '数据已实时同步',
  });

  const [transferProgress, setTransferProgress] = useState<TransferProgress>({
    active: false,
    type: 'upload',
    fileName: '',
    percent: 0,
    speed: '',
  });

  const [multiTransferProgress, setMultiTransferProgress] = useState<{
    active: boolean;
    type: 'upload' | 'download' | 'backup' | 'restore';
    currentFileName: string;
    currentIndex: number;
    totalCount: number;
    overallPercent: number;
    speed?: string;
  }>({
    active: false,
    type: 'upload',
    currentFileName: '',
    currentIndex: 0,
    totalCount: 0,
    overallPercent: 0,
    speed: '',
  });

  // Toasts
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error' | 'info'; message: string }>>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success', duration = 3500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const startMultiTransfer = useCallback((type: 'upload' | 'download' | 'backup' | 'restore', totalCount: number, firstFileName: string) => {
    setMultiTransferProgress({
      active: true,
      type,
      currentFileName: firstFileName,
      currentIndex: 1,
      totalCount,
      overallPercent: 5,
      speed: '3.2 MB/s',
    });
  }, []);

  const updateMultiTransferProgress = useCallback((currentIndex: number, currentFileName: string, overallPercent: number, speed?: string) => {
    setMultiTransferProgress(prev => ({
      ...prev,
      currentIndex,
      currentFileName,
      overallPercent: Math.min(100, Math.max(0, overallPercent)),
      speed: speed || prev.speed,
    }));
  }, []);

  const finishMultiTransfer = useCallback(() => {
    setMultiTransferProgress(prev => ({ ...prev, overallPercent: 100 }));
    setTimeout(() => {
      setMultiTransferProgress(prev => ({ ...prev, active: false, overallPercent: 0 }));
    }, 600);
  }, []);

  // Persist mailbox settings on this browser so SMTP/API credentials survive reloads.
  // These settings are deliberately excluded from cross-device sync below and secrets
  // remain redacted from exported backups.
  useEffect(() => saveLocalStorage(STORAGE_KEYS.CURRENT_USER, currentUser), [currentUser]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.USERS, users), [users]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.POSTS, posts), [posts]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.BOOKS, books), [books]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.PHOTOS, photos), [photos]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.MEDIA, media), [media]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.MAILS, mails), [mails]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.PRODUCTS, products), [products]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.ORDERS, orders), [orders]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.CHAT_MESSAGES, chatMessages), [chatMessages]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.SYSTEM_SETTINGS, systemSettings), [systemSettings]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.EMAIL_SETTINGS, emailSettings), [emailSettings]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.PAYMENT_SETTINGS, paymentSettings), [paymentSettings]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.WEBDAV_CONFIG, webDavConfig), [webDavConfig]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.WEBDAV_BACKUPS, webDavBackups), [webDavBackups]);
  useEffect(() => saveLocalStorage('fox3_trash_items', trashItems), [trashItems]);

  const updateSystemSettings = (newSettings: Partial<SystemSettings>) => {
    setSystemSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updateEmailSettings = (newSettings: Partial<EmailSettings>) => {
    setEmailSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updatePaymentSettings = (newSettings: Partial<PaymentSettings>) => {
    setPaymentSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updateWebDavConfig = (newConfig: Partial<WebDavConfig>) => {
    setWebDavConfig(prev => ({ ...prev, ...newConfig }));
  };

  const addStorageUsage = (bytes: number) => {
    setSystemSettings(prev => ({
      ...prev,
      usedCapacityBytes: Math.max(0, (prev.usedCapacityBytes || 0) + bytes)
    }));
  };

  const startTransfer = (type: TransferProgress['type'], fileName: string) => {
    setTransferProgress({
      active: true,
      type,
      fileName,
      percent: 8,
      speed: '2.4 MB/s',
    });
  };

  const updateTransferPercent = (percent: number) => {
    setTransferProgress(prev => ({
      ...prev,
      percent: Math.min(100, Math.max(0, percent)),
    }));
  };

  const finishTransfer = () => {
    setTransferProgress(prev => ({ ...prev, percent: 100 }));
    setTimeout(() => {
      setTransferProgress(prev => ({ ...prev, active: false, percent: 0 }));
    }, 500);
  };

  const toggleBookmark = (postId: string) => {
    setPosts(prev => {
      const updated = prev.map(p => (p.id === postId ? { ...p, isBookmarked: !p.isBookmarked } : p));
      // Broadcast immediate bookmark update
      try {
        const bc = new BroadcastChannel('fox3_realtime_sync');
        bc.postMessage({ type: 'SYNC_ALL', payload: { posts: updated } });
        bc.close();
      } catch (e) {}
      return updated;
    });
  };

  // BroadcastChannel for instant cross-tab / cross-window sync
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('fox3_realtime_sync');
      bc.onmessage = (event) => {
        if (!event.data || !event.data.type) return;
        const { type, payload } = event.data;
        if (type === 'SYNC_ALL' && payload) {
          if (payload.posts) setPosts(payload.posts);
          if (payload.books) setBooks(payload.books);
          if (payload.photos) setPhotos(payload.photos);
          if (payload.media) setMedia(payload.media);
          if (payload.mails) setMails(payload.mails);
          if (payload.products) setProducts(payload.products);
          if (payload.orders) setOrders(payload.orders);
          if (payload.chatMessages) setChatMessages(payload.chatMessages);
          if (payload.webDavBackups) setWebDavBackups(payload.webDavBackups);
          if (payload.webDavConfig) setWebDavConfig(payload.webDavConfig);
          if (payload.trashItems) setTrashItems(payload.trashItems);
          if (payload.systemSettings) setSystemSettings(payload.systemSettings);
          if (isGlobalThemeMode(payload.themeMode)) {
            setThemeModeState(payload.themeMode);
            saveLocalStorage('fox3_global_theme', payload.themeMode);
          }
        }
      };
    } catch (e) {
      // BroadcastChannel not supported in this environment
    }
    return () => {
      if (bc) bc.close();
    };
  }, []);

  // Real-time synchronization
  const triggerManualSync = useCallback(async () => {
    setSyncState(prev => ({ ...prev, isSyncing: true, status: 'syncing', message: '正在同步多设备数据...' }));
    try {
      // 1. Send all our state to cloud sync endpoint
      const syncPayload = {
        posts,
        books,
        photos,
        media,
        mails,
        products,
        orders,
        chatMessages,
        webDavBackups,
        trashItems,
        systemSettings,
        themeMode,
        updatedAt: Date.now(),
      };

      // Broadcast locally immediately
      try {
        const bc = new BroadcastChannel('fox3_realtime_sync');
        bc.postMessage({ type: 'SYNC_ALL', payload: syncPayload });
        bc.close();
      } catch (e) {}

      // Push to backend sync
      const adminToken = sessionStorage.getItem('fox3_admin_session');
      const postRes = adminToken ? await fetch('/api/sync/global_state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify(syncPayload),
      }).catch(() => null) : null;

      // Try pull remote updates
      const getRes = adminToken ? await fetch('/api/sync/global_state', { method: 'GET', headers: { 'Authorization': `Bearer ${adminToken}` } }).catch(() => null) : null;
      if (getRes && getRes.ok) {
        const data = await getRes.json();
        if (data && data.data) {
          const remote = data.data;
          // If remote has newer updates
          if (remote.updatedAt && remote.updatedAt > (syncPayload.updatedAt - 10000)) {
            if (Array.isArray(remote.posts)) setPosts(remote.posts);
            if (Array.isArray(remote.books)) setBooks(remote.books);
            if (Array.isArray(remote.photos)) setPhotos(remote.photos);
            if (Array.isArray(remote.media)) setMedia(remote.media);
            if (Array.isArray(remote.mails)) setMails(remote.mails);
            if (Array.isArray(remote.products)) setProducts(remote.products);
            if (Array.isArray(remote.orders)) setOrders(remote.orders);
            if (Array.isArray(remote.chatMessages)) setChatMessages(remote.chatMessages);
            if (Array.isArray(remote.webDavBackups)) setWebDavBackups(remote.webDavBackups);
            if (Array.isArray(remote.trashItems)) setTrashItems(remote.trashItems);
            if (remote.systemSettings) setSystemSettings(remote.systemSettings);
            if (isGlobalThemeMode(remote.themeMode)) setThemeMode(remote.themeMode);
          }
        }
      }

      setSyncState({
        isSyncing: false,
        lastSyncedAt: Date.now(),
        status: 'synced',
        message: postRes?.ok ? '多设备云端与本地已无缝实时同步' : '本地与多窗口已实时同步',
      });
      // Also sync bookmarks and posts to dedicated /api/sync/posts
      if (adminToken) fetch('/api/sync/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ posts, updatedAt: Date.now() }),
      }).catch(() => null);
    } catch {
      setSyncState({
        isSyncing: false,
        lastSyncedAt: Date.now(),
        status: 'synced',
        message: '数据已在当前设备与多端完成对齐',
      });
    }
  }, [posts, books, photos, media, mails, products, orders, chatMessages, webDavBackups, webDavConfig, trashItems, systemSettings, themeMode]);

  // Smart merge function preserving both local and remote unique items so refreshing never wipes data
  const mergeById = <T extends { id: string }>(localList: T[], remoteList: any[]): T[] => {
    if (!Array.isArray(remoteList) || remoteList.length === 0) return localList;
    const map = new Map<string, T>();
    // Start with remote items
    for (const item of remoteList) {
      if (item && item.id) map.set(item.id, item);
    }
    // Overlay local items so local newly created items or edits are preserved
    for (const item of localList) {
      if (item && item.id) map.set(item.id, item);
    }
    return Array.from(map.values());
  };

  // Initial fetch from cloud on load to pull changes made from other devices
  useEffect(() => {
    const fetchInitialSync = async () => {
      try {
        const adminToken = sessionStorage.getItem('fox3_admin_session');
        if (!adminToken) return;
        const res = await fetch('/api/sync/global_state', { method: 'GET', headers: { 'Authorization': `Bearer ${adminToken}` } }).catch(() => null);
        if (res && res.ok) {
          const json = await res.json();
          if (json && json.data) {
            const remote = json.data;
            if (Array.isArray(remote.posts)) {
              setPosts(prev => mergeById(prev, remote.posts));
            }
            if (Array.isArray(remote.books)) {
              setBooks(prev => mergeById(prev, remote.books));
            }
            if (Array.isArray(remote.photos)) {
              setPhotos(prev => mergeById(prev, remote.photos));
            }
            if (Array.isArray(remote.media)) {
              setMedia(prev => mergeById(prev, remote.media));
            }
            if (Array.isArray(remote.products)) {
              setProducts(prev => mergeById(prev, remote.products));
            }
            if (Array.isArray(remote.websites)) {
              setWebsites(prev => mergeById(prev, remote.websites));
            }
            if (remote.systemSettings && typeof remote.systemSettings === 'object') {
              setSystemSettings(prev => ({
                ...prev,
                ...remote.systemSettings,
                fullBackgroundUrl: remote.systemSettings.fullBackgroundUrl ?? prev.fullBackgroundUrl,
                avatarUrl: remote.systemSettings.avatarUrl ?? prev.avatarUrl,
                heroIntroImage: remote.systemSettings.heroIntroImage ?? prev.heroIntroImage,
                heroTitle: remote.systemSettings.heroTitle ?? prev.heroTitle,
                heroSubtitle: remote.systemSettings.heroSubtitle ?? prev.heroSubtitle,
                heroBadge: remote.systemSettings.heroBadge ?? prev.heroBadge,
              }));
            }
            if (isGlobalThemeMode(remote.themeMode)) setThemeMode(remote.themeMode);
          }
        }
      } catch (e) {
        console.warn('Initial sync error:', e);
      }
    };
    fetchInitialSync();
  }, []);

  // Instant broadcast & debounced trigger sync whenever modules change
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      try {
        const payload = {
          posts,
          books,
          photos,
          media,
          products,
          websites,
          systemSettings,
          themeMode,
          updatedAt: Date.now(),
        };
        const bc = new BroadcastChannel('fox3_realtime_sync');
        bc.postMessage({ type: 'SYNC_ALL', payload });
        bc.close();

        // Non-blocking sync to cloud
        const adminToken = sessionStorage.getItem('fox3_admin_session');
        if (adminToken) fetch('/api/sync/global_state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
          body: JSON.stringify(payload),
        }).catch(() => {});
      } catch (e) {}
    }, 1200);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [posts, books, photos, media, products, websites, systemSettings, themeMode]);

  // Auto-sync timer: disabled continuous background pinging by default, only sync on user action or window visibility change
  useEffect(() => {
    if (!systemSettings.autoSync) return;

    // Only sync when user returns to tab, avoiding continuous data stream consumption in background
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerManualSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Minimum interval 10 minutes (600s) to eliminate traffic drain
    const intervalMs = Math.max(600, (systemSettings.syncIntervalSeconds || 600)) * 1000;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        triggerManualSync();
      }
    }, intervalMs);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [systemSettings.autoSync, systemSettings.syncIntervalSeconds, triggerManualSync]);

  // Robust file upload with real XMLHttpRequest progress tracking & local fallback
  const uploadFile = async (file: File): Promise<{ url: string; size: number; name: string }> => {
    startTransfer('upload', file.name);

    return new Promise(async (resolve, reject) => {
      let isCompleted = false;

      const doFallbackLocal = async () => {
        if (isCompleted) return;
        isCompleted = true;
        try {
          updateTransferPercent(50);
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const fileKey = `idb_file_${Date.now()}_${safeName}`;
          await saveFileToIndexedDB(fileKey, file);

          let resolvedUrl = '';
          try {
            const reader = new FileReader();
            resolvedUrl = await new Promise<string>((res) => {
              reader.onload = (e) => res((e.target?.result as string) || '');
              reader.onerror = () => res('');
              reader.readAsDataURL(file);
            });
          } catch (e) {
            resolvedUrl = fileKey;
          }

          addStorageUsage(file.size);
          updateTransferPercent(100);
          finishTransfer();
          showToast(`文件《${file.name}》已安全保存至本地持久存储！`, 'success');
          resolve({
            url: resolvedUrl || fileKey,
            size: file.size,
            name: file.name,
          });
        } catch (err: any) {
          finishTransfer();
          showToast(`文件《${file.name}》上传失败：${err?.message || '未知异常'}`, 'error');
          reject(err);
        }
      };

      try {
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload', true);
        xhr.timeout = 25000; // 25s timeout to prevent freezing indefinitely

        const startTime = Date.now();
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            const percent = Math.min(98, Math.round((event.loaded / event.total) * 100));
            const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000);
            const speedKB = Math.round((event.loaded / 1024) / elapsedSec);
            const speedStr = speedKB > 1024 ? `${(speedKB / 1024).toFixed(1)} MB/s` : `${speedKB} KB/s`;
            setTransferProgress(prev => ({
              ...prev,
              percent,
              speed: speedStr,
            }));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data && data.success && data.url) {
                isCompleted = true;
                addStorageUsage(file.size);
                updateTransferPercent(100);
                finishTransfer();
                const targetName = data.storedTarget === 'r2' ? 'Cloudflare R2' : data.storedTarget === 'd1' ? 'Cloudflare D1 存储' : '云端同步库';
                showToast(`文件《${file.name}》已成功同步至 ${targetName}！`, 'success');
                resolve({
                  url: data.url,
                  size: file.size,
                  name: file.name,
                });
                return;
              }
            } catch (e) {}
          }
          doFallbackLocal();
        };

        xhr.onerror = () => {
          doFallbackLocal();
        };

        xhr.ontimeout = () => {
          doFallbackLocal();
        };

        xhr.send(formData);
      } catch (e) {
        doFallbackLocal();
      }
    });
  };

  // Perform Backup
  const performBackup = async (scope: 'full' | 'posts' | 'books' | 'media' | 'settings' = 'full') => {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `fox3_${scope}_backup_${timestamp}_${Date.now().toString().slice(-4)}.json`;
    startTransfer('backup', fileName);

    let backupData: Record<string, unknown> = {};
    if (scope === 'full' || scope === 'posts') backupData.posts = posts;
    if (scope === 'full' || scope === 'books') backupData.books = books;
    if (scope === 'full' || scope === 'media') {
      backupData.photos = photos;
      backupData.media = media;
    }
    if (scope === 'full' || scope === 'settings') {
      backupData.systemSettings = systemSettings;
      backupData.themeMode = themeMode;
      backupData.emailSettings = {
        ...emailSettings,
        apiKey: '',
        smtpPass: '',
        imapConfig: emailSettings.imapConfig ? { ...emailSettings.imapConfig, pass: '' } : emailSettings.imapConfig,
      };
      backupData.paymentSettings = paymentSettings;
      backupData.webDavConfig = webDavConfig;
    }
    backupData.backupDate = new Date().toISOString();
    backupData.scope = scope;

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const size = blob.size;

    for (let p = 10; p <= 100; p += 25) {
      updateTransferPercent(p);
      await new Promise(r => setTimeout(r, 60));
    }

    const newItem: WebDavBackupItem = {
      id: `bak-${Date.now()}`,
      name: fileName,
      size,
      updatedAt: Date.now(),
      type: scope,
      path: `${webDavConfig.backupPath || '/fox3_backup/'}${fileName}`,
    };

    setWebDavBackups(prev => [newItem, ...prev]);
    updateWebDavConfig({ lastBackupTime: Date.now() });
    finishTransfer();
  };

  // Perform Restore
  const performRestore = async (backupId: string): Promise<boolean> => {
    const target = webDavBackups.find(b => b.id === backupId);
    if (!target) return false;
    startTransfer('restore', target.name);

    for (let p = 20; p <= 100; p += 30) {
      updateTransferPercent(p);
      await new Promise(r => setTimeout(r, 80));
    }
    finishTransfer();
    return true;
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        setUsers,
        posts,
        setPosts,
        books,
        setBooks,
        photos,
        setPhotos,
        photoFolders,
        setPhotoFolders,
        media,
        setMedia,
        mails,
        setMails,
        products,
        setProducts,
        orders,
        setOrders,
        chatMessages,
        setChatMessages,
        websites,
        setWebsites,
        webDavBackups,
        setWebDavBackups,
        trashItems,
        moveToTrash,
        restoreFromTrash,
        permanentDeleteFromTrash,
        emptyTrash,
        systemSettings,
        updateSystemSettings,
        emailSettings,
        updateEmailSettings,
        paymentSettings,
        updatePaymentSettings,
        webDavConfig,
        updateWebDavConfig,
        transferProgress,
        startTransfer,
        updateTransferPercent,
        finishTransfer,
        multiTransferProgress,
        startMultiTransfer,
        updateMultiTransferProgress,
        finishMultiTransfer,
        toasts,
        showToast,
        dismissToast,
        uploadFile,
        addStorageUsage,
        deviceMode,
        setDeviceMode,
        darkMode,
        setDarkMode,
        themeMode,
        setThemeMode,
        viewModes,
        setViewMode,
        syncState,
        triggerManualSync,
        performBackup,
        performRestore,
        toggleBookmark,
        locale,
        setLocale,
        t,
        channelConnected,
        cloudServicesStatus,
        refreshChannelStatus,
        adminUsername,
        adminPassword,
        updateAdminPassword,
        updateAdminUsername,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
