FROM node:20-bookworm-slim

WORKDIR /app

# Build deps for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm config set fetch-retries 6 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 180000 \
  && npm config set fetch-timeout 600000 \
  && npm config set maxsockets 3
RUN n=0; until npm install --legacy-peer-deps --no-audit --no-fund; do \
      n=$((n+1)); [ "$n" -ge 6 ] && echo "npm install failed" && exit 1; \
      echo "npm install retry $n"; sleep 20; \
    done

COPY . .
RUN chmod +x /app/docker-entrypoint.sh

# Bundle admin + server. Output goes to /app/.medusa/server (its own
# package.json) which is what Medusa v2 runs in production.
RUN npm run build

# Install production deps for the built server (Medusa v2 requirement).
WORKDIR /app/.medusa/server
RUN cp /app/docker-entrypoint.sh ./docker-entrypoint.sh \
  && chmod +x ./docker-entrypoint.sh
RUN n=0; until npm install --legacy-peer-deps --omit=dev --no-audit --no-fund; do \
      n=$((n+1)); [ "$n" -ge 6 ] && echo "npm install failed" && exit 1; \
      echo "npm install retry $n"; sleep 20; \
    done

WORKDIR /app/.medusa/server

EXPOSE 9000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
