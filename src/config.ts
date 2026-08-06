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

export const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-insecure-session-secret-change-me';

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

export const isProd = process.env.NODE_ENV === 'production';
