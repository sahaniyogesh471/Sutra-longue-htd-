import fs from 'node:fs';
import Database from 'libsql';
import { DATA_DIR, DB_PATH, TURSO_URL, TURSO_AUTH_TOKEN } from '../config.js';
import { SCHEMA_SQL } from './schema.js';
import { DISH_NP, REVIEW_NP } from './translations.js';

export type DB = Database.Database;

let _db: DB | null = null;

/**
 * Opens the database.
 *
 * Two modes, chosen by environment:
 *  - **Turso (remote)** when TURSO_URL is set — used in production on hosts with
 *    an ephemeral filesystem, so content survives restarts and redeploys.
 *  - **Local SQLite file** otherwise — used for development.
 *
 * `libsql` is a drop-in, fully synchronous replacement for `better-sqlite3`, so
 * every existing `.prepare().get()/.all()/.run()` call and `db.transaction()`
 * keeps working unchanged.
 */
export function getDb(): DB {
  if (_db) return _db;

  if (TURSO_URL) {
    // Remote Turso database. WAL/journal settings are managed server-side and
    // do not apply to a remote connection.
    if (!/^libsql:\/\/|^https:\/\//.test(TURSO_URL)) {
      throw new Error(
        `TURSO_URL must start with "libsql://" (or "https://"). Got: "${TURSO_URL.slice(0, 30)}..."`
      );
    }
    if (!TURSO_AUTH_TOKEN) {
      throw new Error('TURSO_URL is set but TURSO_AUTH_TOKEN is empty — the connection would be rejected.');
    }

    // `authToken` is cast because libsql ships better-sqlite3's type
    // definitions, which omit the option — the runtime does read it
    // (node_modules/libsql/index.js: `opts?.authToken`).
    const db = new Database(TURSO_URL, {
      authToken: TURSO_AUTH_TOKEN,
    } as ConstructorParameters<typeof Database>[1]);

    try {
      db.pragma('foreign_keys = ON');
    } catch (err) {
      // libsql surfaces a bad Authorization header as an opaque
      // `InvalidHeaderValue`. Translate it into something actionable.
      const msg = String((err as Error)?.message ?? err);
      if (msg.includes('InvalidHeaderValue')) {
        throw new Error(
          'Could not connect to Turso: the auth token contains an invalid character ' +
            '(usually a line break pasted along with the token). Re-copy TURSO_AUTH_TOKEN ' +
            'as a single line with no spaces or newlines, then redeploy.'
        );
      }
      throw err;
    }

    _db = db;
    return db;
  }

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
    try {
      const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
      return new Set(rows.map((r) => r.name));
    } catch {
      // Some remote backends do not expose PRAGMA through prepared statements.
      // Fall back to reading the stored CREATE TABLE definition.
      const row = db
        .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`)
        .get(table) as { sql?: string } | undefined;
      const names = new Set<string>();
      if (row?.sql) {
        const body = row.sql.slice(row.sql.indexOf('(') + 1, row.sql.lastIndexOf(')'));
        for (const part of body.split(',')) {
          const m = part.trim().match(/^["`[]?([A-Za-z_][A-Za-z0-9_]*)["`\]]?/);
          if (m) names.add(m[1]);
        }
      }
      return names;
    }
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

export function initSchema(db: DB): void {
  // A remote Turso connection rejects PRAGMA statements with
  // `Sqlite3UnsupportedStatement` — journal mode and foreign-key enforcement
  // are managed server-side there. They are only meaningful for a local file,
  // where getDb() already applies them, so strip them from the schema script.
  const sql = TURSO_URL
    ? SCHEMA_SQL.replace(/^[ \t]*PRAGMA[^;]*;[ \t]*$/gim, '')
    : SCHEMA_SQL;
  db.exec(sql);
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
