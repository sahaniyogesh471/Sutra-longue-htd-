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

/**
 * Small helper to set security headers without pulling in a full helmet dependency.
 *
 * The CSP is deliberately permissive enough to keep the app fully functional
 * (EJS inline data scripts, Google Fonts, YouTube / Google Maps embeds,
 * Unsplash imagery and canvas `toBlob` output) while still locking down
 * `object-src`, `base-uri`, `form-action` and frame ancestors.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), autoplay=(self)'
  );
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "frame-src 'self' https://maps.google.com https://www.youtube.com https://www.youtube-nocookie.com",
      "connect-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://wa.me",
      "frame-ancestors 'none'",
    ].join('; ')
  );
  // HSTS is only honoured over HTTPS; harmless when a request arrives over HTTP.
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
}
