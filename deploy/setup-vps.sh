#!/usr/bin/env bash
# Sutra Lounge — one-shot server setup (Ubuntu 22.04 / 24.04).
# Tested on Oracle Cloud Always Free, but works on any Ubuntu VPS.
#
# Run as root on a fresh server:
#   sudo bash setup-vps.sh https://github.com/USER/REPO.git [branch]
set -euo pipefail

REPO_URL="${1:-}"
BRANCH="${2:-main}"
APP_DIR=/opt/sutra-lounge
APP_USER=sutra

if [[ -z "$REPO_URL" ]]; then
  echo "Usage: sudo bash setup-vps.sh <git-repo-url> [branch]" >&2
  exit 1
fi
if [[ $EUID -ne 0 ]]; then
  echo "This script must run as root (use sudo)." >&2
  exit 1
fi

echo "==> Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y curl git nginx ca-certificates build-essential python3 \
                   sqlite3 iptables-persistent certbot python3-certbot-nginx

if ! command -v node >/dev/null 2>&1; then
  echo "==> Installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo "    node $(node -v)"

echo "==> Creating service user"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"

echo "==> Fetching application"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch --all --prune
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only
else
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
echo "==> Installing dependencies and building"
npm ci
npm run build
mkdir -p "$APP_DIR/data/uploads"

if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "==> Generating .env with fresh secrets"
  ADMIN_PW="$(openssl rand -base64 18)"
  RECOVERY="$(shuf -i 1000-9999 -n 1)"
  cat > "$APP_DIR/.env" <<EOF
NODE_ENV=production
PORT=4173
SUTRA_DB_PATH=$APP_DIR/data/sutra.db
SESSION_SECRET=$(openssl rand -hex 32)
SESSION_SECURE=false
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$ADMIN_PW
ADMIN_RECOVERY_CODE=$RECOVERY
EOF
  chmod 600 "$APP_DIR/.env"
  CREDS_SHOWN=1
fi

chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

echo "==> Installing systemd service"
cp "$APP_DIR/deploy/sutra-lounge.service" /etc/systemd/system/sutra-lounge.service
systemctl daemon-reload
systemctl enable sutra-lounge
systemctl restart sutra-lounge

echo "==> Configuring nginx"
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/sutra-lounge
ln -sf /etc/nginx/sites-available/sutra-lounge /etc/nginx/sites-enabled/sutra-lounge
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ---------------------------------------------------------------------------
# Firewall.
#
# Oracle Cloud's Ubuntu images ship a preloaded iptables ruleset whose INPUT
# chain ends in a REJECT. Ports 80/443 stay closed even after you add an
# ingress rule in the VCN security list. UFW conflicts with that ruleset, so we
# edit iptables directly and persist it — the approach Oracle's own known-issues
# doc recommends.
# ---------------------------------------------------------------------------
echo "==> Opening ports 80/443 in the host firewall"
for PORT in 80 443; do
  if ! iptables -C INPUT -p tcp -m state --state NEW --dport "$PORT" -j ACCEPT 2>/dev/null; then
    # Insert ABOVE the trailing REJECT rule rather than appending after it.
    iptables -I INPUT 1 -p tcp -m state --state NEW --dport "$PORT" -j ACCEPT
    echo "    opened tcp/$PORT"
  else
    echo "    tcp/$PORT already open"
  fi
done

if command -v netfilter-persistent >/dev/null 2>&1; then
  netfilter-persistent save
else
  mkdir -p /etc/iptables && iptables-save > /etc/iptables/rules.v4
fi
echo "    firewall rules persisted across reboots"

# UFW, if present and active, would override the rules above.
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  echo "    WARNING: ufw is active and may block traffic on Oracle Cloud."
  echo "             Consider: sudo ufw disable"
fi

echo
echo "==> Verifying"
sleep 3
if curl -fsS --max-time 10 http://127.0.0.1:4173/api/health >/dev/null 2>&1; then
  echo "    app health check: OK"
else
  echo "    app health check: FAILED — run: journalctl -u sutra-lounge -n 50"
fi
if curl -fsS --max-time 10 -o /dev/null http://127.0.0.1/ 2>/dev/null; then
  echo "    nginx proxy: OK"
else
  echo "    nginx proxy: FAILED — run: nginx -t && systemctl status nginx"
fi

PUBLIC_IP="$(curl -fsS --max-time 10 https://api.ipify.org 2>/dev/null || echo '<server-ip>')"

echo
if [[ "${CREDS_SHOWN:-0}" == "1" ]]; then
  echo "############################################################"
  echo "  ADMIN LOGIN"
  echo "    URL:      http://$PUBLIC_IP/admin"
  echo "    username: admin"
  echo "    password: $ADMIN_PW"
  echo "    recovery code (PERMANENT, 4 digits): $RECOVERY"
  echo
  echo "  SAVE THESE NOW — shown once. Stored only in $APP_DIR/.env"
  echo "############################################################"
  echo
fi

cat <<NEXT
Your site is live at:  http://$PUBLIC_IP

Next steps when you have a domain:
  1. Point the domain's A record at $PUBLIC_IP
  2. sudo nano /etc/nginx/sites-available/sutra-lounge   # replace example.com
  3. sudo systemctl reload nginx
  4. sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
  5. Switch cookies to HTTPS-only:
       sudo sed -i 's/^SESSION_SECURE=false/SESSION_SECURE=true/' $APP_DIR/.env
       sudo systemctl restart sutra-lounge

Handy commands:
  systemctl status sutra-lounge      # is it running?
  journalctl -u sutra-lounge -f      # live logs
  bash $APP_DIR/deploy/update.sh     # deploy latest code
NEXT
