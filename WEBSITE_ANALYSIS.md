# Sutra Lounge — Pre-Launch Analysis

**Date:** 2026-08-20 · **Verdict:** ✅ **READY TO LAUNCH** (with 1 content fix)

Every number below was measured against the running application, not estimated.

---

## 1. Overall score

| Area | Score | Notes |
|---|---|---|
| Performance | 🟢 10/10 | 17 KB gzipped homepage, 12 ms render |
| Security | 🟢 10/10 | Strong CSP, admin locked, scrypt hashing |
| SEO | 🟢 10/10 | Schema.org, OG tags, sitemap, 29/29 alt texts |
| Accessibility | 🟢 9/10 | Single h1, alt text everywhere, semantic HTML |
| Content | 🟡 7/10 | ⚠️ 4 of 5 reviews are demo data |
| Code quality | 🟢 10/10 | Typecheck clean, 0 vulnerabilities |

**The code is production-grade. The only blocker is fake review content.**

---

## 2. Performance (measured)

| Page | Raw HTML | Gzipped | Server render |
|---|---|---|---|
| Homepage `/` | 86.4 KB | **17.2 KB** | 12 ms |
| Menu `/menu.html` | 32.5 KB | **8.1 KB** | 5.6 ms |

**Assets:** img 72 KB · css 52 KB · js 104 KB · **whole site 1.9 MB** · DB 668 KB

Why this is excellent:
- A 17 KB page loads fast even on 3G — important for mobile users in Nepal
- 29/29 images use `loading="lazy"`
- Uploaded images are auto-converted to WebP, capped at 1600 px
- Compression (gzip/Brotli) already enabled server-side
- Static assets cached 7–30 days in production

**Implication for hosting:** resource needs are tiny. Even Oracle's smallest free
VM is massive overkill — which is good, it means zero cost and lots of headroom.

---

## 3. Security audit

### Verified working

| Control | Status |
|---|---|
| Content-Security-Policy | ✅ Strict, `object-src 'none'`, `frame-ancestors 'none'` |
| X-Frame-Options | ✅ `DENY` — clickjacking blocked |
| X-Content-Type-Options | ✅ `nosniff` |
| Referrer-Policy | ✅ `strict-origin-when-cross-origin` |
| Permissions-Policy | ✅ camera/mic/geolocation/payment disabled |
| Admin pages | ✅ 302 → login when unauthenticated |
| Admin API without auth | ✅ **403 Forbidden** |
| CSRF protection | ✅ On all admin routes |
| Password hashing | ✅ **scrypt** with per-user salt + `timingSafeEqual` |
| Session cookies | ✅ `httpOnly`, `sameSite=lax`, `secure` in prod |
| Login rate limit | ✅ 10 attempts / 15 min |
| Recovery rate limit | ✅ 5 attempts / 15 min |
| Admin cache policy | ✅ `no-store` |
| Hardcoded secrets | ✅ None found |
| `.env` in git history | ✅ Never committed |
| npm vulnerabilities | ✅ **0** |
| Upload validation | ✅ Magic-byte check, 8 MB cap, random filenames |

### Remaining risk: the server itself

The application is solid; what needs protecting is the host. Handled by the
plan: firewall restricted to Cloudflare, origin IP hidden, unprivileged systemd
user, automatic OS updates, daily backups.

---

## 4. SEO audit

| Check | Result |
|---|---|
| Title | ✅ 68 chars, includes "Hetauda" |
| Meta description | ✅ 160 chars (optimal) |
| Canonical URL | ✅ Present (host-derived) |
| Open Graph tags | ✅ 7 |
| JSON-LD structured data | ✅ `Restaurant`, `PostalAddress`, `OpeningHoursSpecification` |
| H1 | ✅ Exactly 1 |
| Image alt text | ✅ **29 / 29** |
| Viewport (mobile) | ✅ Correct |
| `lang` attribute | ✅ Set |
| robots.txt | ✅ Admin disallowed, sitemap linked |
| sitemap.xml | ✅ Both pages, real `lastmod` |
| 404 page | ✅ Returns real 404 status |
| `/index.html` | ✅ 301 → `/` |

The `Restaurant` schema is a significant advantage for local search — Google can
show your hours, address and rating directly in results.

> URLs currently read `localhost:4173` because they are derived from the request
> host. They become the real domain automatically once live. **No action needed.**

---

## 5. Content status

| Content | Count | Status |
|---|---|---|
| Dishes | 11 | ✅ All have Nepali translations |
| Gallery images | 9 | ✅ |
| Opening hours | 7 days | ✅ |
| Reviews (visible) | 5 | ⚠️ **4 are demo data** |
| Settings | 21 | ✅ Real contact info |

**Contact details verified as real:**
- Phone `057-522111` · Email `sutralonguehtd@gmail.com`
- Address: Hupra, Hetauda-4, Makwanpur, Nepal
- Google Maps link present

**Nepali translation coverage: 100%** (0 dishes, 0 reviews missing).

### ⚠️ The one blocker

Four reviews are seeded demo content: **Rabina Shrestha, Prakash Adhikari,
Sunita Gurung, Aayush Shrestha**. Only *Yogesh Sahani* is real.

These are fictional people. Publishing them on a real restaurant site:
- misleads customers making a dining decision
- can violate consumer-protection and advertising rules
- risks penalties if replicated to Google Business Profile

**Fix:** delete them in Admin → Reviews, or replace with real customer reviews.
Launching with **1 genuine review is better than 5 fake ones.**

---

## 6. Platform decision — re-validated

The measured profile (1.9 MB site, 668 KB DB, 17 KB pages, needs a writable disk
for SQLite + uploads) confirms the earlier choice.

| Platform | Verdict |
|---|---|
| **Oracle Always Free + Cloudflare** | ✅ **Chosen** — persistent disk, no sleep, free forever |
| Render Free | ❌ Ephemeral disk wipes data; sleeps 15 min → slow first load |
| Vercel/Netlify | ❌ Server-rendered app (143 EJS expressions); would need a rewrite |
| Fly.io | ❌ No real free tier for new accounts since Oct 2024 |
| Turso + R2 | ⏳ Good, but needs 187 sync DB calls converted to async — later |

**Requirements vs Oracle free allowance:** the app needs ~100 MB RAM and <1 GB
disk; the VM provides 12 GB RAM and 200 GB. Roughly 100× headroom.

---

## 7. ⚠️ Important: `.com.np` changes the launch order

You plan to add a free government `.com.np` domain later. Verified requirements:

- Registered **only** at `register.com.np` (Mercantile Communications) — not
  Namecheap/GoDaddy/Cloudflare
- Free to register **and** renew
- Needs: citizenship/passport scan, **cover letter**, and business documents
  (company registration / PAN) if registering as a business
- **You must supply two DNS nameservers when applying**
- Manual approval: typically 1–3 business days

### What this means

**Have the nameservers ready before you apply.** Two options:

1. **Recommended — sign up for Cloudflare first (free, instant).** Add the
   domain there, get your two Cloudflare nameservers, then submit those in the
   `.com.np` application. Cleanest path, and you get the CDN from day one.
2. Or apply with any nameservers and change them later (extra round-trip of
   manual approval).

Because approval takes days, the sequence is:

```
Today   → Launch on the server IP (site is live)
Day 1   → Sign up for Cloudflare, note the two nameservers
Day 1   → Apply at register.com.np with those nameservers
Day 2-4 → Approval arrives → domain points at Cloudflare → HTTPS
```

**Naming tip:** the domain must justifiably match your name/business. Since the
restaurant is "Sutra Lounge", `sutralounge.com.np` should qualify — attach
business registration if you have it, otherwise apply as an individual with a
cover letter explaining the connection.

---

## 8. Recommendations

### Before launch
1. ⚠️ **Remove or replace the 4 demo reviews** — the only real blocker

### At launch
2. Follow `LAUNCH_PLAN.md` Phase 1 → live on IP today
3. Enable daily backups (Phase 4)

### Within the first week
4. Sign up for Cloudflare, apply for `.com.np` with its nameservers
5. Upload real food photography (biggest visual improvement available)
6. Google Business Profile — critical for a local restaurant
7. Google Search Console + submit sitemap

### Optional later
8. Turso + R2 if you ever outgrow a single server
9. `docs/PRODUCTION_LAUNCH_CHECKLIST.md` remaining domain-dependent items

---

## Conclusion

The codebase is **genuinely production-ready** — fast, secure, well-structured,
fully bilingual, with clean typecheck and zero dependency vulnerabilities. This
is better prepared than most small-business sites at launch.

**One content fix (fake reviews), then ship it.**
