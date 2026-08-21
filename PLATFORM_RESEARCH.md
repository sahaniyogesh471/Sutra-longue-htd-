# Platform Research — No Card, No KYC, Free, Secure & Fast

**Date:** 2026-08-21 · **Constraint:** ❌ no credit card · ❌ no KYC · ✅ free forever

---

## 1. What the project actually needs (measured)

| Requirement | Measured value | Implication |
|---|---|---|
| RAM under load | **111 MB** (60 requests) | 512 MB free tiers are enough (4.6× headroom) |
| Disk (code + assets) | 1.9 MB | Trivial |
| Database | 668 KB SQLite | Well under every free DB tier |
| Page weight | 17 KB gzipped | Very fast anywhere |
| Runtime | Node.js 22, long-running Express | ❌ Serverless-only hosts (Vercel/Netlify) are out |
| Persistence | DB + uploaded images must survive restarts | ❌ Ephemeral-disk hosts need external storage |

### 🔑 Key discovery about images

`image_url` in the database already stores **full external URLs**:

```
dishes.image_url  = https://images.unsplash.com/photo-1540189549336-...
gallery.image_url = https://images.unsplash.com/photo-1504674900247-...
```

Templates render `<img src="<%= dish.image_url %>">` directly, and the CSP is
`img-src 'self' data: blob: https:` — **any HTTPS image already works**.

➡️ Moving image storage to an external service needs **no template changes and
no CSP changes**. This makes the ephemeral-disk problem much easier to solve.

---

## 2. Card / KYC verification results

Every platform checked specifically for the no-card constraint:

| Platform | Card required? | Verdict |
|---|---|---|
| **Render** (web service) | ❌ **No** | ✅ Sources conflict, but Render's own free tier is documented cardless |
| **Turso** (database) | ❌ **No** | ✅ Official pricing page: "no credit card required" |
| **Cloudinary** (images) | ❌ **No** | ✅ Permanent free plan, production use allowed |
| **Cloudflare** (CDN/DNS) | ❌ **No** | ✅ Free plan cardless |
| **Supabase** | ❌ No | ⚠️ But pauses after **7 days idle** — bad for a restaurant site |
| **Koyeb** | ⚠️ Region-dependent | ⚠️ Not guaranteed; also **no volumes** on free |
| **Railway** | ❌ No | ⚠️ $5 credit only, then ~$2-4/mo |
| **Cloudflare R2** | ✅ **Yes** | ❌ **Ruled out** — R2 needs a card even for the free tier |
| **Oracle Cloud** | ✅ Yes | ❌ Your card was declined |
| **Northflank** | ✅ Yes | ❌ Card for verification |
| **Fly.io** | ✅ Yes | ❌ No real free tier since Oct 2024 |

> ⚠️ **R2 was in my earlier recommendation — that was wrong.** Cloudflare
> requires a payment method to enable R2, even on the free allowance. Replaced
> with Cloudinary below.

---

## 3. 🏆 Recommended stack

```
        Cloudflare (free, no card)
        CDN · SSL · DDoS · hides origin
                    │
        ┌───────────▼───────────┐
        │  Render (free, no card)│   Node app — stateless
        └───┬────────────────┬───┘
            │                │
   ┌────────▼─────┐   ┌──────▼──────────┐
   │ Turso (free) │   │ Cloudinary (free)│
   │ SQLite/libSQL│   │ images + CDN     │
   │ 5 GB, no card│   │ 25 credits, no card│
   └──────────────┘   └─────────────────┘
```

### Why each piece

**Render** — genuine cardless free tier, 512 MB RAM (we need 111 MB), deploys
straight from GitHub, free SSL, 750 hours/month.

**Turso** — *it is SQLite*. 5 GB storage, 500M reads/month, no card.
✅ **Verified:** the `libsql` npm package is a **drop-in synchronous replacement**
for `better-sqlite3`. I tested `.prepare().all()`, `.get()`, `.run()`,
`.pragma()` and `db.transaction()` — all work **without `await`**.
➡️ **Only 1 import line changes** in `src/db/index.ts`. My earlier "187 async
rewrites" estimate was wrong.

**Cloudinary** — 25 credits/month (~5 GB storage, 10 GB delivery), permanent,
no card, production use explicitly allowed. Auto WebP/AVIF + resizing via URL.

**Cloudflare** — CDN, free SSL, DDoS protection, and the nameservers you need
for the `.com.np` application.

### ⚠️ The one real trade-off

Render free **sleeps after 15 minutes idle** → first visitor waits ~30-60 s.

**Fix:** a free uptime monitor (UptimeRobot / cron-job.org — both cardless)
pings the site every 10 minutes. It never sleeps. This is standard practice and
costs nothing.

---

## 4. Comparison with the alternatives

| Stack | Card | Sleeps | Data safe | Code change | Speed |
|---|---|---|---|---|---|
| **Render + Turso + Cloudinary + CF** | ❌ none | No¹ | ✅ | 1 import + upload fn | 🟢 Fast |
| Render alone | ❌ none | Yes | ❌ wiped | none | 🟡 |
| Koyeb + Turso + Cloudinary | ⚠️ maybe | No | ✅ | same | 🟢 |
| Supabase-based | ❌ none | **7-day pause** | ✅ | large (Postgres) | 🔴 |
| Oracle + Cloudflare | ✅ blocked | No | ✅ | none | 🟢 |

¹ with the uptime pinger

---

## 5. Security assessment

The app's own security is already strong (verified in `WEBSITE_ANALYSIS.md`:
strict CSP, scrypt hashing, CSRF, rate limiting, 0 npm vulnerabilities).

This stack **improves** the infrastructure side vs a self-managed VM:

| Aspect | Self-managed VM | This stack |
|---|---|---|
| OS patching | You must do it | ✅ Managed by Render |
| SSH exposure | Port 22 open | ✅ No SSH surface at all |
| TLS renewal | certbot cron | ✅ Automatic |
| DB backups | Your cron job | ✅ Turso point-in-time (1 day) |
| DDoS | Cloudflare needed | ✅ Cloudflare |
| Secrets | `.env` on disk | ✅ Encrypted env vars |

**No KYC anywhere** — all four services accept email/GitHub signup only.

---

## 6. Work required

| Task | Effort | Risk |
|---|---|---|
| Swap `better-sqlite3` → `libsql` | **1 import line** | 🟢 Very low (API identical, tested) |
| Cloudinary upload in `src/lib/media.ts` | ~40 lines, 1 file | 🟡 Medium |
| Migrate existing DB to Turso | 1 CLI command | 🟢 Low |
| `render.yaml` for the free plan | Small edit | 🟢 Low |
| Uptime pinger | 2 min setup | 🟢 None |

**Total: ~2-3 hours**, mostly the Cloudinary upload path.

> Image uploads currently use `sharp` to convert to WebP locally. Cloudinary does
> this server-side, so that code gets *simpler*, and `sharp` (a heavy native
> dependency that keeps breaking in this sandbox) can be dropped entirely.

---

## 7. Migration path & reversibility

Everything stays **portable**:

- Turso is SQLite — `turso db shell . .dump` gives a plain SQLite file back
- Cloudinary URLs are plain strings in the DB — swappable any time
- Render deploys from your GitHub repo — no lock-in
- If your Oracle card ever works, the VM scripts in `deploy/` still apply

---

## 8. Recommendation

**Go with Render + Turso + Cloudinary + Cloudflare.**

- ✅ No credit card, no KYC anywhere
- ✅ Free permanently (not a trial)
- ✅ Data survives restarts
- ✅ Fast: 17 KB pages + two CDNs
- ✅ More secure than a self-managed VM (no SSH, managed patching)
- ✅ Gives Cloudflare nameservers for the `.com.np` application
- ⚠️ Needs an uptime pinger, and ~2-3 hours of code work

### Suggested order

1. **Turso** — sign up, migrate DB, swap the import *(fastest win)*
2. **Render** — deploy, site is live on `*.onrender.com`
3. **UptimeRobot** — stop the sleeping
4. **Cloudinary** — move image uploads
5. **Cloudflare** — add CDN, get nameservers
6. **register.com.np** — apply with those nameservers

Steps 1-3 get you **live today**. Steps 4-6 can follow.

---

## Corrections to earlier advice

Research mode caught three of my own errors:

1. ❌ **"Cloudflare R2 needs no card"** → it **does**. Replaced with Cloudinary.
2. ❌ **"Turso needs 187 async rewrites"** → `libsql` is synchronous;
   **1 line** changes. Tested and confirmed.
3. ❌ **"Render free needs a card"** → conflicting sources; Render's own
   documentation and multiple 2026 reviews say the free tier is cardless.
   *To be confirmed at signup — it is the one open question.*
