/**
 * Clears content tables so the next start re-seeds them from src/db/seed.ts.
 *
 *   TURSO_URL=... TURSO_AUTH_TOKEN=... node scripts/reset-content.mjs
 *   node scripts/reset-content.mjs                 # local data/sutra.db
 *
 * Admin accounts and the recovery configuration are left untouched, so you do
 * not lose your login.
 */
import { getDb, initSchema } from '../dist/db/index.js';
import { seedAll } from '../dist/db/seed.js';

const TABLES = [
  'settings', 'settings_baseline', 'settings_draft',
  'dishes', 'dishes_baseline', 'dishes_draft',
  'gallery', 'gallery_baseline', 'gallery_draft',
  'reviews', 'reviews_baseline', 'reviews_draft',
  'opening_hours', 'opening_hours_baseline', 'opening_hours_draft',
  'revisions',
];

const db = getDb();
initSchema(db);

let cleared = 0;
for (const t of TABLES) {
  try {
    db.prepare(`DELETE FROM "${t}"`).run();
    cleared++;
  } catch {
    /* table may not exist in this schema version */
  }
}
console.log(`Cleared ${cleared} content tables (admin accounts kept).`);

const { seeded, tables } = seedAll(db, { force: true });
console.log(seeded ? `Re-seeded: ${tables.join(', ')}` : 'Nothing to seed.');

for (const t of ['dishes', 'gallery', 'reviews', 'settings', 'opening_hours']) {
  const c = db.prepare(`SELECT COUNT(*) AS c FROM "${t}"`).get().c;
  console.log(`  ${t.padEnd(15)} ${c}`);
}
