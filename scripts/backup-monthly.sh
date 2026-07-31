#!/usr/bin/env bash
# Monthly backup: full disaster-recovery snapshot of the running app.
# The source CODE lives in git — this captures what git does NOT:
#   built docker images, ALL data volumes, .env + local credentials, shop.config.
# Run from cron, e.g. 1st of the month 04:00:
#   0 4 1 * * /home/nqx/apps/nqx-mpq/scripts/backup-monthly.sh >> /home/nqx/apps/nqx-mpq/backups/monthly.log 2>&1
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

DEST="${BACKUP_DEST_MONTHLY:-/mnt/backup-mpq/monthly}"
KEEP="${KEEP_MONTHLY:-6}"         # keep last 6 months
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="$DEST/$STAMP"

if [ ! -d "$DEST" ] && ! mkdir -p "$DEST" 2>/dev/null; then
  echo "ERROR: backup destination $DEST not available — is the external drive mounted?" >&2
  exit 1
fi
mkdir -p "$OUT"

echo "[$(date)] Monthly snapshot → $OUT"

# 1) Built docker images (so you can restore even if a base image vanishes/changes)
echo "  • Exporting docker images…"
IMAGES=$(docker compose config --images 2>/dev/null | sort -u || true)
if [ -n "$IMAGES" ]; then
  # shellcheck disable=SC2086
  docker save $IMAGES | gzip > "$OUT/images_${STAMP}.tar.gz"
fi

# 2) ALL named volumes (pg, minio, redis, shared, next build)
echo "  • Archiving data volumes…"
for V in pgdata miniodata redisdata shared storefront_next; do
  VOL="nqx-mpq_${V}"
  docker volume inspect "$VOL" >/dev/null 2>&1 || continue
  docker run --rm -v "$VOL":/data:ro -v "$OUT":/backup \
    alpine sh -c "tar czf /backup/vol_${V}_${STAMP}.tar.gz -C /data ."
done

# 3) Config + secrets that are git-ignored (so the snapshot is self-sufficient)
echo "  • Config & secrets…"
tar czf "$OUT/config_${STAMP}.tar.gz" \
  --ignore-failed-read \
  .env CREDENTIALS.local.md shop.config.json docker-compose.yml deploy 2>/dev/null || true

# 4) Record exact git commit the snapshot corresponds to
git rev-parse HEAD > "$OUT/GIT_COMMIT.txt" 2>/dev/null || true

# 5) Checksums + manifest, then rotate
( cd "$OUT" && sha256sum ./* > SHA256SUMS )
echo "$STAMP  full-snapshot  $(du -sh "$OUT" | cut -f1)" >> "$DEST/manifest.txt"
ls -1dt "$DEST"/*/ 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -rf

echo "[$(date)] Monthly snapshot done ($(du -sh "$OUT" | cut -f1))"
