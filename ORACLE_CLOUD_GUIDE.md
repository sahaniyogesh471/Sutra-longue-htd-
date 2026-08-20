# Publishing Sutra Lounge on Oracle Cloud (Always Free)

A complete walkthrough, from signup to a live website. **Total time: ~30–45 minutes**
(most of it waiting on Oracle's signup verification).

**Cost: $0/month, permanently** — as long as you stay inside the Always Free limits
in Step 2.

---

## Before you start

You will need:

- An email address and a phone number
- A **credit or debit card** — Oracle uses it for identity verification only.
  Always Free resources are never charged. Your account starts as a 30-day trial
  with $300 credit; when that expires the account automatically downgrades to
  Always Free rather than billing you.
- Your GitHub repo URL: `https://github.com/sahaniyogesh471/Sutra-longue-htd-.git`

> **Note for Nepal:** Oracle Cloud is available in Nepal. Choose **Singapore
> (ap-singapore-1)** or **Mumbai (ap-mumbai-1)** as your home region — both are
> low-latency from Nepal. Mumbai is usually the fastest. **Your home region
> cannot be changed later**, so pick carefully.

---

## Step 1 — Create the Oracle Cloud account

1. Go to <https://signup.cloud.oracle.com>
2. Fill in country (**Nepal**) and your name/email. Verify the email.
3. Choose your **home region: Mumbai (ap-mumbai-1)** or Singapore. ⚠️ Permanent.
4. Enter address and phone; verify by SMS.
5. Add the card for verification. You may see a temporary ~$1 authorisation hold
   that is refunded.
6. Wait for the "Your account is ready" email (usually a few minutes, sometimes
   a few hours).

---

## Step 2 — Create the server (VM instance)

1. Sign in at <https://cloud.oracle.com>.
2. Menu (☰) → **Compute** → **Instances** → **Create instance**.
3. **Name:** `sutra-lounge`
4. **Image and shape** → *Edit*:
   - **Image:** click *Change image* → **Canonical Ubuntu** → **24.04**
   - **Shape:** click *Change shape* → **Ampere** tab → `VM.Standard.A1.Flex`
   - Set **OCPUs: 2** and **Memory: 12 GB**

   > ⚠️ **Important — limits changed on 18 August 2026.** Oracle halved the ARM
   > Always Free allowance from 4 OCPU / 24 GB to **2 OCPU / 12 GB**. Do not
   > exceed 2 OCPU / 12 GB or you will be billed. 2 OCPU / 12 GB is far more
   > than this website needs.
   >
   > *If ARM capacity is unavailable* ("Out of host capacity" — common in busy
   > regions), instead pick the **AMD** tab → `VM.Standard.E2.1.Micro`
   > (1 GB RAM). It is also Always Free and enough for this site, though builds
   > will be slower. Or just retry the ARM shape at a different time of day.

5. **Networking:** leave the defaults (it creates a VCN). Ensure
   **Assign a public IPv4 address** is *Yes*.
6. **Add SSH keys:** choose **Generate a key pair for me** and click
   **Save private key**. 🔑 **Keep this file safe — you cannot download it again.**
7. **Boot volume:** default (~47 GB) is fine and free.
8. Click **Create**. Wait ~1 minute until the state is **RUNNING**.
9. **Copy the Public IP address** shown on the instance page.

---

## Step 3 — Open ports 80 and 443 in the cloud firewall

Oracle blocks web traffic by default. This is the step most people miss.

1. On your instance page, under *Instance details*, click the **Subnet** link.
2. Click the **Security List** (usually "Default Security List for vcn-…").
3. Click **Add Ingress Rules** and add these two rules:

   | Field | Rule 1 (HTTP) | Rule 2 (HTTPS) |
   |---|---|---|
   | Stateless | unchecked | unchecked |
   | Source Type | CIDR | CIDR |
   | Source CIDR | `0.0.0.0/0` | `0.0.0.0/0` |
   | IP Protocol | TCP | TCP |
   | Source Port Range | *leave blank* | *leave blank* |
   | Destination Port Range | `80` | `443` |

   > ⚠️ **Leave "Source Port Range" empty.** Filling it in is a very common
   > mistake that silently blocks all traffic.

4. Click **Add Ingress Rules**.

There is a *second*, hidden firewall inside the Ubuntu image — the setup script
in Step 5 handles that one for you automatically.

---

## Step 4 — Connect to the server over SSH

Use the private key file you downloaded in Step 2.

**On macOS / Linux:**
```bash
chmod 600 ~/Downloads/ssh-key-*.key
ssh -i ~/Downloads/ssh-key-*.key ubuntu@YOUR_SERVER_IP
```

**On Windows (PowerShell):**
```powershell
ssh -i C:\Users\YOU\Downloads\ssh-key-2026-08-20.key ubuntu@YOUR_SERVER_IP
```

Type `yes` at the authenticity prompt. You should land at
`ubuntu@sutra-lounge:~$`.

<details>
<summary>Troubleshooting SSH</summary>

- **"Permissions 0644 too open"** → run the `chmod 600` command above.
  On Windows: right-click the key → Properties → Security → Advanced → disable
  inheritance → remove all users except your own account.
- **Connection times out** → confirm the instance is RUNNING and that you are
  using the *public* IP, not the private one.
- **"Permission denied (publickey)"** → the username must be `ubuntu` for an
  Ubuntu image (not `root` or `opc`).
</details>

---

## Step 5 — Install and launch the website

Run this single command on the server (one long line):

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/sahaniyogesh471/Sutra-longue-htd-/arena/01a00549-sutra-longue-htd/deploy/setup-vps.sh)" _ https://github.com/sahaniyogesh471/Sutra-longue-htd-.git arena/01a00549-sutra-longue-htd
```

Takes 3–5 minutes. It will:

- install Node.js 22, nginx, certbot and SQLite tools
- clone your repo into `/opt/sutra-lounge` and build it
- generate a strong `SESSION_SECRET`, an admin password and a 4-digit recovery code
- create a locked-down `sutra` service user and a systemd service that
  auto-restarts and survives reboots
- configure nginx as a reverse proxy
- **open ports 80/443 in the internal iptables firewall** (the hidden one) and
  persist it across reboots
- run health checks and print the result

At the end it prints a box like this — **copy it somewhere safe immediately**:

```
############################################################
  ADMIN LOGIN
    URL:      http://123.45.67.89/admin
    username: admin
    password: xY9k...            <- shown ONCE
    recovery code (PERMANENT, 4 digits): 4821
############################################################
```

> The **recovery code cannot ever be changed or recovered** — it is baked in on
> first start. Store it with the password.

---

## Step 6 — Check that it works

Open `http://YOUR_SERVER_IP` in your browser. The Sutra Lounge homepage should load.

Also try:
- `http://YOUR_SERVER_IP/menu.html` — the menu
- `http://YOUR_SERVER_IP/admin` — log in with the credentials above
- `http://YOUR_SERVER_IP/api/health` — should show `{"ok":true,...}`

**Confirm your data is safe** (the whole reason we chose a VM): upload an image
in the admin panel, then run `sudo systemctl restart sutra-lounge` and reload the
page. The image is still there. On Render's free tier it would have been deleted.

<details>
<summary>Site doesn't load?</summary>

Work through these on the server:

```bash
systemctl status sutra-lounge      # is the app running?
journalctl -u sutra-lounge -n 50   # app errors
curl -I http://127.0.0.1:4173/     # does the app answer locally?
curl -I http://127.0.0.1/          # does nginx answer locally?
sudo iptables -L INPUT -n --line-numbers | head -20
```

- **Both `curl`s work locally, but the browser times out** → the VCN ingress
  rule from Step 3 is missing or has a Source Port Range filled in.
- **First curl works, second fails** → `sudo nginx -t` then
  `sudo systemctl restart nginx`.
- **App not running** → read the `journalctl` output.
</details>

---

## Step 7 — Add your domain and HTTPS (when you have one)

The site works on the bare IP, but for a real restaurant you want a domain and
the padlock. Once you own e.g. `sutralounge.com`:

1. **DNS** — at your registrar, create two records pointing at your server IP:

   | Type | Name | Value |
   |---|---|---|
   | A | `@` | `YOUR_SERVER_IP` |
   | A | `www` | `YOUR_SERVER_IP` |

   Wait for propagation (minutes to a few hours). Check with
   `dig +short sutralounge.com`.

2. **Tell nginx the domain:**
   ```bash
   sudo nano /etc/nginx/sites-available/sutra-lounge
   ```
   Replace both occurrences of `example.com` with your domain, save
   (`Ctrl+O`, `Enter`, `Ctrl+X`), then:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. **Get a free TLS certificate** (auto-renews):
   ```bash
   sudo certbot --nginx -d sutralounge.com -d www.sutralounge.com
   ```
   Choose **2: Redirect** so HTTP traffic is forced to HTTPS.

4. **Harden the session cookie** now that HTTPS is live:
   ```bash
   sudo sed -i 's/^SESSION_SECURE=false/SESSION_SECURE=true/' /opt/sutra-lounge/.env
   sudo systemctl restart sutra-lounge
   ```

   > The setup script starts with `SESSION_SECURE=false` deliberately — with it
   > set to `true` over plain HTTP, the browser refuses to store the session
   > cookie and admin login silently fails. Flip it only after HTTPS works.

Your canonical URLs, `robots.txt` and `sitemap.xml` are derived from the request
host, so they start pointing at the real domain automatically.

---

## Step 8 — Turn on automatic backups

Your content lives in SQLite. Take backups.

```bash
sudo crontab -e
```

Add this line (daily at 03:00, keeps 14 days):

```
0 3 * * * /bin/bash /opt/sutra-lounge/deploy/backup.sh
```

Test it once now:

```bash
sudo bash /opt/sutra-lounge/deploy/backup.sh
ls -lh /opt/sutra-backups/
```

Backups use SQLite's online-backup API, so they are consistent even while the
site is being edited. Periodically copy one off the server:

```bash
scp -i your-key.key ubuntu@YOUR_SERVER_IP:/opt/sutra-backups/*.tar.gz ~/Desktop/
```

---

## Step 9 — Put Cloudflare in front (recommended, free)

Once the domain works, add Cloudflare's free plan for a global CDN, managed SSL,
DDoS protection, and — most importantly — to **hide your server's IP** so
attackers cannot reach it directly.

Takes ~15 minutes, costs nothing: **[CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md)**

---

## Day-to-day operations

| Task | Command (on the server) |
|---|---|
| Is it running? | `systemctl status sutra-lounge` |
| Live logs | `journalctl -u sutra-lounge -f` |
| Restart | `sudo systemctl restart sutra-lounge` |
| Deploy new code | `sudo bash /opt/sutra-lounge/deploy/update.sh` |
| Manual backup | `sudo bash /opt/sutra-lounge/deploy/backup.sh` |
| Disk / memory | `df -h` / `free -h` |

`update.sh` backs up your data before pulling, rebuilds, restarts, and rolls the
health check — it aborts loudly if the new version fails to start.

---

## Staying free — the rules

You are billed **nothing** if you stay inside Always Free:

- ✅ **Max 2 ARM OCPUs and 12 GB RAM total** across all instances
  (halved from 4/24 on 18 Aug 2026)
- ✅ Max 200 GB total block storage
- ✅ 10 TB/month outbound transfer (you will not get close)
- ❌ Do **not** create extra instances, load balancers, or databases beyond the
  free allowances

Set a spending guard for peace of mind: **Billing & Cost Management → Budgets →
Create Budget**, set $1 with an alert at 100%. You will be emailed if anything
ever starts costing money.

Also: after your 30-day trial ends, the account downgrades to Always Free
automatically. Any resources exceeding the free limits get reclaimed — which is
why Step 2's sizing matters.

---

## Security notes

The setup already does the important things: the app runs as an unprivileged
`sutra` user under a hardened systemd unit (`ProtectSystem=strict`,
`NoNewPrivileges`), secrets live in a `chmod 600` file, admin pages are
`no-store`, and passwords are hashed.

Worth doing yourself:

```bash
# Keep the OS patched automatically
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

Do **not** enable UFW on Oracle Cloud — it conflicts with the preinstalled
iptables rules and will lock out your website (and possibly your SSH session).
