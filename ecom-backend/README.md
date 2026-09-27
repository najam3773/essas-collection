# ecom-backend

API for the Multi-Tenant White-Label E-Commerce Platform.
Express + Prisma + PostgreSQL + Redis.

The frontend lives in a separate repository (`ecom-frontend`) and talks to this
service purely over HTTP.

## Domains

Each tenant has a required `customDomain` (set when onboarding):

- Storefront resolves by Host → `customDomain`
- Tenant admin resolves on `admin.{customDomain}`
- Platform super-admin is only on `PLATFORM_DOMAIN` / `WEB_URL`

`GET /storefront/resolve-host?host=` returns the tenant for middleware.
CORS allows configured `CORS_ORIGINS` plus each tenant store/admin origin dynamically.

## Quick start (Docker)

```bash
cp .env.example .env      # then edit the JWT secrets
npm run docker:up         # postgres + redis + api on :4000
```

## Quick start (local)

```bash
cp .env.example .env
npm install
docker compose up -d postgres redis
npm run prisma:generate
npm run dev               # :4000
```

## Database

The SQL in `db/init/` is applied by Postgres **only when the data volume is
empty** (first run). It is additive — there are no DROP or TRUNCATE statements.

`src/seed.ts` runs on every container start but is idempotent: platform
reference data is upserted, and demo tenants are skipped if they already exist.
Restarting never destroys data.

`npm run docker:down` is safe. `docker compose down -v` deletes the volume and
therefore all data.

Prisma is used in introspection mode (`prisma db pull`) — the SQL files are the
source of truth for the schema, not Prisma migrations.

## Layout

| Path       | Purpose                                  |
|------------|------------------------------------------|
| `src/`     | Express app, routes, services, seed      |
| `prisma/`  | Introspected schema + generated client   |
| `db/init/` | Schema SQL applied on first DB boot      |
| `themes/`  | Theme registry served via the API        |
| `scripts/` | One-off maintenance scripts              |
