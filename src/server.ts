import fs from 'node:fs';
import path from 'node:path';
import express, { type Request, type Response } from 'express';
import compression from 'compression';
import { ROOT, PORT, DATA_DIR, isProd } from './config.js';
import { getDb, initSchema } from './db/index.js';
import { seedAll } from './db/seed.js';
import { ensureAdminUser, sessionMiddleware } from './auth.js';
import { csrfProtect, securityHeaders } from './lib/security.js';
import { ensureUploadsDir } from './lib/media.js';
import { adminRouter } from './routes/admin.js';
import { buildPublicContent, pageLocals } from './content.js';

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
  app.use((req: Request, res: Response, next) => {
    res.setHeader(
      'Cache-Control',
      req.path.startsWith('/admin')
        ? 'no-store'
        : 'public, no-cache, must-revalidate'
    );
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
    res.render(view, pageLocals(view, buildPublicContent(getDb()), {
      requestHost: res.locals.requestHost,
      assetsV: res.locals.assetsV,
    }));
  };
  app.get('/', renderPublic('index'));
  app.get('/index.html', (_req, res) => res.redirect(301, '/'));
  app.get('/menu.html', renderPublic('menu'));

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
      `\n` +
      `Sitemap: ${base}/sitemap.xml\n`
    );
  });

  app.get('/sitemap.xml', (req, res) => {
    const host = (req.get('host') ?? '').replace(/^www\./, '');
    const base = `https://${host}`;
    const urls = ['/', '/menu.html'];
    const lastmod = new Date().toISOString().slice(0, 10);
    const body =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((u) => `  <url><loc>${base}${u}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>${u === '/' ? '1.0' : '0.8'}</priority></url>`).join('\n') +
      `\n</urlset>\n`;
    res.type('application/xml');
    res.send(body);
  });

  // ---- Public static assets (explicit paths only — never expose the repo root) ----
  app.use('/css', express.static(path.join(ROOT, 'css'), { maxAge: isProd ? '7d' : 0 }));
  app.use('/js', express.static(path.join(ROOT, 'js'), { maxAge: isProd ? '7d' : 0 }));
  app.use('/img', express.static(path.join(ROOT, 'img'), { maxAge: isProd ? '7d' : 0 }));
  app.use('/uploads', express.static(path.join(DATA_DIR, 'uploads'), { maxAge: isProd ? '30d' : 0 }));

  // ---- Health / status ----
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'sutra-lounge', time: new Date().toISOString() });
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

  return app;
}

export function startServer() {
  const db = getDb();
  initSchema(db);
  ensureUploadsDir();
  const { seeded, tables } = seedAll(db);
  if (seeded) {
    console.log(`[seed] Baseline content created for: ${tables.join(', ')}`);
    console.log('[seed] Review rows are DEMO content — replace/remove from the admin panel.');
  }
  ensureAdminUser();

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Sutra Lounge server listening on http://0.0.0.0:${PORT}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
