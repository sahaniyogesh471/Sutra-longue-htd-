import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../auth.js';
import { getDb } from '../db/index.js';
import { verifyPassword } from '../lib/password.js';
import { getCsrfToken } from '../lib/security.js';

export const adminRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

adminRouter.get('/login', (req, res) => {
  if ((req.session as { admin?: unknown } | undefined)?.admin) {
    res.redirect('/admin');
    return;
  }
  res.render('admin/login', { csrf: getCsrfToken(req), error: null });
});

adminRouter.post('/login', loginLimiter, (req, res) => {
  const { username, password } = (req.body ?? {}) as { username?: string; password?: string };
  if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password) {
    res.status(400).render('admin/login', {
      csrf: getCsrfToken(req),
      error: 'Please enter both username and password.',
    });
    return;
  }
  const db = getDb();
  const user = db
    .prepare('SELECT * FROM admin_users WHERE username = ? AND is_active = 1')
    .get(username.trim()) as
    | { id: number; username: string; password_hash: string; display_name: string; role: string }
    | undefined;

  const ok = user ? verifyPassword(password, user.password_hash) : false;
  if (!ok || !user) {
    res.status(401).render('admin/login', {
      csrf: getCsrfToken(req),
      error: 'Invalid username or password.',
    });
    return;
  }

  (req.session as { admin?: unknown }).admin = {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
  };
  db.prepare('UPDATE admin_users SET last_login_at = datetime(\'now\') WHERE id = ?').run(user.id);
  res.redirect('/admin');
});

adminRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sutra.sid');
    res.redirect('/admin/login');
  });
});

adminRouter.use(requireAuth);

/** Opening status computed in Asia/Kathmandu from the hours table. */
function openingNow(db: ReturnType<typeof getDb>) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kathmandu',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const weekdayMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const dayIndex = weekdayMap[parts.find((p) => p.type === 'weekday')?.value ?? ''] ?? 0;
  const hh = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const mm = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const curMin = hh * 60 + mm;

  const row = db.prepare('SELECT * FROM opening_hours WHERE day_index = ?').get(dayIndex) as
    | { is_open: number; open_time: string; close_time: string }
    | undefined;
  if (!row || !row.is_open) return { open: false, label: 'Closed today' };

  const [oh, om] = (row.open_time ?? '0:00').split(':').map(Number);
  const [ch, cm] = (row.close_time ?? '0:00').split(':').map(Number);
  const isOpen = curMin >= oh * 60 + om && curMin < ch * 60 + cm;
  return {
    open: isOpen,
    label: isOpen ? 'Open now' : 'Closed now',
    hours: `${row.open_time} – ${row.close_time}`,
  };
}

adminRouter.get('/', (req, res) => {
  const db = getDb();
  const count = (t: string) => (db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get() as { c: number }).c;
  const countVisible = (t: string) =>
    (db.prepare(`SELECT COUNT(*) AS c FROM ${t} WHERE is_visible = 1`).get() as { c: number }).c;

  const draftPending =
    count('settings_draft') +
    count('dishes_draft') +
    count('reviews_draft') +
    count('gallery_draft') +
    count('opening_hours_draft');

  const recentChanges = db
    .prepare('SELECT id, kind, action, created_at FROM revisions ORDER BY id DESC LIMIT 6')
    .all();

  const baselineReady = count('settings_baseline') > 0;

  res.render('admin/dashboard', {
    csrf: getCsrfToken(req),
    admin: res.locals.admin,
    counts: {
      signature: count('dishes') > 0
        ? (db.prepare("SELECT COUNT(*) AS c FROM dishes WHERE type = 'signature'").get() as { c: number }).c
        : 0,
      bestsellers: count('dishes') > 0
        ? (db.prepare("SELECT COUNT(*) AS c FROM dishes WHERE type = 'bestseller'").get() as { c: number }).c
        : 0,
      dishes: count('dishes'),
      reviewsVisible: countVisible('reviews'),
      gallery: countVisible('gallery'),
      media: count('media'),
    },
    opening: openingNow(db),
    draftPending,
    recentChanges,
    baselineReady,
  });
});
