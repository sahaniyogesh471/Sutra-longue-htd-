import type { DB } from '../db/index.js';

/**
 * Content backup as plain SQL.
 *
 * Turso's free plan keeps only one day of point-in-time restore, so a mistake
 * noticed a week later cannot be undone from the platform alone. This produces
 * a file the owner can keep anywhere.
 *
 * Deliberately excluded: admin_users, sessions and security_events. The file
 * therefore carries no credentials and is safe to email or drop in Drive.
 */
export const BACKUP_TABLES = [
  'settings', 'settings_baseline', 'settings_draft',
  'dishes', 'dishes_baseline', 'dishes_draft',
  'gallery', 'gallery_baseline', 'gallery_draft',
  'reviews', 'reviews_baseline', 'reviews_draft',
  'opening_hours', 'opening_hours_baseline', 'opening_hours_draft',
] as const;

/** Renders one value as a SQL literal. */
export function sqlLiteral(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'bigint') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (v instanceof Uint8Array) return `X'${Buffer.from(v).toString('hex')}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

/**
 * Tables the backup is worthless without. If one of these cannot be read the
 * backup must fail loudly: a file that quietly omits `settings` looks perfectly
 * valid, and the loss is only discovered during a restore, when the site comes
 * back with no name, phone or address.
 */
const REQUIRED_TABLES = ['settings', 'dishes', 'reviews', 'gallery', 'opening_hours'] as const;

export class BackupIncompleteError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Backup is incomplete — could not read: ${missing.join(', ')}`);
    this.name = 'BackupIncompleteError';
  }
}

export interface BackupResult {
  sql: string;
  rows: number;
  tables: { table: string; rows: number }[];
}

/**
 * Builds the backup script. Every table is wrapped in its own DELETE so the
 * file can be replayed straight into the SQL console without clearing tables
 * by hand first — the previous manual process, where a missed DELETE produced
 * duplicate-key errors halfway through a restore.
 */
export function buildBackupSql(db: DB): BackupResult {
  const out: string[] = [];
  const tables: { table: string; rows: number }[] = [];
  let rows = 0;

  out.push('-- Sutra Lounge content backup');
  out.push(`-- Taken ${new Date().toISOString()}`);
  out.push('-- Restore: paste the whole file into the Turso SQL console.');
  out.push('-- Contains no passwords, sessions or security logs.');
  out.push('');

  const missing: string[] = [];

  for (const table of BACKUP_TABLES) {
    let data: Record<string, unknown>[];
    try {
      data = db.prepare(`SELECT * FROM "${table}"`).all() as Record<string, unknown>[];
    } catch {
      // Draft and baseline tables are optional across schema versions, but a
      // missing core table means this file cannot restore the site.
      if ((REQUIRED_TABLES as readonly string[]).includes(table)) missing.push(table);
      continue;
    }

    tables.push({ table, rows: data.length });
    out.push(`-- ${table} (${data.length} rows)`);
    out.push(`DELETE FROM "${table}";`);

    for (const r of data) {
      // libsql attaches a _metadata property to result rows; it is not a column.
      const cols = Object.keys(r).filter((c) => c !== '_metadata');
      const colList = cols.map((c) => `"${c}"`).join(', ');
      const vals = cols.map((c) => sqlLiteral(r[c])).join(', ');
      out.push(`INSERT INTO "${table}" (${colList}) VALUES (${vals});`);
      rows++;
    }
    out.push('');
  }

  if (missing.length) throw new BackupIncompleteError(missing);

  return { sql: out.join('\n'), rows, tables };
}

/** Filename carrying the date, so several backups sort and never overwrite. */
export function backupFilename(now = new Date()): string {
  const d = now.toISOString().slice(0, 10);
  return `sutra-backup-${d}.sql`;
}
