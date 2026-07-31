#!/usr/bin/env bash
# ============================================================================
# Restore the MPQ parfum webshop (code + Postgres + MinIO images + Redis)
# from an nqx-backup_* folder onto a fresh machine.
#
# Usage:
#   bash restore-mpq.sh [BACKUP_DIR] [TARGET_APP_DIR]
#
#   BACKUP_DIR      folder containing apps/ db/ volumes/  (default: this
#                   script's own directory — so it works straight off the
#                   external drive)
#   TARGET_APP_DIR  where the code is extracted/expected
#                   (default: /home/nqx/apps/nqx-mpq)
#
#   FORCE=1 bash restore-mpq.sh ...   # skip the confirmation prompt
#
# Restores faithfully from the raw Docker volume archives (same docker images,
# x86 -> x86). For a portable Postgres restore from the logical dump instead,
# see RESTORE_INSTRUCTIONS.md.
# ============================================================================
set -euo pipefail

BACKUP_DIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
TARGET="${2:-/home/nqx/apps/nqx-mpq}"
FORCE="${FORCE:-0}"
PROJECT="nqx-mpq"                         # = compose project name = volume prefix
VOLS=(miniodata pgdata redisdata shared)  # storefront_next omitted (Next.js rebuilds it)

log(){ printf '\033[1;36m[restore]\033[0m %s\n' "$*"; }
die(){ printf '\033[1;31m[restore] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null            || die "docker is not installed"
docker compose version >/dev/null 2>&1  || die "docker compose v2 is required"

APP_TAR="$BACKUP_DIR/apps/nqx-mpq.tar.gz"
[ -f "$APP_TAR" ] || die "missing $APP_TAR — is BACKUP_DIR correct?"

log "Backup source : $BACKUP_DIR"
log "Target app dir: $TARGET"
log "Volumes       : ${VOLS[*]}"
echo

if [ "$FORCE" != "1" ]; then
  read -rp "This (re)creates the nqx-mpq stack and OVERWRITES its docker volumes. Continue? [y/N] " a
  [ "$a" = "y" ] || [ "$a" = "Y" ] || die "aborted by user"
fi

# 1) Restore code (only if target is empty — never clobber existing code)
if [ -d "$TARGET" ] && [ -n "$(ls -A "$TARGET" 2>/dev/null)" ]; then
  log "Target dir exists & non-empty — keeping existing code (not overwriting)."
else
  log "Extracting code -> $TARGET"
  mkdir -p "$(dirname "$TARGET")"
  tar xzf "$APP_TAR" -C "$(dirname "$TARGET")"
fi
[ -f "$TARGET/.env" ] || log "WARN: no .env found in code — create one (see .env.example) before bringing the stack up."

# 2) Tear down any existing stack (keep images & rebuildable volume)
cd "$TARGET"
log "Stopping any existing nqx-mpq stack…"
docker compose down --remove-orphans 2>/dev/null || true

# 3) Restore each data volume from its tarball
for v in "${VOLS[@]}"; do
  arc="$BACKUP_DIR/volumes/${PROJECT}_${v}.tar.gz"
  vol="${PROJECT}_${v}"
  if [ ! -f "$arc" ]; then log "skip $vol (no archive found)"; continue; fi
  log "Restoring volume $vol …"
  docker volume rm "$vol" >/dev/null 2>&1 || true
  docker volume create "$vol" >/dev/null
  docker run --rm -v "$vol":/data -v "$BACKUP_DIR/volumes":/backup:ro alpine \
    sh -c "cd /data && tar xzf /backup/${vol}.tar.gz"
  log "  -> $(docker run --rm -v "$vol":/data:ro alpine du -sh /data | cut -f1) restored"
done

# 4) Build & start the full stack
log "Building & starting stack (first run pulls/builds images — a few minutes)…"
docker compose up -d --build

echo
log "Stack status:"
docker compose ps
echo
log "Done. Now verify, then edit .env public URLs + start the Cloudflare tunnel."
log "See RESTORE_INSTRUCTIONS.md (section 5) for post-restore steps."
