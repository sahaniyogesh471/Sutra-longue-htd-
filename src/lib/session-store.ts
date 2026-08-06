import session, { type SessionData } from 'express-session';
import type { DB } from '../db/index.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Persistent, SQLite-backed express-session store.
 * Sessions survive process restarts — no Redis or paid store needed.
 */
export class SqliteSessionStore extends session.Store {
  private db: DB;

  constructor(db: DB) {
    super();
    this.db = db;
  }

  private get select() {
    return this.db.prepare('SELECT data, expires_at FROM sessions WHERE id = ?');
  }

  private get insert() {
    return this.db.prepare(
      `INSERT INTO sessions (id, data, expires_at) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at`
    );
  }

  private get remove() {
    return this.db.prepare('DELETE FROM sessions WHERE id = ?');
  }

  private get list() {
    return this.db.prepare('SELECT id FROM sessions');
  }

  get(sid: string, cb: (err: unknown, session?: SessionData | null) => void): void {
    try {
      const row = this.select.get(sid) as { data: string; expires_at: number } | undefined;
      if (!row) {
        cb(null, null);
        return;
      }
      if (row.expires_at < Date.now()) {
        this.remove.run(sid);
        cb(null, null);
        return;
      }
      cb(null, JSON.parse(row.data) as SessionData);
    } catch (err) {
      cb(err);
    }
  }

  set(sid: string, data: SessionData, cb?: (err?: unknown) => void): void {
    try {
      const expires = data.cookie?.expires
        ? new Date(data.cookie.expires).getTime()
        : Date.now() + 7 * DAY_MS;
      this.insert.run(sid, JSON.stringify(data), expires);
      cb?.(null);
    } catch (err) {
      cb?.(err);
    }
  }

  destroy(sid: string, cb?: (err?: unknown) => void): void {
    try {
      this.remove.run(sid);
      cb?.(null);
    } catch (err) {
      cb?.(err);
    }
  }

  touch(sid: string, data: SessionData, cb?: (err?: unknown) => void): void {
    this.set(sid, data, cb);
  }

  all(cb: (err: unknown, sessions?: SessionData[] | { [sid: string]: SessionData } | null) => void): void {
    try {
      const rows = this.list.all() as { id: string }[];
      cb(null, rows.map((r) => ({ id: r.id }) as unknown as SessionData));
    } catch (err) {
      cb(err);
    }
  }

  clear(cb?: (err?: unknown) => void): void {
    try {
      this.db.prepare('DELETE FROM sessions').run();
      cb?.(null);
    } catch (err) {
      cb?.(err);
    }
  }

  length(cb: (err: unknown, count?: number) => void): void {
    try {
      cb(null, (this.list.all() as unknown[]).length);
    } catch (err) {
      cb(err);
    }
  }
}
