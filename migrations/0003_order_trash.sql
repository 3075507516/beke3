-- Soft-delete orders into a recoverable trash view. Order/payment audit rows are never physically removed.
ALTER TABLE fox3_orders ADD COLUMN deletedAt INTEGER;
CREATE INDEX IF NOT EXISTS fox3_orders_deleted_created ON fox3_orders(deletedAt, createdAt DESC);
