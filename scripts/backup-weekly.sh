#!/usr/bin/env bash
# Weekly backup: Postgres DB + MinIO images → external drive.
# Run from cron, e.g. Sundays 03:00:
#   0 3 * * 0 /home/nqx/apps/nqx-mpq/scripts/backup-weekly.sh >> /home/nqx/apps/nqx-mpq/backups/weekly.log 2>&1
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

# Where to write backups. Point this at the mounted external drive.
DEST="${BACKUP_DEST:-/mnt/backup-mpq/weekly}"
KEEP="${KEEP_WEEKLY:-8}"          # keep last 8 weekly sets (~2 months)
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="$DEST/$STAMP"

# Load DB/MinIO names from .env
set -a; [ -f .env ] && . ./.env; set +a

# Abort early if the drive isn't mounted (avoid filling the system disk)
if [ ! -d "$DEST" ] && ! mkdir -p "$DEST" 2>/dev/null; then
  echo "ERROR: backup destination $DEST not available — is the external drive mounted?" >&2
  exit 1
fi
mkdir -p "$OUT"

echo "[$(date)] Weekly backup → $OUT"

# 1) Postgres logical dump (restorable with: gunzip -c db.sql.gz | docker compose exec -T postgres psql -U $POSTGRES_USER $POSTGRES_DB)
echo "  • Postgres dump…"
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$OUT/db_${POSTGRES_DB}_${STAMP}.sql.gz"

# 2) MinIO images — tar the whole data volume (complete, restorable as-is)
echo "  • MinIO images (volume tar)…"
docker run --rm \
  -v nqx-mpq_miniodata:/data:ro \
  -v "$OUT":/backup \
  alpine sh -c "tar czf /backup/minio_${STAMP}.tar.gz -C /data ."

# 3) Checksums + manifest
( cd "$OUT" && sha256sum ./* > SHA256SUMS )
echo "$STAMP  db+minio  $(du -sh "$OUT" | cut -f1)" >> "$DEST/manifest.txt"

# 4) Rotate: keep only the newest $KEEP sets
ls -1dt "$DEST"/*/ 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -rf

echo "[$(date)] Weekly backup done ($(du -sh "$OUT" | cut -f1))"
