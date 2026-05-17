# nqx-mpq — reusable Medusa v2 webshop template

A self-contained, Dockerised e-commerce stack (Medusa v2 + Next.js storefront +
Postgres + Redis + MinIO + Adminer). Built so you can **clone the folder and
re-brand it for a new product line by editing two files** — no code changes.

## Reuse it for a new shop (the "WordPress-like" workflow)

1. `cp -r nqx-mpq ../my-new-shop`
2. Edit **`shop.config.json`** → brand name, title, tagline, colours, fonts, currency, feature flags.
3. Edit **`.env`** → ports (so it can run alongside other shops), secrets, Stripe keys.
4. Replace **`brand/logo.png`** and **`brand/favicon.ico`**.
5. Put the new product data through `migration/` (or add via the admin).
6. `docker compose up -d`.

Everything reads from `shop.config.json` + `.env`. The storefront theme (colours,
fonts, uppercase headings) is derived from `shop.config.json` at build/runtime.

## Services & ports (all configurable in `.env`)

| Service        | URL (default)            | Purpose                          |
|----------------|--------------------------|----------------------------------|
| Storefront     | http://localhost:8800    | Public shop (Next.js)            |
| Admin          | http://localhost:9000/app| Medusa admin panel               |
| Backend API    | http://localhost:9000    | Medusa REST/store API            |
| Adminer        | http://localhost:8085    | Postgres DB browser (UI)         |
| MinIO console  | http://localhost:9011    | Image storage browser            |
| Postgres       | localhost:5436           | Database                         |
| Redis          | localhost:6381           | Events / workflows               |

All infra URLs + credentials are also surfaced inside the admin panel under
**Settings → Infrastructure**, so you never have to dig through `.env`.

## Showcase mode

`shop.config.json → features.showcaseMode` (default **true**).

- **true** — public catalogue only: visitors browse the owner's stock, but
  prices, wishlist, cart and checkout are hidden. (Current desired state.)
- **false** — full webshop with cart, Stripe checkout, orders.

Toggle it at runtime from **Admin → Shop Settings** (no redeploy).

## First run

```bash
cp .env.example .env          # then edit secrets/ports (a populated .env is already generated)
docker compose up -d --build
# Import the old catalogue + mirror images to MinIO (resumable):
docker compose exec backend sh -c 'cd /app/.medusa/server && npx medusa exec ./src/scripts/import-products.js'
# (or set RUN_DATA_MIGRATION=true in .env before first boot to run it automatically)
```

See `docs/` for migration details and architecture notes.
