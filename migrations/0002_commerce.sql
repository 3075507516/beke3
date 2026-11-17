-- Persistent commerce, verified payment events, private support chat, notifications and editable legal pages.
-- Keep this data separate from fox3_site_content, the public site-content snapshot and WebDAV backups.
CREATE TABLE IF NOT EXISTS fox3_orders (
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
);
CREATE INDEX IF NOT EXISTS fox3_orders_user_created ON fox3_orders(userId, createdAt DESC);
CREATE INDEX IF NOT EXISTS fox3_orders_status_created ON fox3_orders(status, createdAt DESC);

CREATE TABLE IF NOT EXISTS fox3_payment_events (
  eventId TEXT NOT NULL,
  provider TEXT NOT NULL,
  orderId TEXT NOT NULL,
  receivedAt INTEGER NOT NULL,
  PRIMARY KEY (provider, eventId)
);

CREATE TABLE IF NOT EXISTS fox3_conversations (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS fox3_chat_messages (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL,
  senderId TEXT NOT NULL,
  senderRole TEXT NOT NULL,
  senderName TEXT NOT NULL,
  message TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  readAt INTEGER
);
CREATE INDEX IF NOT EXISTS fox3_chat_messages_conversation ON fox3_chat_messages(conversationId, createdAt);

CREATE TABLE IF NOT EXISTS fox3_notifications (
  id TEXT PRIMARY KEY,
  recipientRole TEXT NOT NULL,
  recipientId TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  refId TEXT NOT NULL DEFAULT '',
  createdAt INTEGER NOT NULL,
  readAt INTEGER
);
CREATE INDEX IF NOT EXISTS fox3_notifications_recipient ON fox3_notifications(recipientRole, recipientId, readAt, createdAt DESC);

CREATE TABLE IF NOT EXISTS fox3_legal_pages (
  pageKey TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS fox3_payment_preferences (
  id TEXT PRIMARY KEY,
  adminEmail TEXT NOT NULL DEFAULT '',
  notifyEmail INTEGER NOT NULL DEFAULT 0,
  updatedAt INTEGER NOT NULL
);
