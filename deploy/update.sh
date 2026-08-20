#!/usr/bin/env bash
# Deploy the latest code to a running Sutra Lounge server.
#   sudo bash /opt/sutra-lounge/deploy/update.sh
set -euo pipefail

APP_DIR=/opt/sutra-lounge
APP_USER=sutra

if [[ $EUID -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

cd "$APP_DIR"

echo "==> Backing up data"
BACKUP="/opt/sutra-backups/$(date +%F-%H%M%S)"
mkdir -p "$BACKUP"
cp -r "$APP_DIR/data" "$BACKUP/" 2>/dev/null || true
cp "$APP_DIR/.env" "$BACKUP/" 2>/dev/null || true
echo "    saved to $BACKUP"

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Rebuilding"
npm ci
npm run build
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

echo "==> Restarting"
systemctl restart sutra-lounge
sleep 3

if curl -fsS --max-time 10 http://127.0.0.1:4173/api/health >/dev/null 2>&1; then
  echo "==> Deployed successfully."
else
  echo "==> HEALTH CHECK FAILED. Recent logs:" >&2
  journalctl -u sutra-lounge -n 30 --no-pager >&2
  echo >&2
  echo "Data backup is at $BACKUP" >&2
  exit 1
fi

# Keep only the 10 most recent backups.
ls -1dt /opt/sutra-backups/*/ 2>/dev/null | tail -n +11 | xargs -r rm -rf
