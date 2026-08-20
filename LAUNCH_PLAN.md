# Sutra Lounge — Launch Plan

**Goal:** Sutra Lounge live on a fast, secure, free platform.
**Total time:** ~1 hour 15 min · **Cost:** ₹0 / $0 per month, forever

---

## The stack (decided)

| Layer | Platform | Why | Cost |
|---|---|---|---|
| Edge / CDN / security | **Cloudflare Free** | Fast worldwide, free SSL, DDoS protection, hides server IP | $0 |
| App server | **Oracle Cloud Always Free VM** | Persistent disk, never sleeps, 2 OCPU / 12 GB | $0 |
| Database + images | SQLite + local disk on the VM | Already built; survives restarts | $0 |

**Why this and not the alternatives** (full analysis in `ARCHITECTURE_OPTIONS.md`):

- ❌ *Render Free* — no persistent disk; admin edits and photos get wiped. Also
  sleeps after 15 min → ~1 min cold start when a customer opens your site.
- ❌ *Vercel/Netlify frontend split* — your site is server-rendered (143 EJS
  expressions); would need a frontend rewrite and risk existing SEO work.
- ❌ *Turso + R2* — good free tiers, but requires converting 187 sync DB calls to
  async. Worth doing later if you scale, not now.
- ✅ **Oracle + Cloudflare** — zero code changes, nothing sleeps, data is safe.

---

## Speed & security summary

**Fast because:** Cloudflare caches CSS/JS/images at edge locations near Nepal
and India · Mumbai region ≈ low latency · the VM never sleeps (no cold starts) ·
Brotli compression + HTTP/2 · images already served as WebP.

**Secure because:** origin IP hidden behind Cloudflare · firewall allows web
traffic *only* from Cloudflare · unmetered DDoS protection · WAF challenge on
`/admin` · HTTPS everywhere · app runs as an unprivileged user under a hardened
systemd unit · admin passwords hashed, sessions `httpOnly`+`Secure`, CSRF
protection, login rate-limited by real visitor IP.

---

## Phase 0 — Prepare (10 min, before touching servers)

| # | Task | Owner |
|---|---|---|
| 0.1 | Decide the domain name (e.g. `sutralounge.com.np` or `sutralounge.com`) | **You** |
| 0.2 | Buy the domain — or decide to launch on the bare IP first | **You** |
| 0.3 | Replace the 4 demo reviews with real customer reviews ⚠️ | **You** (in admin, after launch) |
| 0.4 | Gather real food photos to upload | **You** |
| 0.5 | Confirm contact details are correct | ✅ done — phone `057-522111`, Hupra Hetauda-4, verified in DB |

> ⚠️ **0.3 is important.** The database currently has 4 seeded demo reviews
> (Rabina Shrestha, Prakash Adhikari, Sunita Gurung, Aayush Shrestha). Publishing
> fake reviews for a real restaurant is misleading to customers and can violate
> Google's review policies. Delete or replace them from the admin panel once you
> are live. Yogesh Sahani's review is real content you added.

**Domain tips for Nepal:** `.com.np` is free from Mercantile but requires
document verification and takes a few days. A `.com` from Namecheap/GoDaddy costs
~NPR 1,500/year and works instantly. **You can launch on the IP address today and
add the domain later** — nothing blocks on it.

---

## Phase 1 — Oracle Cloud server (30 min)

Guide: **`ORACLE_CLOUD_GUIDE.md`** (steps 1–6)

| # | Task | Time | Watch out for |
|---|---|---|---|
| 1.1 | Create Oracle Cloud account | 10 min | Home region **Mumbai** — permanent, cannot change |
| 1.2 | Create VM: Ubuntu 24.04, `VM.Standard.A1.Flex` | 5 min | **Exactly 2 OCPU / 12 GB** — limit halved 18 Aug 2026 |
| 1.3 | Save the SSH private key | 1 min | Downloadable only once |
| 1.4 | Add ingress rules for ports 80 + 443 | 5 min | Leave *Source Port Range* **empty** |
| 1.5 | SSH in | 2 min | Username is `ubuntu` |
| 1.6 | Run the one-line setup script | 5 min | **Copy the admin password + recovery code** — shown once |
| 1.7 | Open `http://YOUR_IP` and verify | 2 min | Test admin login too |

✅ **Milestone: the website is live on the internet.**

---

## Phase 2 — Domain + HTTPS (15 min, needs a domain)

Guide: **`ORACLE_CLOUD_GUIDE.md`** (step 7)

| # | Task | Notes |
|---|---|---|
| 2.1 | Point A records `@` and `www` at the server IP | DNS takes minutes–hours |
| 2.2 | Update the domain in the nginx config | `sudo nano /etc/nginx/sites-available/sutra-lounge` |
| 2.3 | Get the free TLS certificate | `sudo certbot --nginx -d ... -d www....` |
| 2.4 | Set `SESSION_SECURE=true` and restart | **Only after HTTPS works**, or admin login silently fails |

✅ **Milestone: `https://yourdomain.com` with a padlock.**

---

## Phase 3 — Cloudflare edge (15 min)

Guide: **`CLOUDFLARE_SETUP.md`**

| # | Task | Notes |
|---|---|---|
| 3.1 | Add the site to Cloudflare, switch nameservers | Free plan |
| 3.2 | DNS records **Proxied** (orange cloud) | This is what hides your IP |
| 3.3 | SSL mode → **Full (Strict)** | *Flexible* causes redirect loops |
| 3.4 | Enable Always Use HTTPS + Automatic HTTPS Rewrites | |
| 3.5 | `sudo bash deploy/cloudflare-realip.sh` | Restores real visitor IPs — needed for login rate limiting |
| 3.6 | `sudo bash deploy/lock-to-cloudflare.sh` | ⚠️ Only *after* Cloudflare is confirmed working |
| 3.7 | Security settings + WAF rule on `/admin` | Bot Fight Mode, Managed Challenge |

✅ **Milestone: fast globally, origin hidden, DDoS protected.**

---

## Phase 4 — Harden & maintain (10 min)

| # | Task | Command |
|---|---|---|
| 4.1 | Enable daily backups | `sudo crontab -e` → `0 3 * * * /bin/bash /opt/sutra-lounge/deploy/backup.sh` |
| 4.2 | Test a backup now | `sudo bash /opt/sutra-lounge/deploy/backup.sh` |
| 4.3 | Automatic OS security updates | `sudo apt install -y unattended-upgrades` |
| 4.4 | Oracle budget alert ($1) | Billing → Budgets — warns if anything ever costs money |
| 4.5 | Download a backup off-server | `scp -i key ubuntu@IP:/opt/sutra-backups/*.tar.gz ~/` |

✅ **Milestone: safe against data loss and surprise bills.**

---

## Phase 5 — Go-live content & SEO (30 min, do after launch)

| # | Task | Where |
|---|---|---|
| 5.1 | **Delete/replace the 4 demo reviews** ⚠️ | Admin → Reviews |
| 5.2 | Upload real food photos | Admin → Gallery / Dishes |
| 5.3 | Verify menu items and prices | Admin → Menu |
| 5.4 | Check opening hours | Admin → Hours |
| 5.5 | Google Search Console — verify + submit sitemap | `https://yourdomain.com/sitemap.xml` |
| 5.6 | Create/claim the Google Business Profile | Critical for a local restaurant |
| 5.7 | Work through the remaining items | `docs/PRODUCTION_LAUNCH_CHECKLIST.md` |

---

## Final verification

```bash
# Origin hidden — should show Cloudflare IPs, not your server's
dig +short yourdomain.com
curl -sI https://yourdomain.com | grep -i server      # server: cloudflare

# App healthy
curl -s https://yourdomain.com/api/health             # {"ok":true,...}

# Redirects and pages
curl -sI http://yourdomain.com | head -1              # 301 → HTTPS
```

Then in a browser: homepage loads with 🔒 · menu works · admin login works ·
upload an image → `sudo systemctl restart sutra-lounge` → image still there ·
Nepali/English language switch works · test on a phone.

---

## Timeline

| Phase | Time | Blocked by |
|---|---|---|
| 0 · Prepare | 10 min | Domain decision |
| 1 · Oracle VM | 30 min | Oracle account approval (can take a few hours) |
| 2 · Domain + HTTPS | 15 min | Domain purchase + DNS |
| 3 · Cloudflare | 15 min | Phase 2 |
| 4 · Harden | 10 min | Phase 1 |
| 5 · Content & SEO | 30 min | Phase 1 |

**Fastest path to live: Phases 1 + 4 only = ~40 min on the bare IP.**
Add the domain (2, 3) whenever it is ready.

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Oracle "Out of host capacity" for ARM | Medium | Retry at another time, or use AMD `E2.1.Micro` (also free) |
| Oracle account approval delayed | Medium | Nothing to do but wait; start Phase 0 meanwhile |
| Port 80/443 blocked after setup | Low | Setup script fixes the hidden iptables rule automatically |
| Locked out by Cloudflare lockdown | Low | Run only after verifying; `--undo` flag available |
| Admin login fails after HTTPS | Low | Ensure `SESSION_SECURE=true` **only** once HTTPS is live |
| Data loss | Low | Daily backups + off-server copies (Phase 4) |

---

## Ready to start?

Everything on the code side is done and tested: production build is clean,
typecheck passes, and every script has been syntax-checked and exercised.

**Next action: Phase 0.1 — decide the domain**, then begin Phase 1 with
`ORACLE_CLOUD_GUIDE.md`.
