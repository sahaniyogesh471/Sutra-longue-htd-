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
 *  ephemeral filesystem (Render, Koyeb, etc.). Leave unset for local dev. */
export const TURSO_URL = process.env.TURSO_URL || '';
export const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || '';

export const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-insecure-session-secret-change-me';

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
export const ADMIN_RECOVERY_CODE = process.env.ADMIN_RECOVERY_CODE || '';

export const isProd = process.env.NODE_ENV === 'production';

/** Session cookie `Secure` flag. Defaults on in production (HTTPS behind the
 * preview proxy); set SESSION_SECURE=false to test over plain HTTP. */
export const SESSION_SECURE = process.env.SESSION_SECURE === undefined ? isProd : process.env.SESSION_SECURE === 'true';
