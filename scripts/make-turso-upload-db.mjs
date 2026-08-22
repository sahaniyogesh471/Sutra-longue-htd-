/**
 * Builds a Turso-ready SQLite file containing ONLY public site content.
 *
 *   node scripts/make-turso-upload-db.mjs [out.db]
 *
 * Default output: turso-upload.db
 *
 * Safe to publish: admin accounts, recovery configuration, sessions and
 * security logs are all removed, so the file carries no credentials. The app
 * recreates the administrator on first start from ADMIN_PASSWORD /
 * ADMIN_RECOVERY_CODE.
 *
 * Uploaded `/uploads/...` image paths are rewritten to repo assets because an
 * ephemeral host (Render free) does not keep uploaded binaries.
 */
import fs from 'node:fs';
import path from 'node:path';
import Database from 'libsql';

const SRC = process.env.SUTRA_DB_PATH || path.join(process.cwd(), 'data', 'sutra.db');
const OUT = process.argv[2] || 'turso-upload.db';

if (!fs.existsSync(SRC)) {
  console.error(`Database not found: ${SRC}`);
  process.exit(1);
}

fs.rmSync(OUT, { force: true });
fs.rmSync(`${OUT}-shm`, { force: true });
fs.rmSync(`${OUT}-wal`, { force: true });
fs.copyFileSync(SRC, OUT);

const db = new Database(OUT);

// --- 1. Strip everything sensitive -----------------------------------------
const WIPE = ['admin_users', 'admin_security', 'sessions', 'security_events', 'media'];
for (const t of WIPE) {
  try {
    db.prepare(`DELETE FROM "${t}"`).run();
  } catch {
    /* table may not exist */
  }
}

// --- 2. Repoint uploaded images at assets that exist in the repo -----------
const REPLACE = {
  '/uploads/1786781434442-c5fc4ad22e4b669f.webp': 'img/avatar-ys.svg',
  '/uploads/1786781747263-45603cf39e8e9fe9.webp': 'img/avatar-ys.svg',
};
const IMAGE_TABLES = [
  'reviews',
  'reviews_baseline',
  'reviews_draft',
  'gallery',
  'gallery_baseline',
  'gallery_draft',
  'dishes',
  'dishes_baseline',
  'dishes_draft',
];
for (const t of IMAGE_TABLES) {
  for (const [from, to] of Object.entries(REPLACE)) {
    try {
      db.prepare(`UPDATE "${t}" SET image_url = ? WHERE image_url = ?`).run(to, from);
    } catch {
      /* table/column may not exist */
    }
  }
  // Any other stale upload path would 404 — blank it so the UI degrades cleanly.
  try {
    db.prepare(`UPDATE "${t}" SET image_url = '' WHERE image_url LIKE '/uploads/%'`).run();
  } catch {
    /* ignore */
  }
}

// --- 3. Reclaim freed pages ------------------------------------------------
// DELETE only marks rows unused; the original bytes (including password
// hashes) stay in the file until the database is rebuilt. VACUUM rewrites it
// so the removed data is genuinely gone.
db.exec('VACUUM');

// --- 4. Report --------------------------------------------------------------
const count = (t) => {
  try {
    return db.prepare(`SELECT COUNT(*) AS c FROM "${t}"`).get().c;
  } catch {
    return '—';
  }
};

console.log(`Wrote ${OUT}`);
console.log('  content:');
for (const t of ['dishes', 'gallery', 'reviews', 'settings', 'opening_hours']) {
  console.log(`    ${t.padEnd(15)} ${count(t)}`);
}
console.log('  stripped (must all be 0):');
for (const t of WIPE) {
  console.log(`    ${t.padEnd(15)} ${count(t)}`);
}
const stale = db
  .prepare(
    `SELECT COUNT(*) AS c FROM reviews WHERE image_url LIKE '/uploads/%'`
  )
  .get().c;
console.log(`  stale upload paths: ${stale}`);
console.log(`  integrity: ${db.pragma('integrity_check')[0].integrity_check}`);
