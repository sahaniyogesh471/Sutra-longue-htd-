import fs from 'node:fs';
import Database from 'better-sqlite3';
import { DATA_DIR, DB_PATH } from '../config.js';
import { SCHEMA_SQL } from './schema.js';
import { DISH_NP, REVIEW_NP } from './translations.js';

export type DB = Database.Database;

let _db: DB | null = null;

export function getDb(): DB {
  if (_db) return _db;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  _db = db;
  return db;
}

/** Adds columns that were introduced after the initial schema. */
export function migrate(db: DB): void {
  const columnsOf = (table: string) => {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    return new Set(rows.map((r) => r.name));
  };

  const addCols: Record<string, { name: string; def: string }[]> = {
    dishes: [
      { name: 'name_np', def: "TEXT NOT NULL DEFAULT ''" },
      { name: 'description_np', def: "TEXT NOT NULL DEFAULT ''" },
      { name: 'category_np', def: "TEXT NOT NULL DEFAULT ''" },
      { name: 'badge_np', def: "TEXT NOT NULL DEFAULT ''" },
    ],
    dishes_baseline: [
      { name: 'name_np', def: "TEXT NOT NULL DEFAULT ''" },
      { name: 'description_np', def: "TEXT NOT NULL DEFAULT ''" },
      { name: 'category_np', def: "TEXT NOT NULL DEFAULT ''" },
      { name: 'badge_np', def: "TEXT NOT NULL DEFAULT ''" },
    ],
    dishes_draft: [
      { name: 'name_np', def: 'TEXT' },
      { name: 'description_np', def: 'TEXT' },
      { name: 'category_np', def: 'TEXT' },
      { name: 'badge_np', def: 'TEXT' },
    ],
    reviews: [
      { name: 'name_np', def: "TEXT NOT NULL DEFAULT ''" },
      { name: 'text_np', def: "TEXT NOT NULL DEFAULT ''" },
    ],
    reviews_baseline: [
      { name: 'name_np', def: "TEXT NOT NULL DEFAULT ''" },
      { name: 'text_np', def: "TEXT NOT NULL DEFAULT ''" },
    ],
    reviews_draft: [
      { name: 'name_np', def: 'TEXT' },
      { name: 'text_np', def: 'TEXT' },
    ],
  };

  for (const [table, cols] of Object.entries(addCols)) {
    const existing = columnsOf(table);
    for (const col of cols) {
      if (!existing.has(col.name)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.def}`);
      }
    }
  }

  backfillDishNp(db);
  backfillReviewNp(db);
  backfillSettings(db);
}

/**
 * Fills Nepali translations into existing rows whose name matches the seed
 * data and whose name_np is still empty. Idempotent and safe to re-run.
 */
function backfillDishNp(db: DB): void {
  const rows = db
    .prepare("SELECT id, name FROM dishes WHERE name_np = '' OR name_np IS NULL")
    .all() as { id: number; name: string }[];
  for (const r of rows) {
    const t = DISH_NP[r.name];
    if (!t) continue;
    db.prepare(
      "UPDATE dishes SET name_np=@name_np, description_np=@description_np, category_np=@category_np, badge_np=@badge_np, updated_at=datetime('now') WHERE id=@id"
    ).run({ ...t, id: r.id });
  }

  const base = db
    .prepare("SELECT id, name FROM dishes_baseline WHERE name_np = '' OR name_np IS NULL")
    .all() as { id: number; name: string }[];
  for (const r of base) {
    const t = DISH_NP[r.name];
    if (!t) continue;
    db.prepare(
      'UPDATE dishes_baseline SET name_np=@name_np, description_np=@description_np, category_np=@category_np, badge_np=@badge_np WHERE id=@id'
    ).run({ ...t, id: r.id });
  }
}

/**
 * Fills Nepali translations into existing review rows whose name matches the
 * seed data and whose text_np is still empty. Idempotent and safe to re-run.
 */
function backfillReviewNp(db: DB): void {
  const rows = db
    .prepare("SELECT id, name FROM reviews WHERE text_np = '' OR text_np IS NULL")
    .all() as { id: number; name: string }[];
  for (const r of rows) {
    const t = REVIEW_NP[r.name];
    if (!t) continue;
    db.prepare(
      "UPDATE reviews SET name_np=@name_np, text_np=@text_np, updated_at=datetime('now') WHERE id=@id"
    ).run({ ...t, id: r.id });
  }

  const base = db
    .prepare("SELECT id, name FROM reviews_baseline WHERE text_np = '' OR text_np IS NULL")
    .all() as { id: number; name: string }[];
  for (const r of base) {
    const t = REVIEW_NP[r.name];
    if (!t) continue;
    db.prepare(
      'UPDATE reviews_baseline SET name_np=@name_np, text_np=@text_np WHERE id=@id'
    ).run({ ...t, id: r.id });
  }
}

/** New settings keys added after the initial seed — safe to re-run. */
const DEFAULT_SETTINGS: Record<string, string> = {
  'design.primary_color': '#c9a35c',
};

function backfillSettings(db: DB): void {
  const rows = db.prepare('SELECT key FROM settings').all() as { key: string }[];
  const existing = new Set(rows.map((r) => r.key));
  // Fresh databases are handled by the full seed — backfill only applies to
  // already-seeded databases that were created before these keys existed.
  const hasRealContent = rows.some((r) => r.key !== 'system.revisionPointer' && !(r.key in DEFAULT_SETTINGS));
  if (!hasRealContent) return;
  const ins = db.prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))"
  );
  const insBase = db.prepare(
    "INSERT INTO settings_baseline (key, value, captured_at) VALUES (?, ?, datetime('now'))"
  );
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (existing.has(key)) continue;
    ins.run(key, value);
    insBase.run(key, value);
  }
}

export function initSchema(db: DB): void {  db.exec(SCHEMA_SQL);
  migrate(db);
}

/** Returns the currently published value of a settings key (or null). */
export function getSetting(db: DB, key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string | null }
    | undefined;
  return row ? row.value : null;
}

/** Returns the protected baseline value of a settings key (or null). */
export function getBaselineSetting(db: DB, key: string): string | null {
  const row = db.prepare('SELECT value FROM settings_baseline WHERE key = ?').get(key) as
    | { value: string | null }
    | undefined;
  return row ? row.value : null;
}

/** Upserts the published value of a settings key. */
export function setSetting(db: DB, key: string, value: string | null): void {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  ).run(key, value);
}

/** Upserts the protected baseline value of a settings key. */
export function setBaselineSetting(db: DB, key: string, value: string | null): void {
  db.prepare(
    `INSERT INTO settings_baseline (key, value, captured_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}
