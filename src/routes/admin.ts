import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../auth.js';
import { getDb } from '../db/index.js';
import { verifyPassword, hashPassword } from '../lib/password.js';
import { getCsrfToken } from '../lib/security.js';
import {
  recoveryConfigured,
  verifyRecoveryCode,
  auditSecurity,
  invalidateAdminSessions,
} from '../lib/admin-security.js';
import { isUsername, passwordError } from '../lib/validate.js';
import { apiRouter } from './api.js';
import { adminDishes, adminReviews, adminGallery } from '../lib/admin-lists.js';
import {
  effectiveSettings,
  effectiveHours,
  draftStatus,
  listRevisions,
} from '../lib/publish.js';
import { ALL_SETTING_KEYS } from '../lib/settings-defs.js';
import { buildPublicContent, pageLocals } from '../content.js';

export const adminRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

const recoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many recovery attempts. Please try again later.' },
});

adminRouter.get('/login', (req, res) => {
  if ((req.session as { admin?: unknown } | undefined)?.admin) {
    res.redirect('/admin');
    return;
  }
  const notice = ['recovery-success', 'session-invalidated'].includes(String(req.query.notice ?? ''))
    ? String(req.query.notice)
    : null;
  res.render('admin/login', { csrf: getCsrfToken(req), error: null, notice });
});

adminRouter.post('/login', loginLimiter, (req, res) => {
  const { username, password } = (req.body ?? {}) as { username?: string; password?: string };
  if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password) {
    res.status(400).render('admin/login', {
      csrf: getCsrfToken(req),
      error: 'Please enter both username and password.',
      notice: null,
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
      notice: null,
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

/* ===================================================================== */
/* RECOVERY — two-step flow (public, rate limited)                       */
/* ===================================================================== */

interface RecoveryState {
  verified: boolean;
}

const RECOVERY_MSG: Record<string, string> = {
  'invalid-code': 'That recovery code was not accepted. Please try again.',
  'reset-complete': 'Recovery complete. Sign in with your new credentials.',
};

function renderRecovery(res: Response, opts: { csrf: string; step: 1 | 2; error: string | null; notice: string | null }) {
  res.render('admin/recover', {
    csrf: opts.csrf,
    step: opts.step,
    error: opts.error,
    notice: opts.notice,
    usernameValue: '',
    fieldErrors: {},
    isRecovery: true,
  });
}

adminRouter.get('/recover', (req, res) => {
  if ((req.session as { admin?: unknown } | undefined)?.admin) {
    res.redirect('/admin');
    return;
  }
  renderRecovery(res, { csrf: getCsrfToken(req), step: 1, error: null, notice: null });
});

adminRouter.post('/recover', recoveryLimiter, (req, res) => {
  const db = getDb();
  const body = (req.body ?? {}) as { code?: string; username?: string; password?: string; confirm?: string; step?: string };
  const recovery = (req.session as { recovery?: RecoveryState }).recovery;

  const isStepTwo = String(body.step ?? '') === '2' && recovery?.verified;

  if (!isStepTwo) {
    // Step 1 — verify the 4-digit code.
    const code = String(body.code ?? '').trim();
    if (!/^\d{4}$/.test(code)) {
      auditSecurity(db, 'recovery_attempt_failed', 'invalid code format', req);
      renderRecovery(res, { csrf: getCsrfToken(req), step: 1, error: RECOVERY_MSG['invalid-code'], notice: null });
      return;
    }
    if (!verifyRecoveryCode(db, code)) {
      auditSecurity(db, 'recovery_attempt_failed', 'wrong code', req);
      renderRecovery(res, { csrf: getCsrfToken(req), step: 1, error: RECOVERY_MSG['invalid-code'], notice: null });
      return;
    }
    (req.session as { recovery?: RecoveryState }).recovery = { verified: true };
    auditSecurity(db, 'recovery_verified', 'recovery code accepted', req);
    renderRecovery(res, { csrf: getCsrfToken(req), step: 2, error: null, notice: null });
    return;
  }

  // Step 2 — set new username + password.
  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '');
  const confirm = String(body.confirm ?? '');
  const errors: Record<string, string> = {};
  const uErr = isUsername(username);
  if (uErr) errors.username = uErr;
  const pErr = passwordError(password);
  if (pErr) errors.password = pErr;
  if (password !== confirm) errors.confirm = 'Passwords do not match.';
  if (username && password.toLowerCase() === username.toLowerCase()) {
    errors.password = 'Password must not equal the username.';
  }
  if (Object.keys(errors).length) {
    res.status(400).render('admin/recover', {
      csrf: getCsrfToken(req),
      step: 2,
      error: null,
      notice: null,
      fieldErrors: errors,
      usernameValue: username,
      isRecovery: true,
    });
    return;
  }

  const user = db
    .prepare('SELECT * FROM admin_users WHERE id = (SELECT id FROM admin_users ORDER BY id LIMIT 1)')
    .get() as { id: number; username: string; password_hash: string; display_name: string } | undefined;
  if (!user) {
    renderRecovery(res, { csrf: getCsrfToken(req), step: 1, error: 'No administrator account exists.', notice: null });
    return;
  }

  // Duplicate username check against the other admin rows.
  const dup = db.prepare('SELECT id FROM admin_users WHERE username = ? AND id != ?').get(username, user.id);
  if (dup) {
    res.status(400).render('admin/recover', {
      csrf: getCsrfToken(req),
      step: 2,
      error: null,
      notice: null,
      fieldErrors: { username: 'That username is already taken.' },
      usernameValue: username,
      isRecovery: true,
    });
    return;
  }

  db.prepare(
    `UPDATE admin_users SET username = ?, password_hash = ?, display_name = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(username, hashPassword(password), username, user.id);

  // Invalidate ALL sessions (including the current one).
  db.prepare('DELETE FROM sessions').run();
  auditSecurity(db, 'recovery_reset_completed', `admin #${user.id} reset via recovery`, req);
  req.session.destroy(() => {
    res.clearCookie('sutra.sid');
    res.redirect('/admin/login?notice=recovery-success');
  });
});

adminRouter.use(requireAuth);

/* ===================================================================== */
/* SECURITY — authenticated credential management                        */
/* ===================================================================== */

adminRouter.get('/security', (req, res) => {
  const db = getDb();
  const events = db
    .prepare('SELECT event, detail, ip, created_at FROM security_events ORDER BY id DESC LIMIT 40')
    .all() as { event: string; detail: string; ip: string; created_at: string }[];
  res.render('admin/security', {
    ...pageBase(req, res, { title: 'Admin Security', crumb: 'Username, password & recovery', active: 'security' }),
    recoveryConfigured: recoveryConfigured(db),
    currentUsername: (res.locals.admin as { username?: string } | undefined)?.username ?? '',
    events,
  });
});

/* ---- JSON API (all mutations require an authenticated session) ---- */
adminRouter.use('/api', apiRouter);

/*
 * View helper: resolve a stored image path to an absolute URL.
 * Admin pages render under /admin, so a bare relative path such as
 * `img/avatar-rs.jpg` would otherwise resolve to /admin/img/... and 404.
 */
adminRouter.use((_req: Request, res: Response, next: NextFunction) => {
  res.locals.img = (url?: string): string =>
    url && !/^(https?:)?\/\//i.test(url) && !url.startsWith('/') ? `/${url}` : (url ?? '');
  next();
});

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

/** Shared locals for authenticated CMS pages. */
function pageBase(req: Parameters<typeof getCsrfToken>[0], res: { locals: { admin?: unknown } }, opts: {
  title: string;
  crumb: string;
  active: string;
}) {
  const db = getDb();
  return {
    csrf: getCsrfToken(req),
    admin: res.locals.admin,
    activeNav: opts.active,
    pageTitle: opts.title,
    crumb: opts.crumb,
    draft: draftStatus(db),
  };
}

adminRouter.get('/', (req, res) => {
  const db = getDb();
  const count = (t: string) => (db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get() as { c: number }).c;
  const countVisible = (t: string) =>
    (db.prepare(`SELECT COUNT(*) AS c FROM ${t} WHERE is_visible = 1`).get() as { c: number }).c;

  const recentChanges = db
    .prepare('SELECT id, kind, action, created_at, created_by FROM revisions ORDER BY id DESC LIMIT 6')
    .all();

  const baselineReady = count('settings_baseline') > 0;

  res.render('admin/dashboard', {
    ...pageBase(req, res, { title: 'Dashboard', crumb: 'Overview of the Sutra Lounge website', active: 'dashboard' }),
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
    draftPending: draftStatus(db).count,
    recentChanges,
    baselineReady,
  });
});

adminRouter.get('/settings', (req, res) => {
  const db = getDb();
  const effective = effectiveSettings(db);
  const published: Record<string, string | null> = {};
  for (const r of db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string | null }[]) {
    published[r.key] = r.value;
  }
  const baseline: Record<string, string | null> = {};
  for (const r of db.prepare('SELECT key, value FROM settings_baseline').all() as { key: string; value: string | null }[]) {
    baseline[r.key] = r.value;
  }
  const dirtyKeys = ALL_SETTING_KEYS.filter((k) => (effective[k] ?? null) !== (published[k] ?? null));
  res.render('admin/settings', {
    ...pageBase(req, res, { title: 'Site Settings', crumb: 'Restaurant details, hero, contact & social', active: 'settings' }),
    settings: Object.fromEntries(ALL_SETTING_KEYS.map((k) => [k, effective[k] ?? null])),
    published,
    baseline,
    dirtyKeys,
  });
});

adminRouter.get('/dishes', (req, res) => {
  res.render('admin/dishes', {
    ...pageBase(req, res, { title: 'Menu Dishes', crumb: 'Signature dishes & full digital menu', active: 'dishes' }),
    items: adminDishes(getDb()),
  });
});

adminRouter.get('/reviews', (req, res) => {
  res.render('admin/reviews', {
    ...pageBase(req, res, { title: 'Reviews', crumb: 'Customer testimonials', active: 'reviews' }),
    items: adminReviews(getDb()),
  });
});

adminRouter.get('/gallery', (req, res) => {
  res.render('admin/gallery', {
    ...pageBase(req, res, { title: 'Gallery', crumb: 'Restaurant photography', active: 'gallery' }),
    items: adminGallery(getDb()),
  });
});

adminRouter.get('/hours', (req, res) => {
  const db = getDb();
  const baseline = db.prepare('SELECT * FROM opening_hours_baseline ORDER BY day_index').all();
  res.render('admin/hours', {
    ...pageBase(req, res, { title: 'Opening Hours', crumb: 'Daily schedule shown on the website', active: 'hours' }),
    hours: effectiveHours(db),
    baselineHours: baseline,
  });
});

adminRouter.get('/revisions', (req, res) => {
  res.render('admin/revisions', {
    ...pageBase(req, res, { title: 'Revision History', crumb: 'Undo, redo & restore previous states', active: 'revisions' }),
    revisions: listRevisions(getDb(), 100),
  });
});

/* ---- Draft preview of the public site (never indexed / cached) ---- */
adminRouter.get('/preview', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.render('index', pageLocals('index', buildPublicContent(getDb(), { draft: true }), { preview: 'home', noindex: true }));
});
adminRouter.get('/preview/menu', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.render('menu', pageLocals('menu', buildPublicContent(getDb(), { draft: true }), { preview: 'menu', noindex: true }));
});
