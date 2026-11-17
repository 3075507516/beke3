-- Canonical published site content. Private data and WebDAV backup metadata belong elsewhere.
CREATE TABLE IF NOT EXISTS fox3_site_content (
  id TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  updatedAt INTEGER NOT NULL
);
