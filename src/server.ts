import fs from 'node:fs';
import path from 'node:path';
import express, { type Request, type Response } from 'express';
import compression from 'compression';
import { ROOT, PORT, DATA_DIR, isProd } from './config.js';
import { getDb, initSchema, withDbRetry, isDeadConnectionError, resetConnection, invalidateConnection } from './db/index.js';
import { seedAll } from './db/seed.js';
import { ensureAdminUser, sessionMiddleware } from './auth.js';
import { csrfProtect, securityHeaders } from './lib/security.js';
import { ensureUploadsDir } from './lib/media.js';
import { ensureRecoveryCode } from './lib/admin-security.js';
import { adminRouter } from './routes/admin.js';
import { buildPublicContent, pageLocals, loadSettings, loadHours, hoursSummary, digitsOnly } from './content.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (isProd) app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(ROOT, 'views'));

  app.use((_req: Request, res: Response, next) => {
    try {
      const css = fs.statSync(path.join(ROOT, 'views', 'admin', 'admin.css')).mtimeMs;
      const js = fs.statSync(path.join(ROOT, 'js', 'admin.js')).mtimeMs;
      res.locals.adminAssetsV = Math.round(Math.max(css, js));
    } catch {
      res.locals.adminAssetsV = Date.now();
    }
    try {
      const css = fs.statSync(path.join(ROOT, 'css', 'style.css')).mtimeMs;
      const menu = fs.statSync(path.join(ROOT, 'css', 'menu.css')).mtimeMs;
      const js = fs.statSync(path.join(ROOT, 'js', 'main.js')).mtimeMs;
      res.locals.assetsV = Math.round(Math.max(css, menu, js));
    } catch {
      res.locals.assetsV = Date.now();
    }
    next();
  });

  app.use(compression());
  app.use(securityHeaders);

  // Cache policy: admin pages are private & never cached; public pages are
  // revalidated on every request (they are database-driven) but may still be
  // served from a CDN/proxy after revalidation.
  // Static asset directories set their own long max-age further down; this
  // middleware must not override it, otherwise CSS/JS/images are revalidated
  // on every request and the `maxAge` below has no effect.
  const STATIC_PREFIXES = ['/css/', '/js/', '/img/', '/uploads/'];

  app.use((req: Request, res: Response, next) => {
    const isStatic = STATIC_PREFIXES.some((p) => req.path.startsWith(p));
    if (!isStatic) {
      res.setHeader(
        'Cache-Control',
        req.path.startsWith('/admin')
          ? 'no-store'
          : 'public, no-cache, must-revalidate'
      );
    }
    res.locals.requestHost = req.get('host') ?? '';
    res.locals.pathname = req.path;
    next();
  });

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // ---- Session + CSRF (admin area) ----
  const sendFile = (file: string) => (_req: Request, res: Response) => {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) {
      res.status(404).send('Not found');
      return;
    }
    res.sendFile(full);
  };

  app.use(sessionMiddleware());
  app.use('/admin', csrfProtect, adminRouter);
  app.get('/admin.css', sendFile('views/admin/admin.css'));
  app.get('/admin.js', sendFile('js/admin.js'));

  // ---- Public pages (database-driven, published state only) ----
  const renderPublic = (view: 'index' | 'menu') => (req: Request, res: Response) => {
    // Read-only, so it is safe to replay if the remote connection expired.
    const content = withDbRetry((db) => buildPublicContent(db));
    res.render(view, pageLocals(view, content, {
      requestHost: res.locals.requestHost,
      assetsV: res.locals.assetsV,
    }));
  };
  app.get('/', renderPublic('index'));
  app.get('/index.html', (_req, res) => res.redirect(301, '/'));
  // Trailing-slash canonicalisation: /menu.html/ must 301 to the canonical URL.
  // Express matches the trailing slash as optional, so inspect req.path directly.
  app.get('/menu.html', (req, res) => {
    if (req.path.endsWith('/')) return res.redirect(301, '/menu.html');
    return renderPublic('menu')(req, res);
  });

  // ---- robots.txt & sitemap.xml (host derived from the request) ----
  app.get('/robots.txt', (req, res) => {
    const host = (req.get('host') ?? '').replace(/^www\./, '');
    const base = `https://${host}`;
    res.type('text/plain');
    res.send(
      `User-agent: *\n` +
      `Allow: /\n` +
      `Disallow: /admin\n` +
      `Disallow: /admin/api\n` +
      // Probes, not content — keep them out of the index.
      `Disallow: /api/\n` +
      `\n` +
      `Sitemap: ${base}/sitemap.xml\n`
    );
  });

  app.get('/sitemap.xml', (req, res) => {
    const host = (req.get('host') ?? '').replace(/^www\./, '');
    const base = `https://${host}`;
    const urls = ['/', '/menu.html'];
    // lastmod reflects the real most-recent content/revision change rather than
    // claiming every page was modified today.
    const row = withDbRetry((db) => db
      .prepare(
        `SELECT MAX(d) AS d FROM (
           SELECT MAX(updated_at) AS d FROM settings
           UNION ALL SELECT MAX(updated_at) FROM dishes
           UNION ALL SELECT MAX(updated_at) FROM reviews
           UNION ALL SELECT MAX(updated_at) FROM gallery
           UNION ALL SELECT MAX(updated_at) FROM opening_hours
           UNION ALL SELECT MAX(created_at) FROM revisions
         )`
      )
      .get()) as { d: string | null };
    const lastmod = (row.d ? row.d.slice(0, 10) : new Date().toISOString().slice(0, 10));
    const body =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((u) => `  <url><loc>${base}${u}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>${u === '/' ? '1.0' : '0.8'}</priority></url>`).join('\n') +
      `\n</urlset>\n`;
    res.type('application/xml');
    res.send(body);
  });

  // ---- llms.txt (machine-readable business facts; verified repo data only) ----
  app.get('/llms.txt', (req, res) => {
    const settings = withDbRetry((db) => loadSettings(db));
    const hours = withDbRetry((db) => loadHours(db));
    const s = (k: string, fb = ''): string => settings[k] ?? fb;
    const host = (req.get('host') ?? '').replace(/^www\./, '');
    const base = `https://${host}`;
    const phone = s('contact.phone');
    const wa = digitsOnly(s('contact.whatsapp', digitsOnly(phone)));
    const lines = [
      '# Sutra Lounge',
      '',
      `> ${s('restaurant.description')}`,
      '',
      '## Location',
      s('contact.address'),
      '',
      '## Opening Hours',
      hoursSummary(hours),
      '',
      '## Contact',
      phone ? `- Phone: ${phone}` : '',
      wa ? `- WhatsApp: +${wa}` : '',
      s('contact.email') ? `- Email: ${s('contact.email')}` : '',
      '',
      '## Website',
      `- Home: ${base}/`,
      `- Digital Menu: ${base}/menu.html`,
      '',
      '## Cuisine',
      s('restaurant.cuisine'),
      '',
      '## Ordering & Reservations',
      wa ? `- Order on WhatsApp: https://wa.me/${wa}` : '',
      s('contact.maps_url') ? `- Get Directions: ${s('contact.maps_url')}` : '',
      '',
      '## Social',
      s('social.facebook') ? `- Facebook: ${s('social.facebook')}` : '',
      s('social.instagram') ? `- Instagram: ${s('social.instagram')}` : '',
      s('social.tiktok') ? `- TikTok: ${s('social.tiktok')}` : '',
      s('social.youtube') ? `- YouTube: ${s('social.youtube')}` : '',
    ].filter(Boolean).join('\n');
    res.type('text/plain');
    res.send(`${lines}\n`);
  });

  // ---- Public static assets (explicit paths only — never expose the repo root) ----
  app.use('/css', express.static(path.join(ROOT, 'css'), { maxAge: isProd ? '7d' : 0 }));
  app.use('/js', express.static(path.join(ROOT, 'js'), { maxAge: isProd ? '7d' : 0 }));
  app.use('/img', express.static(path.join(ROOT, 'img'), { maxAge: isProd ? '7d' : 0 }));
  app.use('/uploads', express.static(path.join(DATA_DIR, 'uploads'), { maxAge: isProd ? '30d' : 0 }));

  // ---- Health / status ----
  //
  // Two deliberately separate checks:
  //
  // /api/health is Render's healthCheckPath. It must stay a pure liveness
  // probe: if it ever failed, Render would treat the deploy as broken and
  // restart the instance in a loop, which turns a recoverable database problem
  // into a hard outage. So it only proves the process is up.
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'sutra-lounge', time: new Date().toISOString() });
  });

  // /api/ready is the readiness probe for the uptime monitor. It actually
  // queries the database, because the outage this was written after had every
  // page returning 500 while /api/health happily reported OK — the monitor
  // stayed green for hours while the site was down.
  //
  // It runs the same cheap read the homepage depends on, so "ready" means
  // "the homepage can be built", not merely "the port is open".
  app.get('/api/ready', (_req, res) => {
    const started = Date.now();
    try {
      const row = withDbRetry((db) =>
        db.prepare('SELECT COUNT(*) AS c FROM settings').get()
      ) as { c: number } | undefined;
      const settings = Number(row?.c ?? 0);
      // An empty settings table means the site would render without its name,
      // phone or address — broken in practice even though the query worked.
      if (settings < 1) {
        res.status(503).json({
          ok: false,
          service: 'sutra-lounge',
          error: 'settings table is empty',
          settings,
          ms: Date.now() - started,
        });
        return;
      }
      res.json({
        ok: true,
        service: 'sutra-lounge',
        database: 'ok',
        settings,
        ms: Date.now() - started,
        time: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[ready] database check failed:', err);
      res.status(503).json({
        ok: false,
        service: 'sutra-lounge',
        database: 'error',
        error: err instanceof Error ? err.message : String(err),
        ms: Date.now() - started,
      });
    }
  });

  // ---- Branded 404 page (HTTP 404) ----
  app.use('/admin', (_req, res) => {
    res.status(404).send('Not found');
  });
  app.use((req: Request, res: Response) => {
    res.status(404);
    res.render('404', {
      title: 'Page Not Found | Sutra Lounge',
      description: 'The page you are looking for could not be found.',
      canonical: '',
      noindex: true,
      pageCss: '',
      year: new Date().getFullYear(),
      assetsV: res.locals.assetsV,
      requestHost: res.locals.requestHost,
    });
  });

  // ---- Error handler ----
  // Without this Express answers a bare "Internal Server Error" and the cause
  // is never written anywhere, which made a database problem impossible to
  // diagnose from the deploy logs. The stack is logged server-side only; the
  // visitor gets the branded page and never sees internals.
  app.use((err: unknown, req: Request, res: Response, _next: express.NextFunction) => {
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
    // A request that died on a dead connection is a much better signal than any
    // timer, so drop it now: the next request reconnects instead of repeating
    // this failure until the probe interval elapses. This is what stops one
    // expired Turso stream from turning into a site-wide outage.
    if (isDeadConnectionError(err)) {
      resetConnection();
      invalidateConnection();
    }
    if (res.headersSent) return;
    res.status(500);
    // The error page itself reads no database, so it still renders when the
    // database is the thing that is broken.
    try {
      res.render('500', {
        title: 'Something went wrong | Sutra Lounge',
        description: 'This page could not be loaded. Please try again shortly.',
        canonical: '',
        noindex: true,
        pageCss: '',
        year: new Date().getFullYear(),
        assetsV: res.locals.assetsV,
        requestHost: res.locals.requestHost,
      });
    } catch {
      res.type('text/plain').send('Something went wrong. Please try again shortly.');
    }
  });

  return app;
}

export function startServer() {
  // Each startup step is isolated: previously a single failing statement threw
  // before app.listen(), or left the schema half-built, and every page that
  // reads the database answered 500 while /api/health still reported OK.
  // Logging loudly and continuing means the site keeps serving whatever the
  // database can still provide, and the cause is visible in the deploy logs.
  const step = (name: string, run: () => void) => {
    try {
      run();
    } catch (err) {
      console.error(`[startup] ${name} failed:`, err);
    }
  };

  const db = getDb();
  step('initSchema', () => initSchema(db));
  step('ensureUploadsDir', () => ensureUploadsDir());
  step('seed', () => {
    const { seeded, tables } = seedAll(db);
    if (seeded) {
      console.log(`[seed] Baseline content created for: ${tables.join(', ')}`);
      console.log('[seed] Review rows are DEMO content — replace/remove from the admin panel.');
    }
  });
  step('ensureAdminUser', () => ensureAdminUser());
  step('ensureRecoveryCode', () => ensureRecoveryCode(db));

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Sutra Lounge server listening on http://0.0.0.0:${PORT}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
