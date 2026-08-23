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

const HEX_COLOR_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: unknown): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) return 'Please choose a color.';
  return HEX_COLOR_RE.test(s) ? null : 'Please enter a valid hex color, e.g. #C9A35C.';
}

/** Star rating between 0 and 5, at most one decimal place. Blank hides the badge. */
export function isRating(value: unknown): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) return null;
  if (!/^[0-5](\.\d)?$/.test(s)) return 'Enter a rating between 0 and 5, e.g. 4.0.';
  return null;
}

/** Whole number of reviews. Blank hides the count. */
export function isCount(value: unknown): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) return null;
  if (!/^\d{1,7}$/.test(s)) return 'Enter a whole number, e.g. 272.';
  return null;
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

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,50}$/;

/** Username validation: 3–50 chars of A-Z, a-z, 0-9, _, ., -. */
export function isUsername(value: unknown): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) return 'Username is required.';
  if (s.length < 3 || s.length > 50) return 'Username must be 3–50 characters.';
  if (!USERNAME_RE.test(s)) return 'Username may only contain letters, numbers, "_", "." and "-".';
  return null;
}

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'passw0rd', '12345678', '123456789',
  '1234567890', '12345678910', 'qwerty', 'qwerty123', 'qwertyuiop', 'letmein',
  'letmein123', 'admin', 'admin123', 'admin1234', 'welcome', 'welcome1',
  'welcome123', 'monkey', 'monkey123', 'dragon', 'dragon123', 'football',
  'baseball', 'abc123', 'abc12345', 'abcd1234', '11111111', '111111111',
  '00000000', '12341234', 'iloveyou', 'superman', 'princess', 'sutra1234',
  'changeme', 'changeme123',
]);

const SEQUENTIAL_RE = /(0123456789|1234567890|abcdefghij|qwertyuiop|asdfghjkl|zxcvbnm)/i;

/** Password policy: 8–128 chars, not trivially weak/repeated/sequential. */
export function passwordError(value: unknown): string | null {
  const s = typeof value === 'string' ? value : '';
  if (!s) return 'Password is required.';
  if (s.length < 8) return 'Password must be at least 8 characters.';
  if (s.length > 128) return 'Password must be 128 characters or fewer.';
  if (/^(.)\1+$/.test(s)) return 'Password must not be a repeated character.';
  if (/(.)\1{4,}/.test(s)) return 'Password must not contain long runs of the same character.';
  if (SEQUENTIAL_RE.test(s.toLowerCase())) return 'Password must not be a simple sequential string.';
  if (COMMON_PASSWORDS.has(s.toLowerCase())) return 'Password is too common — choose something harder to guess.';
  return null;
}
