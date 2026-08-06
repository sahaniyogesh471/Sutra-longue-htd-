import fs from 'node:fs';
import Database from 'better-sqlite3';
import { DATA_DIR, DB_PATH } from '../config.js';
import { SCHEMA_SQL } from './schema.js';

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

export function initSchema(db: DB): void {
  db.exec(SCHEMA_SQL);
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
