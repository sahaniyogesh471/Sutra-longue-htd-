# Adding Cloudflare (free) in front of your Oracle VM

Do this **after** the site is live on your Oracle server
(see `ORACLE_CLOUD_GUIDE.md`). Takes ~15 minutes and costs **$0 forever**.

You need a domain name for this — Cloudflare works by managing your domain's DNS.

## What you get for free

| Feature | Benefit |
|---|---|
| Global CDN | Pages and images cached at edge locations near your visitors |
| Universal SSL | HTTPS with no certificate renewals to manage |
| **Origin IP hidden** | Attackers see Cloudflare's IPs, never your server |
| Unmetered DDoS protection | Enterprise-grade mitigation |
| 5 WAF custom rules | Rate-limit or geo-restrict `/admin` |
| Always Online | Cached pages served even if your VM is rebooting |
| Analytics | Visitor stats with no third-party tracker |

---

## Step 1 — Add your site to Cloudflare

1. Sign up at <https://dash.cloudflare.com/sign-up> (free, no card).
2. **Add a site** → enter your domain → select the **Free** plan.
3. Cloudflare scans your existing DNS records. Make sure these exist and are
   **Proxied** (orange cloud ☁️ — this is what hides your server):

   | Type | Name | Content | Proxy |
   |---|---|---|---|
   | A | `@` | `YOUR_ORACLE_IP` | 🟠 Proxied |
   | A | `www` | `YOUR_ORACLE_IP` | 🟠 Proxied |

4. Cloudflare gives you two nameservers. At your **domain registrar**, replace
   the existing nameservers with those two.
5. Wait for activation (usually minutes; can take a few hours). Cloudflare emails
   you when it is active.

---

## Step 2 — Set up SSL correctly

⚠️ Get this right or you will hit redirect loops.

1. **SSL/TLS → Overview** → set mode to **Full (Strict)**.

   > *Do not use "Flexible"* — it causes infinite redirect loops with the nginx
   > HTTPS redirect, and leaves the Cloudflare→server hop unencrypted.

2. You need a valid certificate on the origin. Two choices:

   **Option A — keep Let's Encrypt (simplest if you already ran certbot):**
   nothing to do. Certbot's certificate is already valid and auto-renews.

   **Option B — Cloudflare Origin Certificate (15-year, no renewals):**
   - **SSL/TLS → Origin Server → Create Certificate** → accept defaults → Create
   - Copy the certificate and private key onto the server:
     ```bash
     sudo mkdir -p /etc/ssl/cloudflare
     sudo nano /etc/ssl/cloudflare/cert.pem   # paste the certificate
     sudo nano /etc/ssl/cloudflare/key.pem    # paste the private key
     sudo chmod 600 /etc/ssl/cloudflare/key.pem
     ```
   - Point nginx at them (`ssl_certificate` / `ssl_certificate_key`), then
     `sudo nginx -t && sudo systemctl reload nginx`

3. **SSL/TLS → Edge Certificates** → enable:
   - **Always Use HTTPS**
   - **Automatic HTTPS Rewrites**

---

## Step 3 — Restore real visitor IPs

With Cloudflare proxying, your server sees Cloudflare's IP for every request
unless you tell nginx otherwise. This matters because the app **rate-limits the
admin login** — without this, all visitors look like one IP.

On the server:

```bash
sudo bash /opt/sutra-lounge/deploy/cloudflare-realip.sh
```

That script fetches Cloudflare's official IP ranges, writes an nginx
`set_real_ip_from` config, and reloads nginx. Re-run it every few months (or via
cron) as Cloudflare's ranges change.

---

## Step 4 — Lock the origin so only Cloudflare can reach it

This is the step that actually secures the server: even if someone discovers your
IP, they cannot bypass Cloudflare.

```bash
sudo bash /opt/sutra-lounge/deploy/lock-to-cloudflare.sh
```

The script allows ports 80/443 **only** from Cloudflare's IP ranges, leaves SSH
(port 22) open so you keep access, and persists the rules across reboots.

> ⚠️ Run this **only after** Cloudflare is active and the site loads through it.
> If you run it first you will lock yourself out of your own website.
>
> To undo: `sudo bash /opt/sutra-lounge/deploy/lock-to-cloudflare.sh --undo`

---

## Step 5 — Recommended free security settings

In the Cloudflare dashboard:

| Setting | Where | Value |
|---|---|---|
| Security Level | Security → Settings | **Medium** |
| Bot Fight Mode | Security → Bots | **On** |
| Browser Integrity Check | Security → Settings | **On** |
| Always Online | Caching → Configuration | **On** |
| Caching Level | Caching → Configuration | **Standard** |
| Brotli | Speed → Optimization | **On** |

### Protect the admin panel with a WAF rule

**Security → WAF → Custom rules → Create rule** (free plan allows 5):

- **Name:** `Protect admin`
- **Field:** URI Path — **Operator:** starts with — **Value:** `/admin`
- **Action:** *Managed Challenge*

This makes automated attacks against the login page far harder while still
letting you in with one click. If your team only logs in from Nepal, you can
tighten it further with `AND Country does not equal Nepal → Block`.

---

## Step 6 — Verify it all works

From your own computer:

```bash
# Should return Cloudflare IPs, NOT your Oracle IP
dig +short yourdomain.com

# Should include "server: cloudflare"
curl -sI https://yourdomain.com | grep -i server

# Should be a valid HTTPS response
curl -sI https://yourdomain.com | head -1
```

Then in a browser confirm:
- `https://yourdomain.com` loads with a padlock 🔒
- `http://yourdomain.com` redirects to HTTPS
- `https://yourdomain.com/admin` — you can still log in
- Upload an image in the admin panel and confirm it appears on the site

On the server, confirm real IPs are being logged (should show visitor IPs, not
`172.x` Cloudflare addresses):

```bash
sudo tail -f /var/log/nginx/access.log
```

---

## Caching note

The app sets `Cache-Control: no-store` on `/admin` and
`public, no-cache, must-revalidate` on public pages, so Cloudflare will:

- **cache** static assets (`/css`, `/js`, `/img`, `/uploads`) at the edge
- **revalidate** HTML pages, so admin edits appear immediately
- **never cache** admin pages

No extra configuration needed — the existing headers already do the right thing.
If you ever need to force-clear the edge cache: **Caching → Configuration →
Purge Everything**.
