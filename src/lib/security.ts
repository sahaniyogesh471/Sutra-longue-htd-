import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * CSRF protection — session-bound double-submit token.
 * The token lives in the session; admin templates embed it in a
 * <meta name="csrf-token"> tag and forms send it as X-CSRF-Token or _csrf.
 */
export function getCsrfToken(req: Request): string {
  const s = req.session as { csrf?: string } | undefined;
  if (!s?.csrf) {
    const token = crypto.randomBytes(24).toString('hex');
    if (s) s.csrf = token;
    return token;
  }
  return s.csrf;
}

export function csrfProtect(req: Request, res: Response, next: NextFunction): void {
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!mutating) return next();

  const expected = (req.session as { csrf?: string } | undefined)?.csrf;
  const provided = (req.get('x-csrf-token') ?? req.body?._csrf ?? '') as string;

  if (!expected || !provided) {
    res.status(403).json({ error: 'CSRF token missing.' });
    return;
  }
  const a = Buffer.from(String(expected));
  const b = Buffer.from(String(provided));
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) {
    res.status(403).json({ error: 'CSRF token invalid.' });
    return;
  }
  next();
}

/** Small helper to set security headers without pulling in a full helmet dependency. */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  next();
}
