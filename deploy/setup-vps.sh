#!/usr/bin/env bash
# Sutra Lounge — one-shot VPS setup (Ubuntu 22.04/24.04).
# Run as root on a fresh server:
#   curl -fsSL <raw-url>/deploy/setup-vps.sh | sudo bash -s -- https://github.com/USER/REPO.git
set -euo pipefail

REPO_URL="${1:-}"
APP_DIR=/opt/sutra-lounge
APP_USER=sutra

if [[ -z "$REPO_URL" ]]; then
  echo "Usage: sudo bash setup-vps.sh <git-repo-url>" >&2
  exit 1
fi

echo "==> Installing system packages"
apt-get update
apt-get install -y curl git nginx ufw ca-certificates build-essential python3

if ! command -v node >/dev/null 2>&1; then
  echo "==> Installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "==> Creating service user"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"

echo "==> Fetching application"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
echo "==> Installing dependencies and building"
npm ci
npm run build
npm prune --omit=dev
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
SESSION_SECURE=true
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$ADMIN_PW
ADMIN_RECOVERY_CODE=$RECOVERY
EOF
  chmod 600 "$APP_DIR/.env"
  echo "############################################################"
  echo "  ADMIN LOGIN  ->  username: admin"
  echo "                   password: $ADMIN_PW"
  echo "  RECOVERY CODE (permanent, 4 digits): $RECOVERY"
  echo "  Save this now. It is stored only in $APP_DIR/.env"
  echo "############################################################"
fi

chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

echo "==> Installing systemd service"
cp "$APP_DIR/deploy/sutra-lounge.service" /etc/systemd/system/sutra-lounge.service
systemctl daemon-reload
systemctl enable --now sutra-lounge
systemctl restart sutra-lounge

echo "==> Configuring nginx"
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/sutra-lounge
ln -sf /etc/nginx/sites-available/sutra-lounge /etc/nginx/sites-enabled/sutra-lounge
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> Firewall"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo
echo "Done. Next steps:"
echo "  1. Point your domain's A record at this server's IP."
echo "  2. Edit /etc/nginx/sites-available/sutra-lounge -> replace example.com."
echo "  3. sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com"
echo "  4. Check status: systemctl status sutra-lounge"
