#!/bin/sh
set -e

# Medusa v2 production runs from the built server directory.
cd /app/.medusa/server

echo "▶ Running database migrations…"
n=0
until npx medusa db:migrate; do
  n=$((n + 1))
  if [ "$n" -ge 12 ]; then
    echo "✖ migrations failed after retries"
    exit 1
  fi
  echo "  …Postgres not ready yet, retrying ($n)"
  sleep 5
done

echo "▶ Ensuring admin user…"
npx medusa user -e "${MEDUSA_ADMIN_EMAIL:-admin@mpq.local}" \
  -p "${MEDUSA_ADMIN_PASSWORD:-AdminMPQ123!}" 2>/dev/null \
  || echo "  admin user already exists (ok)"

echo "▶ Bootstrapping store…"
npx medusa exec ./src/scripts/bootstrap.js \
  || echo "  bootstrap reported a non-fatal issue, continuing"

if [ "${RUN_DATA_MIGRATION}" = "true" ]; then
  echo "▶ Importing catalogue from exported MongoDB data…"
  npx medusa exec ./src/scripts/import-products.js \
    || echo "  import reported issues, continuing"
fi

echo "▶ Starting Medusa…"
exec npm run start
