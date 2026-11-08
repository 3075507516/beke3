// Core data models for fox3 blog

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: number;
  avatar?: string;
  status: 'active' | 'disabled';
}

export interface Post {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  cover: string;
  author: string;
  views: number;
  likes: number;
  isBookmarked?: boolean;
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  format: 'EPUB' | 'PDF' | 'TXT' | 'MOBI' | 'AZW3' | string;
  cover: string;
  description: string;
  fileSize: number;
  fileUrl: string;
  content?: string; // Text content if previewable
  progress?: number;
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface Photo {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  category: string;
  width?: number;
  height?: number;
  description?: string;
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface MediaItem {
  id: string;
  type: 'audio' | 'video';
  title: string;
  artist: string;
  src: string;
  cover: string;
  duration: string;
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface CloudFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  folder: string;
  provider: 'r2' | 'd1' | 'local' | 'webdav';
  createdAt: number;
  updatedAt: number;
}

export interface MailMessage {
  id: string;
  folder: 'inbox' | 'sent' | 'trash';
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  isStarred: boolean;
  isCodeVerify?: boolean;
  code?: string;
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  stock: number;
  tags?: string[];
  showcaseId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Order {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  totalPrice: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: 'paypal' | 'worldfirst' | 'wechat' | 'alipay' | 'pending';
  status: 'paid' | 'unpaid' | 'shipped' | 'completed' | 'cancelled';
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  sender: 'customer' | 'admin';
  userName: string;
  userEmail?: string;
  message: string;
  createdAt: number;
}

export interface WebDavConfig {
  enabled: boolean;
  provider: 'nutstore' | 'generic'; // 坚果云或通用 WebDAV
  serverUrl: string;
  username: string;
  password: string;
  backupPath: string;
  lastBackupTime?: number;
}

export interface EmailSettings {
  enabled: boolean;
  provider: 'resend' | 'sendgrid' | 'smtp' | 'custom';
  apiKey: string;
  apiEndpoint: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  senderEmail: string;
  autoReplyEnabled: boolean;
  rateLimitEnabled: boolean;
  maxDailyEmails: number;
  cfEmailRouting: {
    enabled: boolean;
    routingAddress: string;
    forwardTo: string;
    webhookUrl: string;
  };
}

export interface SystemSettings {
  siteName: string;
  themeColor: string;
  customPaletteBg?: string;
  fullBackgroundUrl?: string;
  avatarUrl?: string;
  heroIntroImage?: string;
  heroBadge?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  hideNonBlogForGuests: boolean;
  emailRegistrationOnly: boolean;
  allowRegistration: boolean;
  totalCapacityBytes: number;
  usedCapacityBytes: number;
}

export interface PaymentSettings {
  paypal: {
    enabled: boolean;
    clientId: string;
    secret: string;
    mode: 'sandbox' | 'live';
  };
  worldfirst: {
    enabled: boolean;
    partnerId: string;
    privateKey: string;
  };
  wechatPay: {
    enabled: boolean;
    appId: string;
    mchId: string;
    apiKey: string;
  };
  alipay: {
    enabled: boolean;
    appId: string;
    privateKey: string;
    alipayPublicKey: string;
  };
}
