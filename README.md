# nqx-mpq — MiniParfumQueen webshop

A self-contained, Dockerised e-commerce stack: **Medusa v2** backend + **Next.js**
storefront + **PostgreSQL** + **Redis** + **MinIO** + **Adminer**.
Migrated from the old MERN `mpq-mern` app and built so you can **clone the
folder and re-brand it by editing two files** (`shop.config.json` + `.env`).

---

## 1. Quick start

```bash
cd /home/nqx/apps/nqx-mpq
cp .env.example .env          # a populated .env is already generated for you
docker compose up -d --build  # first build ~10-15 min
```

First boot automatically: runs DB migrations → creates the admin user →
bootstraps store/region/currency/shipping → generates the storefront build.

**Import the old catalogue** (5 700 products + 10 600 images → MinIO, resumable):

```bash
docker compose exec backend sh -c 'cd /app/.medusa/server && npx medusa exec ./src/scripts/import-products.js'
```

(or set `RUN_DATA_MIGRATION=true` in `.env` before the first `up`).

Check everything is healthy:

```bash
docker compose ps          # all 6 services Up; postgres/minio "healthy"
```

---

## 2. URLs & ports

| Service | URL | Purpose |
|---|---|---|
| **Storefront** | http://localhost:8800 | The public shop |
| **Admin panel** | http://localhost:9000/app | Medusa admin (manage products/orders/settings) |
| **Backend API** | http://localhost:9000 | Medusa Store/Admin REST API |
| **Adminer** (DB UI) | http://localhost:8085 | Browse/query Postgres in the browser |
| **MinIO console** | http://localhost:9011 | Browse uploaded product images |
| Postgres | localhost:5436 | Database (also via Adminer) |
| Redis | localhost:6383 | Events / cache / workflows |
| MinIO API/S3 | localhost:9010 | Object storage endpoint |

All ports are defined in **`.env`** — change them there, then
`docker compose up -d --force-recreate`.

> Inside the admin, **Settings → Infrastructure** lists every service URL **and
> its live credentials**, so you never have to dig through files.

---

## 3. Credentials

### Admin panel login
```
URL:      http://localhost:9000/app
Email:    admin@mpq.local
Password: AdminMPQ123!
```
(Change via `MEDUSA_ADMIN_EMAIL` / `MEDUSA_ADMIN_PASSWORD` in `.env`, or in the
admin UI after first login.)

### Database / MinIO / secrets
The generated DB & MinIO passwords are **not** stored in this committed README
(this repo is on GitHub). They live in:

- **`.env`** (git-ignored) — the source of truth
- **`CREDENTIALS.local.md`** (git-ignored) — a plain readable copy for testing
- **Admin → Settings → Infrastructure** — shown live in the UI

Defaults: Postgres user `mpq` / db `mpq` (port 5436) · MinIO user `mpqminio` /
bucket `mpq-media`.

---

## 4. Showcase mode (important)

`shop.config.json → features.showcaseMode` (default **true**).

- **true** — public **catalogue only**: visitors browse the full stock, but
  prices, wishlist, cart and checkout are hidden. (Current intended state.)
- **false** — full webshop with cart + Stripe checkout + orders.

Toggle it **live** (no redeploy) at **Admin → Shop Settings**, or per-flag
(`showcaseHidePrice`, `showcaseHideCart`). Cart/checkout are also blocked
server-side by middleware while showcase is on.

---

## 5. Payments

Stripe is wired but **off until you add keys**. Until then Medusa's manual/
test provider is used so checkout still works end-to-end.

To enable Stripe: put `STRIPE_API_KEY` and `STRIPE_WEBHOOK_SECRET` in `.env`,
then `docker compose up -d --force-recreate backend`.

---

## 6. Re-brand for a new product line ("WordPress-like")

1. `cp -r nqx-mpq ../my-new-shop`
2. Edit **`shop.config.json`** — name, title, tagline, colours, fonts,
   hero/section copy, feature flags.
3. Edit **`.env`** — ports (so it runs alongside this one), secrets, Stripe keys.
4. Replace the SVGs in **`storefront/public/brand/`** (hero, logo, banner,
   divider, texture).
5. Put the new catalogue through `migration/` or add products in the admin.
6. `docker compose up -d --build`.

No code changes needed — everything reads from those two files.

---

## 7. Common commands

```bash
# Status / logs
docker compose ps
docker compose logs -f storefront        # or backend / postgres / minio

# Restart one service (after editing .env)
docker compose up -d --force-recreate backend

# IMPORTANT: after editing shop.config.json, restart the backend
# (it caches the config in-process):
docker compose restart backend

# Re-run the catalogue/image import (resumable, safe to repeat)
docker compose exec backend sh -c 'cd /app/.medusa/server && npx medusa exec ./src/scripts/import-products.js'

# Apply storefront/backend SOURCE changes (Dockerfiles COPY source in):
docker compose build storefront && docker compose up -d --force-recreate storefront

# Stop / start everything
docker compose down            # keeps data volumes
docker compose up -d
```

> A plain restart of the storefront does **not** pick up source edits — its
> image bakes the source via `COPY . .`, so you must `docker compose build`.

---

## 8. Testing checklist

- [ ] `docker compose ps` → all 6 Up, postgres & minio **healthy**
- [ ] Storefront http://localhost:8800 → hero + product grid, images load
- [ ] Product/category pages open; images crisp
- [ ] Showcase ON: no prices, no add-to-cart; `/cart` redirects away
- [ ] Admin http://localhost:9000/app → log in (creds above)
- [ ] Admin → Shop Settings → toggle showcase OFF → prices/cart appear within ~20 s
- [ ] Admin → Infrastructure → all service links + creds shown
- [ ] Adminer http://localhost:8085 → connect (System PostgreSQL, Server
      `postgres`, creds from `CREDENTIALS.local.md`) → see `product` rows
- [ ] MinIO console http://localhost:9011 → bucket `mpq-media` has images

---

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| Storefront 502 / "building" | First boot builds Next at container start (~1 min). `docker compose logs -f storefront` until `✓ Ready`. |
| Product images blank | They're served via the `/media` proxy → MinIO. Check `minio` is healthy and the import ran. |
| Brand/config change not showing | `docker compose restart backend` (config is cached); storefront has a ~20 s cache. |
| Source edit not applied | `docker compose build <svc>` then `--force-recreate` (not a plain restart). |
| Port already in use | Edit the port in `.env`, `docker compose up -d --force-recreate`. |
| Admin login fails | Confirm `MEDUSA_ADMIN_*` in `.env`; re-run `docker compose up -d --force-recreate backend`. |

---

## 10. Architecture

```
Storefront (Next.js 15)  ──>  Backend (Medusa v2)  ──>  Postgres
   :8800                        :9000 (+ /app admin)      :5436
     │                            │  │
     │ /media/* proxy             │  └── Redis :6383 (events/cache/workflows)
     └────────────────────────────┴───> MinIO :9010/:9011 (product images)
                                  Adminer :8085 (DB browser)
```

- Branding/theme/flags: **`shop.config.json`**
- Ports/secrets: **`.env`**
- Old source kept at `../_mpq-mern-source`; Mongo export in `migration/data/`
  (git-ignored).
