/**
 * Backs up the live Turso database to a local SQL file you can keep.
 *
 *   TURSO_URL=libsql://... TURSO_AUTH_TOKEN=... node scripts/backup-turso.mjs
 *   node scripts/backup-turso.mjs my-backup.sql      # custom filename
 *
 * Why this exists: Turso's free plan only keeps 1 day of point-in-time
 * restore, so a mistake noticed a week later cannot be undone. Run this
 * occasionally (or before big content edits) and keep the file somewhere safe.
 *
 * The output is plain SQL — restore it by pasting into Turso's SQL console or
 * running it against a fresh database.
 *
 * Admin accounts, sessions and security logs are NOT included, so the file
 * carries no credentials and is safe to store.
 */
import fs from 'node:fs';
import Database from 'libsql';

const URL = (process.env.TURSO_URL || '').trim();
const TOKEN = (process.env.TURSO_AUTH_TOKEN || '').trim();
const OUT = process.argv[2] || `sutra-backup-${new Date().toISOString().slice(0, 10)}.sql`;

if (!URL) {
  console.error('TURSO_URL is not set.\n');
  console.error('Usage:');
  console.error('  TURSO_URL=libsql://... TURSO_AUTH_TOKEN=... node scripts/backup-turso.mjs');
  process.exit(1);
}

const db = new Database(URL, { authToken: TOKEN });

/** Content tables worth preserving — no credentials, no transient rows. */
const TABLES = [
  'settings', 'settings_baseline', 'settings_draft',
  'dishes', 'dishes_baseline', 'dishes_draft',
  'gallery', 'gallery_baseline', 'gallery_draft',
  'reviews', 'reviews_baseline', 'reviews_draft',
  'opening_hours', 'opening_hours_baseline', 'opening_hours_draft',
];

function lit(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'bigint') return String(v);
  if (Buffer.isBuffer(v)) return `X'${v.toString('hex')}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

const out = [];
out.push('-- Sutra Lounge content backup');
out.push(`-- Taken ${new Date().toISOString()}`);
out.push('-- Restore: paste into the Turso SQL console, or run against a fresh database.');
out.push('');

let rows = 0;
const summary = [];

for (const table of TABLES) {
  let data;
  try {
    data = db.prepare(`SELECT * FROM "${table}"`).all();
  } catch {
    continue; // table not present in this schema version
  }

  summary.push([table, data.length]);
  out.push(`-- ${table} (${data.length} rows)`);
  out.push(`DELETE FROM "${table}";`);

  for (const r of data) {
    const cols = Object.keys(r).filter((c) => c !== '_metadata');
    const colList = cols.map((c) => `"${c}"`).join(', ');
    const vals = cols.map((c) => lit(r[c])).join(', ');
    out.push(`INSERT INTO "${table}" (${colList}) VALUES (${vals});`);
    rows++;
  }
  out.push('');
}

fs.writeFileSync(OUT, out.join('\n'), 'utf8');

const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`Backup written: ${OUT} (${kb} KB, ${rows} rows)\n`);
for (const [t, n] of summary) {
  if (n) console.log(`  ${t.padEnd(24)} ${n}`);
}
console.log('\nKeep this file somewhere outside the server.');
