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
  dropBlankSettingKeys(db);
  backfillSettings(db);
  repairMissingUploads(db);
  removePlaceholderReviews(db);
}

/**
 * Removes the four invented testimonials that shipped with the original demo
 * content. They were never real customers, so publishing them breaches Google's
 * review policies and consumer-protection rules. Matching is deliberately
 * strict — name AND the exact seeded text — so a genuine review from a guest
 * who happens to share a name is never deleted.
 */
const PLACEHOLDER_REVIEWS: { name: string; text: string }[] = [
  {
    name: 'Rabina Shrestha',
    text: 'The Sutra Fusion Mo:Mo Platter is unlike anything else in Hetauda. Warm service, great music, and an evening we are still talking about.',
  },
  {
    name: 'Prakash Adhikari',
    text: "Best sizzlers in town, without a doubt. The clay-oven pizza tastes like it was flown in from Kathmandu's top kitchens.",
  },
  {
    name: 'Sunita Gurung',
    text: 'Perfect for a family dinner or a date night. The staff treated us like guests, not customers — and the mocktails were superb.',
  },
  {
    name: 'Aayush Shrestha',
    text: 'The lounge transforms into a proper party spot after dark. Great vibe, great drinks, and the crispy chilli chicken is addictive.',
  },
];

function removePlaceholderReviews(db: DB): void {
  for (const table of ['reviews', 'reviews_baseline', 'reviews_draft']) {
    for (const r of PLACEHOLDER_REVIEWS) {
      try {
        db.prepare(`DELETE FROM "${table}" WHERE name = ? AND text = ?`).run(r.name, r.text);
      } catch {
        /* table absent in this schema version */
      }
    }
  }
}

/**
 * Repoints image references at files that no longer exist.
 *
 * Uploads written to data/uploads/ are lost whenever an ephemeral host
 * redeploys, but the database keeps pointing at them, so those images render
 * as broken. The two originals were recovered into img/, which ships with the
 * repo; anything else is blanked so the UI falls back cleanly instead of
 * showing a broken image icon.
 */
const UPLOAD_REPLACEMENTS: Record<string, string> = {
  '/uploads/1786781434442-c5fc4ad22e4b669f.webp': 'img/review-yogesh.webp',
  '/uploads/1786781747263-45603cf39e8e9fe9.webp': 'img/gallery-yogesh.webp',
};

function repairMissingUploads(db: DB): void {
  const tables = [
    'reviews', 'reviews_baseline', 'reviews_draft',
    'gallery', 'gallery_baseline', 'gallery_draft',
    'dishes', 'dishes_baseline', 'dishes_draft',
  ];

  for (const t of tables) {
    for (const [from, to] of Object.entries(UPLOAD_REPLACEMENTS)) {
      try {
        db.prepare(`UPDATE "${t}" SET image_url = ? WHERE image_url = ?`).run(to, from);
      } catch {
        /* table or column absent in this schema version */
      }
    }
  }

  // Settings (e.g. hero.image, design.logo) can also reference a lost upload.
  for (const t of ['settings', 'settings_baseline', 'settings_draft']) {
    for (const [from, to] of Object.entries(UPLOAD_REPLACEMENTS)) {
      try {
        db.prepare(`UPDATE "${t}" SET value = ? WHERE value = ?`).run(to, from);
      } catch {
        /* ignore */
      }
    }
  }
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

/** New settings keys added after the initial seed — safe to re-run.
 *  Anything added here is inserted into both `settings` and
 *  `settings_baseline` on databases that were seeded before the key existed,
 *  so the admin "Restore original" button has a value to restore to. */
const DEFAULT_SETTINGS: Record<string, string> = {
  'design.primary_color': '#c9a35c',
  'design.logo': 'img/logo-gold.png',
  'ordering.channel': 'both',
  'ordering.messenger_page': 'SutraLounge',
  'reviews.google_rating': '4.0',
  'reviews.google_count': '272',
  'reviews.google_url': 'https://share.google/speFf7KuYEt1DNfTv',
};

/**
 * Clears settings rows with a blank key.
 *
 * Restoring a revision captured before `key`/`value` were aliased to k/v read
 * the wrong properties and inserted one empty-keyed row per setting, leaving
 * the site with no readable settings at all. The rows carry no recoverable
 * information, and removing them lets backfillSettings() and the seed restore
 * the defaults on the next start.
 */
function dropBlankSettingKeys(db: DB): void {
  let removed = 0;
  for (const t of ['settings', 'settings_baseline', 'settings_draft']) {
    try {
      const info = db.prepare(`DELETE FROM "${t}" WHERE key IS NULL OR TRIM(key) = ''`).run();
      if (t === 'settings') removed = Number(info.changes ?? 0);
    } catch {
      /* table absent in this schema version */
    }
  }

  // The blank rows replaced real settings, so the site is now missing them.
  // settings_baseline is never touched by a restore, so it still holds the
  // protected originals — copy back anything that is gone. Existing values are
  // left alone so a genuine edit is never overwritten.
  if (removed === 0) return;
  try {
    db.prepare(
      `INSERT INTO settings (key, value, updated_at)
       SELECT b.key, b.value, datetime('now') FROM settings_baseline b
       WHERE b.key IS NOT NULL AND TRIM(b.key) != ''
         AND NOT EXISTS (SELECT 1 FROM settings s WHERE s.key = b.key)`
    ).run();
  } catch {
    /* best effort — backfillSettings() and the seed still run afterwards */
  }
}

function backfillSettings(db: DB): void {
  // Alias the column: `key` is a reserved word in some engines, and remote
  // libsql can return it with different casing, which broke the
  // already-exists check and caused a UNIQUE constraint failure.
  const rows = db.prepare('SELECT key AS k FROM settings').all() as { k: string }[];
  const existing = new Set(rows.map((r) => r.k));
  // Only skip a completely empty database — the full seed handles those. A
  // previously guard also bailed out whenever every existing key happened to
  // be a known default, which meant normally-seeded databases never received
  // newly added keys and their "Restore original" buttons stayed disabled.
  if (rows.length === 0) return;
  // INSERT OR IGNORE keeps this idempotent even if the read above is
  // incomplete for any reason — a re-run must never crash startup.
  const ins = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))"
  );
  const insBase = db.prepare(
    "INSERT OR IGNORE INTO settings_baseline (key, value, captured_at) VALUES (?, ?, datetime('now'))"
  );
  // Baseline rows are tracked separately: a key can already exist in
  // `settings` (so the value renders) while its baseline row is missing,
  // which leaves "Restore original" permanently disabled.
  const baseRows = db.prepare('SELECT key AS k FROM settings_baseline').all() as { k: string }[];
  const existingBaseline = new Set(baseRows.map((r) => r.k));

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (!existing.has(key)) ins.run(key, value);
    if (!existingBaseline.has(key)) insBase.run(key, value);
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

/**
 * Runs `fn` inside a database transaction.
 *
 * Why not `db.transaction()` directly: libsql's wrapper issues `BEGIN`, and on
 * failure unconditionally issues `ROLLBACK`. Against a remote Turso connection
 * the `ROLLBACK` can itself fail with "cannot rollback - no transaction is
 * active", which replaces the original error and hides the real cause.
 *
 * This helper drives BEGIN/COMMIT/ROLLBACK explicitly, tolerates a remote
 * backend that rejects those statements, and always rethrows the *original*
 * error rather than a rollback failure.
 */
/**
 * Rewrites `@name` placeholders into positional `?` parameters.
 *
 * Remote Turso does not bind libsql's named parameters the way a local file
 * does — values silently arrive as NULL, which surfaced as
 * `NOT NULL constraint failed: dishes.type` during seeding. Positional
 * parameters behave identically on both backends, so statements are normalised
 * before they are prepared.
 *
 * String literals and comments are skipped so a `@` inside text is untouched.
 */
export function toPositional(sql: string): { sql: string; names: string[] } {
  const names: string[] = [];
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];

    // Skip over quoted literals / identifiers verbatim.
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      out += ch;
      i++;
      while (i < sql.length) {
        out += sql[i];
        if (sql[i] === quote) {
          // Doubled quote is an escape, keep consuming.
          if (sql[i + 1] === quote) {
            out += sql[i + 1];
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // Skip line comments.
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') out += sql[i++];
      continue;
    }

    if (ch === '@') {
      const m = /^@([A-Za-z_][A-Za-z0-9_]*)/.exec(sql.slice(i));
      if (m) {
        names.push(m[1]);
        out += '?';
        i += m[0].length;
        continue;
      }
    }

    out += ch;
    i++;
  }
  return { sql: out, names };
}

/**
 * Prepares a statement, transparently converting `@name` placeholders to
 * positional ones. The returned object accepts the same object argument as
 * before, so call sites do not change.
 */
export function prepareNamed(db: DB, sql: string) {
  const { sql: converted, names } = toPositional(sql);
  const stmt = db.prepare(converted);
  if (names.length === 0) return stmt;

  const bind = (params: Record<string, unknown>) =>
    names.map((n) => {
      const v = params[n];
      return v === undefined ? null : v;
    });

  return {
    run: (params: Record<string, unknown> = {}) => stmt.run(...bind(params)),
    get: (params: Record<string, unknown> = {}) => stmt.get(...bind(params)),
    all: (params: Record<string, unknown> = {}) => stmt.all(...bind(params)),
  } as unknown as ReturnType<DB['prepare']>;
}

/**
 * Tracks which connections already have a transaction open, so a nested
 * runInTransaction() joins the outer one instead of issuing a second BEGIN.
 *
 * Without this, the inner call's BEGIN fails, the inner block records
 * `began = false` and never commits, and the outer COMMIT lands on work the
 * inner block believed it had already finalised — which is how undo/redo could
 * report success while leaving the site unchanged.
 */
const openTransactions = new WeakSet<object>();

export function runInTransaction<T>(db: DB, fn: () => T): T {
  // Already inside a transaction on this connection: just run the body and let
  // the outermost caller commit or roll back the whole unit of work.
  if (openTransactions.has(db as unknown as object)) return fn();

  let began = false;
  try {
    db.exec('BEGIN');
    began = true;
    openTransactions.add(db as unknown as object);
  } catch {
    // Remote backends may manage transactions themselves; proceed without one.
    began = false;
  }

  let result: T;
  try {
    result = fn();
  } catch (err) {
    if (began) {
      openTransactions.delete(db as unknown as object);
      try {
        db.exec('ROLLBACK');
      } catch {
        // Ignore — surfacing the rollback failure would mask the real error.
      }
    }
    throw err;
  }

  if (began) {
    openTransactions.delete(db as unknown as object);
    try {
      db.exec('COMMIT');
    } catch (err) {
      try {
        db.exec('ROLLBACK');
      } catch {
        /* ignore */
      }
      throw err;
    }
  }
  return result;
}
