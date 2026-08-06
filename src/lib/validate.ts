/**
 * Server-side validation helpers. All admin mutations run through these —
 * the frontend never decides what is valid.
 */

export type VErr = Record<string, string | undefined>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URL_RE = /^https?:\/\/[\w.-]+(?::\d+)?(?:\/.*)?$/i;
const PHONE_RE = /^[0-9+\-()\s.]{6,24}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const PRICE_RE = /^[A-Za-z0-9Rs,.\s\u00A0-]{1,32}$/;

export function required(value: unknown): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  return s ? null : 'This field is required.';
}

export function maxLen(value: unknown, n: number): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  return s.length <= n ? null : `Must be ${n} characters or fewer.`;
}

export function isEmail(value: unknown): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) return null;
  return EMAIL_RE.test(s) ? null : 'Please enter a valid email address.';
}

export function isUrl(value: unknown, allowLocal = false): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) return null;
  if (allowLocal && s.startsWith('/')) {
    return s.startsWith('/uploads/') || s.startsWith('/img/') ? null : 'Invalid local image path.';
  }
  return URL_RE.test(s) ? null : 'Please enter a valid URL (starting with http:// or https://).';
}

export function isPhone(value: unknown): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) return null;
  if (s.length > 24) return 'Phone number is too long.';
  return PHONE_RE.test(s) ? null : 'Please enter a valid phone number.';
}

export function isTime(value: unknown): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) return null;
  return TIME_RE.test(s) ? null : 'Please enter a valid time (HH:MM, 24-hour).';
}

export function isPrice(value: unknown): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) return null;
  return PRICE_RE.test(s) ? null : 'Please enter a valid price (e.g. Rs 545).';
}

export function isIntRange(value: unknown, min: number, max: number): string | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return `Must be between ${min} and ${max}.`;
  return null;
}

export function isOneOf(value: unknown, allowed: string[]): string | null {
  return allowed.includes(String(value)) ? null : 'Invalid value selected.';
}

export function collect(results: Record<string, string | null>): VErr {
  const out: VErr = {};
  for (const [k, v] of Object.entries(results)) if (v) out[k] = v;
  return out;
}

/** Normalises optional string fields to trimmed strings or null. */
export function optStr(value: unknown, max = 200): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.slice(0, max);
}

export function boolInt(value: unknown): number {
  return value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0;
}

export function toInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}
