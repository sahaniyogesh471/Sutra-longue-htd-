#!/usr/bin/env bash
# Allow web traffic ONLY from Cloudflare's network.
#
# Even if someone discovers your origin IP they cannot bypass Cloudflare's WAF
# and DDoS protection.
#
#   sudo bash /opt/sutra-lounge/deploy/lock-to-cloudflare.sh
#   sudo bash /opt/sutra-lounge/deploy/lock-to-cloudflare.sh --undo
#
# WARNING: run this only AFTER Cloudflare is active and your site loads through
# it. Running it first makes your website unreachable.
#
# SSH (port 22) is never touched, so you keep access either way.
set -euo pipefail

UNDO=0
[[ "${1:-}" == "--undo" ]] && UNDO=1

if [[ $EUID -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

CHAIN=CLOUDFLARE_ONLY

persist() {
  if command -v netfilter-persistent >/dev/null 2>&1; then
    netfilter-persistent save >/dev/null
  else
    mkdir -p /etc/iptables && iptables-save > /etc/iptables/rules.v4
  fi
}

if [[ $UNDO -eq 1 ]]; then
  echo "==> Reverting to open web access"
  iptables -D INPUT -p tcp -m multiport --dports 80,443 -j "$CHAIN" 2>/dev/null || true
  iptables -F "$CHAIN" 2>/dev/null || true
  iptables -X "$CHAIN" 2>/dev/null || true
  for PORT in 80 443; do
    iptables -C INPUT -p tcp -m state --state NEW --dport "$PORT" -j ACCEPT 2>/dev/null \
      || iptables -I INPUT 1 -p tcp -m state --state NEW --dport "$PORT" -j ACCEPT
  done
  persist
  echo "==> Done. Ports 80/443 are open to everyone again."
  exit 0
fi

echo "==> Fetching Cloudflare IP ranges"
V4="$(curl -fsS --max-time 20 https://www.cloudflare.com/ips-v4)"
if [[ -z "$V4" ]]; then
  echo "Could not fetch Cloudflare ranges. Aborting — firewall unchanged." >&2
  exit 1
fi

# Safety: make sure the site currently works before locking it down.
if ! curl -fsS --max-time 10 -o /dev/null http://127.0.0.1/ 2>/dev/null; then
  echo "!! The site is not responding locally. Fix that before locking down." >&2
  echo "   Try: systemctl status sutra-lounge nginx" >&2
  exit 1
fi

echo "==> Building $CHAIN chain"
iptables -N "$CHAIN" 2>/dev/null || iptables -F "$CHAIN"

COUNT=0
while read -r cidr; do
  [[ -z "$cidr" ]] && continue
  iptables -A "$CHAIN" -s "$cidr" -j ACCEPT
  COUNT=$((COUNT + 1))
done <<< "$V4"

# Anything not from Cloudflare gets dropped.
iptables -A "$CHAIN" -j DROP

# Remove the previous blanket allow rules for 80/443.
while iptables -C INPUT -p tcp -m state --state NEW --dport 80 -j ACCEPT 2>/dev/null; do
  iptables -D INPUT -p tcp -m state --state NEW --dport 80 -j ACCEPT
done
while iptables -C INPUT -p tcp -m state --state NEW --dport 443 -j ACCEPT 2>/dev/null; do
  iptables -D INPUT -p tcp -m state --state NEW --dport 443 -j ACCEPT
done

# Route web traffic through the Cloudflare-only chain.
iptables -C INPUT -p tcp -m multiport --dports 80,443 -j "$CHAIN" 2>/dev/null \
  || iptables -I INPUT 1 -p tcp -m multiport --dports 80,443 -j "$CHAIN"

persist

echo "==> Locked down: $COUNT Cloudflare ranges allowed on ports 80/443."
echo "    SSH (port 22) is untouched — you still have access."
echo
echo "    Verify your site still loads via your domain."
echo "    Direct IP access should now time out (that is the point)."
echo "    Undo with: sudo bash $0 --undo"
