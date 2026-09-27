# Essa's Collection

Single-store fashion e-commerce. One brand, one domain, one deployable web service.

```
Browser → https://essas-collection.onrender.com
            ├── Next.js storefront + admin   (public PORT)
            └── /api/* and /uploads/*  →  Express on 127.0.0.1:4000
                                              └── Neon PostgreSQL
                                              └── Cloudinary (new product images)
```

Do not split frontend and backend onto separate hosts. Do not use a second API domain.

## Local development

1. Start Postgres (`docker compose up -d postgres`, port 5433).
2. Copy `ecom-backend/.env.example` → `ecom-backend/.env` and `ecom-frontend/.env.example` → `ecom-frontend/.env.local`.
3. From this folder:

```bash
npm run install:all
npm run prisma:generate
npm run db:push
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run seed` is **development / first-time catalog only**. It is never run on production startup.

### Development logins

| Role | Email | Password |
|---|---|---|
| Staff / owner | owner@essascollection.com | Password123! |
| Customer | shopper@example.com | Password123! |

Coupon: `WELCOME10`

Admin: [http://localhost:3000/admin](http://localhost:3000/admin)

## Environment variables

See root `.env.example`. Never commit real secrets.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon/Postgres (pooled URL is fine for the app) |
| `DIRECT_URL` | Neon unpooled URL for Prisma `db push`. If unset, startup copies `DATABASE_URL` |
| `JWT_SECRET` | Fallback signing secret |
| `JWT_STAFF_SECRET` | Staff/admin tokens (`STAFF_JWT_SECRET` also accepted) |
| `JWT_CUSTOMER_SECRET` | Customer tokens (`CUSTOMER_JWT_SECRET` also accepted) |
| `WEB_URL` | Public site origin, e.g. `https://essas-collection.onrender.com` |
| `API_PORT` | Internal Express port (default `4000`, not public) |
| `API_HOST` | Express bind address (`127.0.0.1` in production) |
| `PORT` | Public Next.js port (Render injects this) |
| `NEXT_PUBLIC_API_URL` | Must stay `/api` |
| `INTERNAL_API_URL` | `http://127.0.0.1:4000` |
| `IMAGE_STORAGE` | `local` (dev) or `cloudinary` (production) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud |
| `CLOUDINARY_API_KEY` | Cloudinary key |
| `CLOUDINARY_API_SECRET` | Server-side only |

## Production (one Render web service)

Target: **one** Render Web Service + Neon PostgreSQL + Cloudinary.

### Build and start

```bash
npm run install:all
npm run build
npm start
```

Docker (what Render should build):

```bash
docker build -t essas-collection .
docker run --rm -p 3000:3000 --env-file ecom-backend/.env -e PORT=3000 -e IMAGE_STORAGE=local essas-collection
```

- Public: `process.env.PORT` (Next.js)
- Internal: Express on `127.0.0.1:4000`
- Health check: `GET /api/health` (or `GET /health`) — HTTP 200 when Next can reach Express and Postgres answers `SELECT 1`
- Startup applies schema with `prisma db push` only. **It does not seed.**

### Initialize Neon (once)

From your machine, with Neon URLs in the environment:

```bash
npm run db:push
```

Optional catalog/demo data (do this once, never on every boot):

```bash
npm run seed
```

### Cloudinary

Set `IMAGE_STORAGE=cloudinary` and the three `CLOUDINARY_*` variables on Render.

New admin uploads store `https://res.cloudinary.com/...` URLs in PostgreSQL. Existing catalog images stay as `/uploads/essa/...` and ship inside the image.

## Layout

| Path | Role |
|---|---|
| `ecom-frontend` | Next.js UI |
| `ecom-backend` | Express API + Prisma + seed |
| `scripts/` | Dev / production / Docker process supervisors |
| `Dockerfile` | One-app production image (no Postgres, no Redis) |
| `docker-compose.yml` | Local Postgres + optional local app image |
