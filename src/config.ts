import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const here = path.dirname(fileURLToPath(import.meta.url));

// src/config.ts -> workspace root ; dist/config.js -> workspace root
export const ROOT = path.resolve(here, '..');
export const DATA_DIR = path.join(ROOT, 'data');
export const PUBLIC_DIR = ROOT;
export const DB_PATH = process.env.SUTRA_DB_PATH || path.join(DATA_DIR, 'sutra.db');

export const PORT = Number(process.env.PORT || 4173);

/** Turso (libSQL) remote database. When TURSO_URL is set the app uses the
 *  managed database instead of a local SQLite file — required on hosts with an
 *  ephemeral filesystem (Render, Koyeb, etc.). Leave unset for local dev.
 *
 *  Values are sanitised because pasting a token into a dashboard field very
 *  easily introduces a trailing newline or surrounding quotes. A newline in the
 *  auth token makes libsql fail with an opaque
 *  `Hrana(Http("http::Error(InvalidHeaderValue)"))` at startup. */
function cleanEnv(name: string): string {
  const raw = process.env[name];
  if (!raw) return '';
  // Strip surrounding whitespace/newlines, then matching quotes, then trim again.
  return raw
    .trim()
    .replace(/^(['"])([\s\S]*)\1$/, '$2')
    .trim();
}

export const TURSO_URL = cleanEnv('TURSO_URL');
export const TURSO_AUTH_TOKEN = cleanEnv('TURSO_AUTH_TOKEN');

/** Cloudinary media storage. When configured, uploaded images are stored on
 *  Cloudinary's CDN instead of the local disk — required on hosts with an
 *  ephemeral filesystem (Render free), where uploads are otherwise lost on every
 *  redeploy. Leave unset to keep using local disk storage. */
export const CLOUDINARY_CLOUD_NAME = cleanEnv('CLOUDINARY_CLOUD_NAME');
export const CLOUDINARY_API_KEY = cleanEnv('CLOUDINARY_API_KEY');
export const CLOUDINARY_API_SECRET = cleanEnv('CLOUDINARY_API_SECRET');
export const CLOUDINARY_ENABLED = Boolean(
  CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET
);

export const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-insecure-session-secret-change-me';

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
export const ADMIN_RECOVERY_CODE = process.env.ADMIN_RECOVERY_CODE || '';

export const isProd = process.env.NODE_ENV === 'production';

/** Session cookie `Secure` flag. Defaults on in production (HTTPS behind the
 * preview proxy); set SESSION_SECURE=false to test over plain HTTP. */
export const SESSION_SECURE = process.env.SESSION_SECURE === undefined ? isProd : process.env.SESSION_SECURE === 'true';
