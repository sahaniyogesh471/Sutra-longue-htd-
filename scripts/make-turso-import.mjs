/**
 * Builds a Turso import script from the local SQLite database.
 *
 *   node scripts/make-turso-import.mjs [out.sql]
 *
 * Differences from make-turso-dump.mjs:
 *  - Produces DELETE + INSERT for content tables only, so it can be run against
 *    a Turso database that already has seed data without duplicating rows.
 *  - Rewrites `/uploads/...` image paths to files that exist in the repo,
 *    because Render's filesystem is ephemeral and uploaded binaries do not
 *    survive a redeploy.
 *  - Skips sessions, revisions and security_events (transient/audit data).
 */
import fs from 'node:fs';
import path from 'node:path';
import Database from 'libsql';

const DB_PATH = process.env.SUTRA_DB_PATH || path.join(process.cwd(), 'data', 'sutra.db');
const OUT = process.argv[2] || 'turso-import.sql';

if (!fs.existsSync(DB_PATH)) {
  console.error(`Database not found: ${DB_PATH}`);
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

/** Uploaded binaries are lost on an ephemeral host — point at repo assets. */
const UPLOAD_REPLACEMENTS = {
  '/uploads/1786781434442-c5fc4ad22e4b669f.webp': 'img/avatar-ys.svg',
  '/uploads/1786781747263-45603cf39e8e9fe9.webp': 'img/avatar-ys.svg',
};

function fixUploads(value) {
  if (typeof value !== 'string') return value;
  if (UPLOAD_REPLACEMENTS[value]) return UPLOAD_REPLACEMENTS[value];
  // Any other stale upload path: drop it so the UI falls back gracefully.
  if (value.startsWith('/uploads/')) return '';
  return value;
}

function lit(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'bigint') return String(v);
  if (Buffer.isBuffer(v)) return `X'${v.toString('hex')}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

// Content tables to replace wholesale, in FK-safe order.
// `media` is intentionally excluded: it is the upload registry for binaries
// that live on the server's disk, and those files do not exist on an ephemeral
// host. Re-uploading through the admin panel repopulates it.
const TABLES = [
  'settings',
  'settings_baseline',
  'dishes',
  'dishes_baseline',
  'gallery',
  'gallery_baseline',
  'reviews',
  'reviews_baseline',
  'opening_hours',
  'opening_hours_baseline',
];

const out = [];
out.push('-- Sutra Lounge — full content import for Turso');
out.push(`-- Generated ${new Date().toISOString()}`);
out.push('-- Replaces seeded content with the real site content.');
out.push('');

let rowCount = 0;
for (const table of TABLES) {
  let rows;
  try {
    rows = db.prepare(`SELECT * FROM "${table}"`).all();
  } catch {
    continue; // table absent in this schema version
  }

  out.push(`-- ${table} (${rows.length} rows)`);
  out.push(`DELETE FROM "${table}";`);
  if (rows.length === 0) {
    out.push('');
    continue;
  }

  const cols = Object.keys(rows[0]).filter((c) => c !== '_metadata');
  const colList = cols.map((c) => `"${c}"`).join(', ');
  for (const r of rows) {
    const vals = cols
      .map((c) => lit(/image|url|photo|avatar/i.test(c) ? fixUploads(r[c]) : r[c]))
      .join(', ');
    out.push(`INSERT INTO "${table}" (${colList}) VALUES (${vals});`);
    rowCount++;
  }
  out.push('');
}

fs.writeFileSync(OUT, out.join('\n'), 'utf8');
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`Wrote ${OUT} — ${TABLES.length} tables, ${rowCount} rows, ${kb} KB`);
