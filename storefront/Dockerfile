FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
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

# Build args -> available to next build (publishable key is injected at runtime)
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL
ARG NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL

# NOTE: `next build` runs in the entrypoint (not here) because the Medusa
# starter collects page data from the backend, which isn't reachable during
# image build. The entrypoint waits for the backend, then builds once.

EXPOSE 8000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
