import session from 'express-session';
import type { Request, Response, NextFunction } from 'express';
import { ADMIN_PASSWORD, ADMIN_USERNAME, SESSION_SECRET, SESSION_SECURE } from './config.js';
import { getDb } from './db/index.js';
import { SqliteSessionStore } from './lib/session-store.js';
import { hashPassword } from './lib/password.js';

export interface AdminSession {
  admin: { id: number; username: string; display_name: string; role: string };
}

export function sessionMiddleware() {
  return session({
    name: 'sutra.sid',
    secret: SESSION_SECRET,
    // Pass the resolver, not a handle: a reconnect must not leave the session
    // store holding a dead connection.
    store: new SqliteSessionStore(getDb),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: SESSION_SECURE,
      path: '/',
      priority: 'high',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const admin = (req.session as unknown as AdminSession | undefined)?.admin;
  if (!admin) {
    if (req.path.startsWith('/api/')) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    res.redirect('/admin/login');
    return;
  }
  res.locals.admin = admin;
  next();
}

export function ensureAdminUser(): void {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) AS c FROM admin_users').get() as { c: number }).c;
  if (count > 0) return;

  if (!ADMIN_PASSWORD) {
    console.log('');
    console.log('==========================================================');
    console.log('  Admin account is NOT configured.');
    console.log('  Deployment requirement:');
    console.log('  Set ADMIN_PASSWORD before the first server start to');
    console.log('  create the initial administrator account. The password');
    console.log('  is never logged or generated-and-printed by this server.');
    console.log('==========================================================');
    console.log('');
    return;
  }

  const hash = hashPassword(ADMIN_PASSWORD);

  db.prepare(
    `INSERT INTO admin_users (username, password_hash, display_name, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 'admin', 1, datetime('now'), datetime('now'))`
  ).run(ADMIN_USERNAME, hash, ADMIN_USERNAME);

  console.log('[auth] Initial administrator account created.');
}
