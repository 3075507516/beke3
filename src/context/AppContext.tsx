import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Post,
  Book,
  Photo,
  MediaItem,
  CloudFile,
  MailMessage,
  Product,
  Order,
  ChatMessage,
  SystemSettings,
  EmailSettings,
  PaymentSettings,
  WebDavConfig,
  User,
} from '../types';
import {
  STORAGE_KEYS,
  loadLocalStorage,
  saveLocalStorage,
  saveFileToIndexedDB,
  DEFAULT_SETTINGS,
  DEFAULT_ADMIN,
  DEFAULT_POSTS,
  DEFAULT_BOOKS,
  DEFAULT_PHOTOS,
  DEFAULT_MEDIA,
  DEFAULT_MAILS,
  DEFAULT_PRODUCTS,
  DEFAULT_ORDERS,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_EMAIL_SETTINGS,
  DEFAULT_WEBDAV_CONFIG,
} from '../utils/storage';

interface TransferProgress {
  active: boolean;
  type: 'upload' | 'download' | 'backup' | 'restore';
  fileName: string;
  percent: number;
  speed?: string;
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
  media: MediaItem[];
  setMedia: React.Dispatch<React.SetStateAction<MediaItem[]>>;
  files: CloudFile[];
  setFiles: React.Dispatch<React.SetStateAction<CloudFile[]>>;
  mails: MailMessage[];
  setMails: React.Dispatch<React.SetStateAction<MailMessage[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;

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

  // Fault-tolerant file uploader: attempts R2 first, then IndexedDB/Local preview URL. NEVER fails.
  uploadFile: (file: File) => Promise<{ url: string; size: number; name: string }>;

  // Storage size tracking
  addStorageUsage: (bytes: number) => void;

  // Device view switcher (auto / desktop / mobile)
  deviceMode: 'responsive' | 'mobile' | 'desktop';
  setDeviceMode: (mode: 'responsive' | 'mobile' | 'desktop') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    loadLocalStorage<User | null>(STORAGE_KEYS.CURRENT_USER, DEFAULT_ADMIN)
  );

  const [users, setUsers] = useState<User[]>(() =>
    loadLocalStorage<User[]>(STORAGE_KEYS.USERS, [DEFAULT_ADMIN])
  );

  const [posts, setPosts] = useState<Post[]>(() =>
    loadLocalStorage<Post[]>(STORAGE_KEYS.POSTS, DEFAULT_POSTS)
  );

  const [books, setBooks] = useState<Book[]>(() =>
    loadLocalStorage<Book[]>(STORAGE_KEYS.BOOKS, DEFAULT_BOOKS)
  );

  const [photos, setPhotos] = useState<Photo[]>(() =>
    loadLocalStorage<Photo[]>(STORAGE_KEYS.PHOTOS, DEFAULT_PHOTOS)
  );

  const [media, setMedia] = useState<MediaItem[]>(() =>
    loadLocalStorage<MediaItem[]>(STORAGE_KEYS.MEDIA, DEFAULT_MEDIA)
  );

  const [files, setFiles] = useState<CloudFile[]>(() =>
    loadLocalStorage<CloudFile[]>(STORAGE_KEYS.FILES, [])
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

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() =>
    loadLocalStorage<SystemSettings>(STORAGE_KEYS.SYSTEM_SETTINGS, DEFAULT_SETTINGS)
  );

  const [emailSettings, setEmailSettings] = useState<EmailSettings>(() =>
    loadLocalStorage<EmailSettings>(STORAGE_KEYS.EMAIL_SETTINGS, DEFAULT_EMAIL_SETTINGS)
  );

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(() =>
    loadLocalStorage<PaymentSettings>(STORAGE_KEYS.PAYMENT_SETTINGS, DEFAULT_PAYMENT_SETTINGS)
  );

  const [webDavConfig, setWebDavConfig] = useState<WebDavConfig>(() =>
    loadLocalStorage<WebDavConfig>(STORAGE_KEYS.WEBDAV_CONFIG, DEFAULT_WEBDAV_CONFIG)
  );

  const [deviceMode, setDeviceMode] = useState<'responsive' | 'mobile' | 'desktop'>('responsive');

  // Transfer progress state - only visible during operations
  const [transferProgress, setTransferProgress] = useState<TransferProgress>({
    active: false,
    type: 'upload',
    fileName: '',
    percent: 0,
    speed: '',
  });

  // Sync to local storage on changes
  useEffect(() => saveLocalStorage(STORAGE_KEYS.CURRENT_USER, currentUser), [currentUser]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.USERS, users), [users]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.POSTS, posts), [posts]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.BOOKS, books), [books]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.PHOTOS, photos), [photos]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.MEDIA, media), [media]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.FILES, files), [files]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.MAILS, mails), [mails]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.PRODUCTS, products), [products]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.ORDERS, orders), [orders]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.CHAT_MESSAGES, chatMessages), [chatMessages]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.SYSTEM_SETTINGS, systemSettings), [systemSettings]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.EMAIL_SETTINGS, emailSettings), [emailSettings]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.PAYMENT_SETTINGS, paymentSettings), [paymentSettings]);
  useEffect(() => saveLocalStorage(STORAGE_KEYS.WEBDAV_CONFIG, webDavConfig), [webDavConfig]);

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
      percent: 5,
      speed: '1.2 MB/s',
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
    }, 600);
  };

  // Zero-failure file upload function: R2 -> IndexedDB/DataURI fallback
  const uploadFile = async (file: File): Promise<{ url: string; size: number; name: string }> => {
    startTransfer('upload', file.name);

    return new Promise((resolve) => {
      let currentP = 15;
      const interval = setInterval(() => {
        currentP += Math.floor(Math.random() * 20) + 15;
        if (currentP >= 90) {
          clearInterval(interval);
        } else {
          updateTransferPercent(currentP);
        }
      }, 100);

      const doFallbackLocal = async () => {
        try {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const dataUrl = e.target?.result as string;
            const fileKey = `idb_file_${Date.now()}_${file.name}`;
            await saveFileToIndexedDB(fileKey, file);
            addStorageUsage(file.size);
            clearInterval(interval);
            finishTransfer();
            resolve({
              url: dataUrl,
              size: file.size,
              name: file.name,
            });
          };
          reader.readAsDataURL(file);
        } catch (err) {
          const blobUrl = URL.createObjectURL(file);
          addStorageUsage(file.size);
          clearInterval(interval);
          finishTransfer();
          resolve({
            url: blobUrl,
            size: file.size,
            name: file.name,
          });
        }
      };

      // Attempt Cloudflare R2 Upload if API is active
      const formData = new FormData();
      formData.append('file', file);

      fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
        .then(async res => {
          if (!res.ok) {
            return doFallbackLocal();
          }
          const data = await res.json();
          if (data && data.success && data.url) {
            addStorageUsage(file.size);
            clearInterval(interval);
            finishTransfer();
            resolve({
              url: data.url,
              size: file.size,
              name: file.name,
            });
          } else {
            doFallbackLocal();
          }
        })
        .catch(() => {
          // If server is not running or R2 not bound, fallback seamlessly
          doFallbackLocal();
        });
    });
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
        media,
        setMedia,
        files,
        setFiles,
        mails,
        setMails,
        products,
        setProducts,
        orders,
        setOrders,
        chatMessages,
        setChatMessages,
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
        uploadFile,
        addStorageUsage,
        deviceMode,
        setDeviceMode,
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
