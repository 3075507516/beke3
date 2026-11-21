-- Soft-delete support chat conversations into a recoverable trash view.
ALTER TABLE fox3_conversations ADD COLUMN deletedAt INTEGER;
CREATE INDEX IF NOT EXISTS fox3_conversations_deleted_updated ON fox3_conversations(deletedAt, updatedAt DESC);
