export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================
-- ADMIN USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  display_name  TEXT    NOT NULL DEFAULT '',
  role          TEXT    NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','editor')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- SITE SETTINGS  (key/value pairs)
--   settings          -> current published value
--   settings_baseline -> protected ORIGINAL value
--   settings_draft    -> staged (unpublished) overrides
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings_baseline (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  captured_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings_draft (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- DISHES
--   dishes           -> current published rows
--   dishes_baseline  -> protected original rows
--   dishes_draft     -> staged rows (upsert/delete ops)
-- ============================================================
CREATE TABLE IF NOT EXISTS dishes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT    NOT NULL CHECK (type IN ('signature','bestseller')),
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  name_np        TEXT    NOT NULL DEFAULT '',
  description_np TEXT    NOT NULL DEFAULT '',
  price       TEXT,
  category    TEXT,
  category_np TEXT    NOT NULL DEFAULT '',
  badge       TEXT,
  badge_np    TEXT    NOT NULL DEFAULT '',
  image_url   TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_visible  INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dishes_baseline (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  baseline_ref INTEGER,
  type        TEXT    NOT NULL,
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  name_np        TEXT    NOT NULL DEFAULT '',
  description_np TEXT    NOT NULL DEFAULT '',
  price       TEXT,
  category    TEXT,
  category_np TEXT    NOT NULL DEFAULT '',
  badge       TEXT,
  badge_np    TEXT    NOT NULL DEFAULT '',
  image_url   TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  captured_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dishes_draft (
  draft_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  row_id      INTEGER,
  op          TEXT NOT NULL DEFAULT 'upsert' CHECK (op IN ('upsert','delete')),
  type        TEXT,
  name        TEXT,
  description TEXT,
  name_np        TEXT,
  description_np TEXT,
  price       TEXT,
  category    TEXT,
  category_np TEXT,
  badge       TEXT,
  badge_np    TEXT,
  image_url   TEXT,
  is_featured INTEGER,
  is_visible  INTEGER,
  sort_order  INTEGER,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  text       TEXT NOT NULL,
  name_np    TEXT NOT NULL DEFAULT '',
  text_np    TEXT NOT NULL DEFAULT '',
  rating     INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  image_url  TEXT,
  is_visible INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews_baseline (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  baseline_ref INTEGER,
  name        TEXT NOT NULL,
  text        TEXT NOT NULL,
  name_np     TEXT NOT NULL DEFAULT '',
  text_np     TEXT NOT NULL DEFAULT '',
  rating      INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  image_url   TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  captured_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews_draft (
  draft_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  row_id      INTEGER,
  op          TEXT NOT NULL DEFAULT 'upsert' CHECK (op IN ('upsert','delete')),
  name        TEXT,
  text        TEXT,
  name_np     TEXT,
  text_np     TEXT,
  rating      INTEGER,
  image_url   TEXT,
  is_visible  INTEGER,
  sort_order  INTEGER,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- GALLERY / MEDIA ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS gallery (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  image_url   TEXT NOT NULL,
  alt         TEXT NOT NULL DEFAULT '',
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_visible  INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gallery_baseline (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  baseline_ref INTEGER,
  image_url    TEXT NOT NULL,
  alt          TEXT NOT NULL DEFAULT '',
  is_featured  INTEGER NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  captured_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gallery_draft (
  draft_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  row_id       INTEGER,
  op           TEXT NOT NULL DEFAULT 'upsert' CHECK (op IN ('upsert','delete')),
  image_url    TEXT,
  alt          TEXT,
  is_featured  INTEGER,
  is_visible   INTEGER,
  sort_order   INTEGER,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- OPENING HOURS  (day_index 0 = Monday ... 6 = Sunday)
-- ============================================================
CREATE TABLE IF NOT EXISTS opening_hours (
  day_index  INTEGER PRIMARY KEY CHECK (day_index BETWEEN 0 AND 6),
  day_name   TEXT NOT NULL,
  is_open    INTEGER NOT NULL DEFAULT 1,
  open_time  TEXT,
  close_time TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS opening_hours_baseline (
  day_index  INTEGER PRIMARY KEY CHECK (day_index BETWEEN 0 AND 6),
  day_name   TEXT NOT NULL,
  is_open    INTEGER NOT NULL DEFAULT 1,
  open_time  TEXT,
  close_time TEXT,
  captured_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS opening_hours_draft (
  day_index  INTEGER PRIMARY KEY CHECK (day_index BETWEEN 0 AND 6),
  day_name   TEXT,
  is_open    INTEGER,
  open_time  TEXT,
  close_time TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- REVISIONS  (persistent history for undo / redo / restore)
--   snapshot stores full JSON state of the affected section
--   so any prior state can be restored after page reload.
-- ============================================================
CREATE TABLE IF NOT EXISTS revisions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT NOT NULL,
  action     TEXT NOT NULL,
  snapshot   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT
);

-- ============================================================
-- SESSIONS  (server-side session store; binaries never here)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

-- ============================================================
-- MEDIA METADATA  (uploaded files; binaries stored on disk)
-- ============================================================
CREATE TABLE IF NOT EXISTS media (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name   TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  url_path    TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  size_bytes  INTEGER NOT NULL DEFAULT 0,
  width       INTEGER,
  height      INTEGER,
  alt         TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
