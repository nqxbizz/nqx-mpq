#!/bin/sh
set -e

BACKEND="${MEDUSA_BACKEND_URL:-http://backend:9000}"

# The backend writes the publishable key to the shared volume once it has
# migrated + bootstrapped. Waiting for it also guarantees the backend API is
# reachable, which `next build` needs to collect page data.
echo "▶ Waiting for backend publishable key…"
i=0
while [ ! -s /shared/publishable_key.txt ]; do
  i=$((i + 1))
  if [ "$i" -ge 120 ]; then
    echo "  key not found after 10 min — continuing anyway"
    break
  fi
  sleep 5
done

if [ -s /shared/publishable_key.txt ]; then
  export NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="$(cat /shared/publishable_key.txt)"
  echo "▶ Publishable key loaded."
fi

# Wait until the backend store API actually answers.
echo "▶ Waiting for backend API at ${BACKEND}…"
j=0
until curl -sf -o /dev/null "${BACKEND}/health" 2>/dev/null; do
  j=$((j + 1))
  [ "$j" -ge 120 ] && echo "  backend health not OK — continuing" && break
  sleep 5
done

# Build once (persisted on the named volume across restarts). Delete .next to
# force a rebuild after code changes.
if [ ! -f /app/.next/BUILD_ID ]; then
  echo "▶ Building storefront (first run)…"
  npm run build
else
  echo "▶ Reusing existing build."
fi

echo "▶ Starting storefront…"
exec npm run start
