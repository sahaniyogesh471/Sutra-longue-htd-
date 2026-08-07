import session from 'express-session';
import type { Request, Response, NextFunction } from 'express';
import { ADMIN_PASSWORD, ADMIN_USERNAME, SESSION_SECRET, SESSION_SECURE } from './config.js';
import { getDb } from './db/index.js';
import { SqliteSessionStore } from './lib/session-store.js';
import { generatePassword, hashPassword } from './lib/password.js';

export interface AdminSession {
  admin: { id: number; username: string; display_name: string; role: string };
}

export function sessionMiddleware() {
  return session({
    name: 'sutra.sid',
    secret: SESSION_SECRET,
    store: new SqliteSessionStore(getDb()),
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

  let password = ADMIN_PASSWORD;
  if (!password) password = generatePassword();
  const hash = hashPassword(password);

  db.prepare(
    `INSERT INTO admin_users (username, password_hash, display_name, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 'admin', 1, datetime('now'), datetime('now'))`
  ).run(ADMIN_USERNAME, hash, ADMIN_USERNAME);

  console.log('');
  console.log('==========================================================');
  console.log('  Admin account created (no default password was set).');
  console.log(`  Username : ${ADMIN_USERNAME}`);
  console.log(`  Password : ${password}`);
  if (!ADMIN_PASSWORD) {
    console.log('  (Generated automatically. Set ADMIN_PASSWORD next time to fix it.)');
  }
  console.log('==========================================================');
  console.log('');
}
