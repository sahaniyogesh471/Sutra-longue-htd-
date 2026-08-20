# Sutra Lounge — Deployment Guide

## What this app needs

Sutra Lounge is **not** a static site. It is a Node.js (Express + EJS) server that
renders pages from a database.

| Requirement | Why |
|---|---|
| Node.js 22 runtime | The server is `dist/server.js` |
| **Persistent disk** | Content lives in SQLite (`data/sutra.db`) and uploaded images in `data/uploads` |
| Env secrets | `SESSION_SECRET`, `ADMIN_PASSWORD`, `ADMIN_RECOVERY_CODE` |
| HTTPS | Session cookies are set with `Secure` in production |

> **The persistent disk is the deciding factor.** On a host without one, every
> restart or redeploy wipes the database and all uploaded photos, resetting the
> site back to the seeded demo content.

---

> 🏗️ **Comparing architectures?** See
> [ARCHITECTURE_OPTIONS.md](./ARCHITECTURE_OPTIONS.md) — evaluates splitting the
> stack across free platforms (Turso, Cloudflare R2, static-frontend split) and
> explains which version is worth doing for this codebase.

## Choosing a host

| Option | Cost | Data safe? | Card needed | Verdict |
|---|---|---|---|---|
| **Oracle Cloud Always Free VM** | $0 forever | ✅ Yes | Verification only | **Best free + secure** |
| Render — Starter | $7/mo | ✅ Yes (1 GB disk) | Yes | Easiest paid |
| Render — Free | $0 | ❌ **No** — resets on restart | No | Demo only |
| Fly.io | ~$2–5/mo | ✅ Yes (volume) | Yes | Good, CLI-driven |

There is **no host that is both completely free and keeps admin data safe,
except a free VPS** (Oracle Cloud Always Free). Render Free will display the
site perfectly, but treat any admin edit as temporary.

---

## Option A — Oracle Cloud Always Free VM (recommended: free + persistent)

> 📘 **Full step-by-step walkthrough: [ORACLE_CLOUD_GUIDE.md](./ORACLE_CLOUD_GUIDE.md)**
> — signup, firewall rules, SSH, domain, HTTPS, backups and troubleshooting.
> The summary below is the short version.

1. Sign up at <https://cloud.oracle.com> → *Always Free* tier.
   Card is used for identity verification only; Always Free resources never bill.
2. Create a **VM instance**: shape `VM.Standard.A1.Flex` (ARM), image
   **Ubuntu 24.04**. Set **2 OCPU / 12 GB** — Oracle halved the ARM Always Free
   allowance from 4/24 to 2/12 on 18 August 2026. Download the SSH key.
3. In the instance's subnet **security list**, add ingress rules for TCP **80**
   and **443** from `0.0.0.0/0`.
4. SSH in and run the setup script:

   ```bash
   ssh -i your-key.key ubuntu@<SERVER_IP>
   sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/sahaniyogesh471/Sutra-longue-htd-/arena/01a00549-sutra-longue-htd/deploy/setup-vps.sh)" _ https://github.com/sahaniyogesh471/Sutra-longue-htd-.git arena/01a00549-sutra-longue-htd
   ```

   The script installs Node 22, nginx, and a firewall; builds the app; generates
   `SESSION_SECRET`, an admin password and a 4-digit recovery code; and starts it
   under systemd. **Copy the printed admin password and recovery code — they are
   shown once.**
5. Visit `http://<SERVER_IP>` to confirm the site loads.
6. When you have a domain: point its A record at the IP, edit
   `/etc/nginx/sites-available/sutra-lounge` (replace `example.com`), then

   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

Useful commands:

```bash
systemctl status sutra-lounge        # health
journalctl -u sutra-lounge -f        # live logs
cd /opt/sutra-lounge && sudo git pull && sudo npm ci && sudo npm run build \
  && sudo systemctl restart sutra-lounge   # deploy an update
```

Back up your data with `cp -r /opt/sutra-lounge/data ~/sutra-backup-$(date +%F)`.

---

## Option B — Render (easiest clicks)

1. Push this branch to GitHub.
2. <https://dashboard.render.com> → **New → Blueprint** → pick this repo.
   Render reads `render.yaml` and configures a Docker web service with a 1 GB
   disk mounted at `/app/data`.
3. When prompted, set the two secret env vars:
   - `ADMIN_PASSWORD` — a strong password
   - `ADMIN_RECOVERY_CODE` — exactly 4 digits, **permanent**
   (`SESSION_SECRET` is generated automatically.)
4. Deploy. You get `https://sutra-lounge.onrender.com` with free managed TLS.

**To run on the free plan instead:** in `render.yaml` change `plan: starter` to
`plan: free` and **delete the whole `disk:` block** (free services reject disks).
Accept that content resets on restart, and that the service sleeps after 15
minutes of inactivity with a ~1 min cold start.

---

## Option C — Fly.io

```bash
fly auth login
fly launch --no-deploy --copy-config          # uses fly.toml
fly volumes create sutra_data --size 1 --region sin
fly secrets set SESSION_SECRET="$(openssl rand -hex 32)" \
                ADMIN_PASSWORD='your-strong-password' \
                ADMIN_RECOVERY_CODE='1234'
fly deploy
fly open
```

---

## Option D — Any Docker host

```bash
docker build -t sutra-lounge .
docker volume create sutra-data
docker run -d --name sutra-lounge -p 80:4173 \
  -v sutra-data:/app/data \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  -e ADMIN_PASSWORD='your-strong-password' \
  -e ADMIN_RECOVERY_CODE='1234' \
  --restart unless-stopped \
  sutra-lounge
```

---

## Environment variables

See `.env.example`. Summary:

| Variable | Required | Notes |
|---|---|---|
| `SESSION_SECRET` | ✅ | 64-char random hex — `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | ✅ | Read only on the **first** start, to create the admin account |
| `ADMIN_RECOVERY_CODE` | ✅ | Exactly **4 digits**, **permanent**, cannot be changed later |
| `ADMIN_USERNAME` | – | Defaults to `admin` |
| `SUTRA_DB_PATH` | – | Point at the persistent volume, e.g. `/app/data/sutra.db` |
| `SESSION_SECURE` | – | Defaults to `true` in production; `false` only for plain-HTTP testing |
| `NODE_ENV` | ✅ | `production` — also enables `trust proxy` |
| `PORT` | – | Defaults to `4173` |

---

## Post-launch checklist

Canonical URLs, `robots.txt` and `sitemap.xml` are derived from the request host,
so they become correct automatically once the real domain serves the site.
After the domain is live, work through `docs/PRODUCTION_LAUNCH_CHECKLIST.md`
(Search Console verification, sitemap submission, `www` policy, CDN checks).

Verify after deploying:

- `https://yourdomain/api/health` → `{"ok":true,...}`
- `/`, `/menu.html` → 200
- `/admin` → redirects to login, and you can sign in
- Upload an image in the admin panel, restart the service, confirm it survives
