# Launch Checklist — tick as you go

Print or keep this open. Full detail in `LAUNCH_PLAN.md`.

---

## 🔑 Credentials to save (fill in as you get them)

> Keep this section private. Do **not** commit real values to Git.

```
Oracle account email : ______________________
Server public IP     : ______________________
SSH key file path    : ______________________
Admin username       : admin
Admin password       : ______________________  (printed once by setup script)
Recovery code        : ____                    (4 digits, PERMANENT)
Domain               : ______________________
Cloudflare email     : ______________________
```

---

## Phase 0 — Prepare
- [ ] Domain decided (or: launching on IP first)
- [ ] Domain purchased
- [ ] Real customer reviews collected (to replace 4 demo ones)
- [ ] Real food photos ready
- [x] Contact details verified — `057-522111`, Hupra Hetauda-4, Makwanpur

## Phase 1 — Oracle server *(→ ORACLE_CLOUD_GUIDE.md)*
- [ ] Oracle Cloud account created, home region **Mumbai**
- [ ] VM created — Ubuntu 24.04, ARM, **2 OCPU / 12 GB**
- [ ] SSH private key downloaded and saved safely
- [ ] Ingress rules added for ports **80** and **443** (Source Port Range empty!)
- [ ] SSH connection works (`ssh -i key ubuntu@IP`)
- [ ] Setup script run successfully
- [ ] **Admin password + recovery code copied down**
- [ ] `http://YOUR_IP` loads the homepage
- [ ] `/menu.html` loads
- [ ] Admin login works
- [ ] 🎉 **SITE IS LIVE**

## Phase 2 — Domain + HTTPS
- [ ] A record `@` → server IP
- [ ] A record `www` → server IP
- [ ] DNS resolving (`dig +short yourdomain.com`)
- [ ] Domain set in `/etc/nginx/sites-available/sutra-lounge`
- [ ] `sudo nginx -t && sudo systemctl reload nginx`
- [ ] `sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com`
- [ ] HTTPS padlock shows in browser
- [ ] `SESSION_SECURE=true` set, service restarted
- [ ] Admin login still works over HTTPS

## Phase 3 — Cloudflare *(→ CLOUDFLARE_SETUP.md)*
- [ ] Site added to Cloudflare (Free plan)
- [ ] Nameservers switched at registrar
- [ ] Cloudflare shows the zone as **Active**
- [ ] Both A records **Proxied** (orange cloud)
- [ ] SSL/TLS mode = **Full (Strict)**
- [ ] Always Use HTTPS enabled
- [ ] Automatic HTTPS Rewrites enabled
- [ ] `sudo bash deploy/cloudflare-realip.sh`
- [ ] Real visitor IPs appear in `/var/log/nginx/access.log`
- [ ] Site verified working through Cloudflare
- [ ] `sudo bash deploy/lock-to-cloudflare.sh` ⚠️ *only after the line above*
- [ ] Security Level = Medium, Bot Fight Mode = On
- [ ] WAF rule: `/admin` → Managed Challenge
- [ ] `dig +short yourdomain.com` shows Cloudflare IPs, **not** your server

## Phase 4 — Harden & maintain
- [ ] Daily backup cron added
- [ ] Test backup run, archive exists in `/opt/sutra-backups/`
- [ ] `unattended-upgrades` installed
- [ ] Oracle budget alert set at $1
- [ ] One backup downloaded to your own computer

## Phase 5 — Content & SEO
- [ ] ⚠️ **4 demo reviews deleted or replaced with real ones**
- [ ] Real food photos uploaded
- [ ] Menu items and prices verified
- [ ] Opening hours verified
- [ ] Google Search Console verified
- [ ] Sitemap submitted (`/sitemap.xml`)
- [ ] Google Business Profile created/claimed
- [ ] `docs/PRODUCTION_LAUNCH_CHECKLIST.md` reviewed

---

## Final smoke test
- [ ] Homepage loads with padlock 🔒
- [ ] Menu page works
- [ ] Nepali ↔ English switch works
- [ ] Admin login works
- [ ] Upload an image → restart service → image still there
- [ ] Tested on a mobile phone
- [ ] `https://yourdomain.com/api/health` returns `{"ok":true}`
