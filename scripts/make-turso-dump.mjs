/**
 * Generates a portable SQL dump of the local SQLite database so it can be
 * imported into Turso without needing the `sqlite3` CLI installed.
 *
 *   node scripts/make-turso-dump.mjs [outputFile] [--slim]
 *
 * Default output: sutra-dump.sql
 *
 * `--slim` additionally drops edit history and audit rows (`revisions`,
 * `security_events`). The schema is still created, so the app rebuilds them as
 * you use it — this keeps the file small enough to paste into a web SQL console.
 *
 * Session rows are always skipped — they are transient logins, not content.
 */
import fs from 'node:fs';
import path from 'node:path';
import Database from 'libsql';

const args = process.argv.slice(2);
const SLIM = args.includes('--slim');
const DB_PATH = process.env.SUTRA_DB_PATH || path.join(process.cwd(), 'data', 'sutra.db');
const OUT = args.find((a) => !a.startsWith('--')) || (SLIM ? 'sutra-dump-slim.sql' : 'sutra-dump.sql');

if (!fs.existsSync(DB_PATH)) {
  console.error(`Database not found: ${DB_PATH}`);
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

/** Quotes a value as a SQL literal. */
function lit(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'bigint') return String(v);
  if (Buffer.isBuffer(v)) return `X'${v.toString('hex')}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

const SKIP_DATA = new Set(['sessions']);
if (SLIM) {
  // Edit history and audit trail — safe to omit for a first deployment.
  SKIP_DATA.add('revisions');
  SKIP_DATA.add('security_events');
}

const objects = db
  .prepare(
    `SELECT type, name, tbl_name, sql FROM sqlite_master
      WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
      ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1
                         WHEN 'view' THEN 2 ELSE 3 END, name`
  )
  .all();

const out = [];
out.push('-- Sutra Lounge database dump for Turso');
out.push(`-- Generated ${new Date().toISOString()}`);
out.push('PRAGMA foreign_keys=OFF;');
out.push('BEGIN TRANSACTION;');

let tableCount = 0;
let rowCount = 0;

// Schema + data for tables, then indexes/views/triggers.
for (const o of objects.filter((x) => x.type === 'table')) {
  out.push('');
  out.push(`DROP TABLE IF EXISTS "${o.name}";`);
  out.push(`${o.sql};`);
  tableCount++;

  if (SKIP_DATA.has(o.name)) {
    out.push(`-- (data skipped for ${o.name})`);
    continue;
  }

  const rows = db.prepare(`SELECT * FROM "${o.name}"`).all();
  if (rows.length === 0) continue;

  const cols = Object.keys(rows[0]).filter((c) => c !== '_metadata');
  const colList = cols.map((c) => `"${c}"`).join(', ');
  for (const r of rows) {
    const vals = cols.map((c) => lit(r[c])).join(', ');
    out.push(`INSERT INTO "${o.name}" (${colList}) VALUES (${vals});`);
    rowCount++;
  }
}

for (const o of objects.filter((x) => x.type !== 'table')) {
  out.push(`${o.sql};`);
}

// Preserve AUTOINCREMENT counters.
try {
  const seq = db.prepare('SELECT name, seq FROM sqlite_sequence').all();
  if (seq.length) {
    out.push('');
    out.push('DELETE FROM sqlite_sequence;');
    for (const s of seq) {
      out.push(`INSERT INTO sqlite_sequence (name, seq) VALUES (${lit(s.name)}, ${s.seq});`);
    }
  }
} catch {
  // sqlite_sequence only exists when an AUTOINCREMENT column is present.
}

out.push('COMMIT;');
out.push('PRAGMA foreign_keys=ON;');
out.push('');

fs.writeFileSync(OUT, out.join('\n'), 'utf8');

const sizeKb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`Wrote ${OUT} — ${tableCount} tables, ${rowCount} rows, ${sizeKb} KB`);
console.log('Import it with:  turso db shell <your-db> < ' + OUT);
