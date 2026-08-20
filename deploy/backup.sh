#!/usr/bin/env bash
# Back up the Sutra Lounge database and uploaded images.
# Schedule daily at 03:00 with:
#   sudo crontab -e
#   0 3 * * * /bin/bash /opt/sutra-lounge/deploy/backup.sh
set -euo pipefail

APP_DIR=/opt/sutra-lounge
BACKUP_DIR=/opt/sutra-backups
KEEP=14

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%F-%H%M%S)"
ARCHIVE="$BACKUP_DIR/sutra-$STAMP.tar.gz"

# Use SQLite's online backup API so the copy is consistent even while the
# server is writing (a plain cp of a WAL-mode database can be corrupt).
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$APP_DIR/data/sutra.db" ".backup '$TMP/sutra.db'"
else
  node -e "
    const Database = require('$APP_DIR/node_modules/better-sqlite3');
    const db = new Database('$APP_DIR/data/sutra.db', { readonly: true });
    db.backup('$TMP/sutra.db').then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
  "
fi

cp -r "$APP_DIR/data/uploads" "$TMP/uploads"
tar -czf "$ARCHIVE" -C "$TMP" sutra.db uploads

echo "Backup written: $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"

# Retention
ls -1t "$BACKUP_DIR"/sutra-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
