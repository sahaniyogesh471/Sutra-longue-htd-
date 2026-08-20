#!/usr/bin/env bash
# Restore real visitor IPs behind the Cloudflare proxy.
#
# Without this nginx sees a Cloudflare IP for every request, which breaks the
# admin login rate limiter (all visitors share one apparent IP) and makes access
# logs useless.
#
#   sudo bash /opt/sutra-lounge/deploy/cloudflare-realip.sh
#
# Re-run occasionally; Cloudflare's ranges change.
set -euo pipefail

CONF=/etc/nginx/conf.d/cloudflare-realip.conf

if [[ $EUID -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

echo "==> Fetching Cloudflare IP ranges"
V4="$(curl -fsS --max-time 20 https://www.cloudflare.com/ips-v4)"
V6="$(curl -fsS --max-time 20 https://www.cloudflare.com/ips-v6)"

if [[ -z "$V4" ]]; then
  echo "Could not fetch Cloudflare IPv4 ranges. Aborting (existing config left intact)." >&2
  exit 1
fi

TMP="$(mktemp)"
{
  echo "# Managed by deploy/cloudflare-realip.sh — regenerated $(date -u +%FT%TZ)"
  echo "# Cloudflare IP ranges: https://www.cloudflare.com/ips/"
  while read -r cidr; do [[ -n "$cidr" ]] && echo "set_real_ip_from $cidr;"; done <<< "$V4"
  while read -r cidr; do [[ -n "$cidr" ]] && echo "set_real_ip_from $cidr;"; done <<< "$V6"
  echo
  echo "real_ip_header CF-Connecting-IP;"
  echo "real_ip_recursive on;"
} > "$TMP"

# Keep a backup so a bad fetch can be rolled back.
[[ -f "$CONF" ]] && cp "$CONF" "$CONF.bak"
mv "$TMP" "$CONF"
chmod 644 "$CONF"

echo "==> Testing nginx configuration"
if nginx -t; then
  systemctl reload nginx
  COUNT="$(grep -c set_real_ip_from "$CONF")"
  echo "==> Done — $COUNT Cloudflare ranges trusted, nginx reloaded."
  echo "    Verify with: sudo tail -f /var/log/nginx/access.log"
else
  echo "!! nginx config test FAILED — rolling back" >&2
  if [[ -f "$CONF.bak" ]]; then mv "$CONF.bak" "$CONF"; else rm -f "$CONF"; fi
  nginx -t && systemctl reload nginx
  exit 1
fi
