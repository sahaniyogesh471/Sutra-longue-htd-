import fs from 'node:fs';
import path from 'node:path';
import express, { type Request, type Response } from 'express';
import compression from 'compression';
import { ROOT, PORT, DATA_DIR, isProd } from './config.js';
import { getDb, initSchema } from './db/index.js';
import { seedAll } from './db/seed.js';
import { ensureAdminUser, sessionMiddleware } from './auth.js';
import { csrfProtect, securityHeaders } from './lib/security.js';
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
    next();
  });

  app.use(compression());
  app.use(securityHeaders);
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
  const renderPublic = (view: 'index' | 'menu') => (_req: Request, res: Response) => {
    res.render(view, pageLocals(view, buildPublicContent(getDb())));
  };
  app.get('/', renderPublic('index'));
  app.get('/index.html', (_req, res) => res.redirect(301, '/'));
  app.get('/menu.html', renderPublic('menu'));

  // ---- Public static assets (explicit paths only — never expose the repo root) ----
  app.use('/css', express.static(path.join(ROOT, 'css'), { maxAge: isProd ? '7d' : 0 }));
  app.use('/js', express.static(path.join(ROOT, 'js'), { maxAge: isProd ? '7d' : 0 }));
  app.use('/img', express.static(path.join(ROOT, 'img'), { maxAge: isProd ? '7d' : 0 }));
  app.use('/uploads', express.static(path.join(DATA_DIR, 'uploads'), { maxAge: isProd ? '30d' : 0 }));

  // ---- Health / status ----
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'sutra-lounge', time: new Date().toISOString() });
  });

  return app;
}

export function startServer() {
  const db = getDb();
  initSchema(db);
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
