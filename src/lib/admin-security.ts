import type { Request } from 'express';
import type { DB } from '../db/index.js';
import { ADMIN_RECOVERY_CODE } from '../config.js';
import { hashPassword, verifyPassword } from './password.js';

const SECURITY_ROW_ID = 1;

export interface SecurityRow {
  id: number;
  recovery_hash: string;
  created_at: string;
}

/** The single logical recovery configuration row (id is pinned to 1). */
export function getSecurityRow(db: DB): SecurityRow | undefined {
  return db.prepare('SELECT id, recovery_hash, created_at FROM admin_security WHERE id = ?').get(SECURITY_ROW_ID) as
    | SecurityRow
    | undefined;
}

export function recoveryConfigured(db: DB): boolean {
  return getSecurityRow(db) !== undefined;
}

/**
 * One-time recovery-code initialization. Never overwrites an existing hash —
 * the permanent code is immutable once set.
 *
 * The recovery code is supplied by the operator via the ADMIN_RECOVERY_CODE
 * environment variable. The plaintext is never logged, rendered, returned by
 * any API, or written to disk — only its secure hash is persisted.
 *
 * If ADMIN_RECOVERY_CODE is not supplied (or is not a 4-digit code) during
 * first initialization, recovery is NOT provisioned and a deployment
 * requirement is logged instead. A generated code is deliberately NOT used,
 * because this architecture has no safe channel to deliver a generated secret
 * to the administrator without printing it (which would be a log leak).
 */
export function ensureRecoveryCode(db: DB): void {
  if (getSecurityRow(db)) return;

  const code = ADMIN_RECOVERY_CODE.trim();
  if (!/^\d{4}$/.test(code)) {
    console.log('');
    console.log('==========================================================');
    console.log('  Admin account recovery is NOT configured.');
    console.log('  Deployment requirement:');
    console.log('  Set ADMIN_RECOVERY_CODE to a 4-digit code BEFORE the');
    console.log('  first server start (or before this database has a');
    console.log('  recovery configuration). The code is permanent and');
    console.log('  cannot be changed or recovered later.');
    console.log('==========================================================');
    console.log('');
    return;
  }

  db.prepare(
    'INSERT INTO admin_security (id, recovery_hash, created_at) VALUES (?, ?, datetime(\'now\'))'
  ).run(SECURITY_ROW_ID, hashPassword(code));
  console.log('[admin-security] Permanent 4-digit recovery code initialized.');
}

/** Constant-time check of the supplied code against the stored hash. */
export function verifyRecoveryCode(db: DB, code: string): boolean {
  const row = getSecurityRow(db);
  if (!row) return false;
  return verifyPassword(code, row.recovery_hash);
}

/** Records a security audit event. Never stores passwords/hashes/codes. */
export function auditSecurity(db: DB, event: string, detail = '', req?: Request): void {
  const ip = req?.ip ?? req?.socket?.remoteAddress ?? '';
  db.prepare(
    'INSERT INTO security_events (event, detail, ip, created_at) VALUES (?, ?, ?, datetime(\'now\'))'
  ).run(event, String(detail).slice(0, 400), ip);
}

/**
 * Invalidates sessions belonging to the given admin id.
 * When `keepSid` is provided, that session id is preserved (used for a
 * username change so the current session can be updated safely).
 */
export function invalidateAdminSessions(db: DB, adminId: number, keepSid?: string): void {
  const rows = db.prepare('SELECT id, data FROM sessions').all() as { id: string; data: string }[];
  for (const row of rows) {
    if (keepSid && row.id === keepSid) continue;
    let parsed: { admin?: { id?: number } } | null = null;
    try {
      parsed = JSON.parse(row.data) as { admin?: { id?: number } };
    } catch {
      /* malformed session rows are dropped below */
    }
    if (parsed?.admin && Number(parsed.admin.id) === Number(adminId)) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(row.id);
    }
  }
}
