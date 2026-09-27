# Deploying the frontend

The app uses [vinext](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/),
Cloudflare's recommended adapter for Next.js 16. It targets **Cloudflare Workers**
(not Pages — Pages only supports static exports, and this app has 13 dynamic routes).

## Local commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Plain Next.js dev server on :3000 (unchanged) |
| `npm run dev:vinext` | vinext dev server on :3001 |
| `npm run build:vinext` | Production build into `dist/` |
| `npm run start:vinext` | Run the built Worker locally via Wrangler (:8787) |
| `npm run deploy:vinext` | Deploy to Cloudflare Workers |

## Before the first deploy

### 1. The backend must be on public HTTPS

The deployed page is served over HTTPS. Browsers block `http://` requests from an
HTTPS page as mixed content, so a `localhost` or plain-HTTP API will fail no matter
how healthy it is. Confirm the API is reachable at its public URL first:

    curl https://api.dreamfitters.com/status.json

### 2. Set the API URL at build time

`NEXT_PUBLIC_API_URL` is **inlined into the JS bundle during the build** — it is not
read at runtime. Changing it requires a rebuild and redeploy.

    NEXT_PUBLIC_API_URL=https://api.dreamfitters.com npm run build:vinext

For CI or the Cloudflare dashboard, set it as a build-time environment variable.
See `.env.production.example`.

### 3. Allow the deployed origin in the backend's CORS

In the backend's `.env`:

    CORS_ORIGINS=https://dreamfitters.com,https://www.dreamfitters.com

Comma-separated, no trailing slashes. Restart the API afterwards. Requests from an
origin not on this list get no CORS headers and the browser blocks them.

## Deploy

    npx wrangler login          # once
    NEXT_PUBLIC_API_URL=https://api.dreamfitters.com npm run build:vinext
    npm run deploy:vinext

Then attach the custom domain in the Cloudflare dashboard:
Workers & Pages -> ecom-frontend -> Settings -> Domains & Routes -> Add custom domain
-> `dreamfitters.com`. DNS is already on Cloudflare nameservers, so the record is
created automatically and TLS is issued within a few minutes.

The backend already allows `https://dreamfitters.com` in CORS, so no backend change
is needed for the apex domain. If you also serve `www.`, add it to CORS_ORIGINS.

## Verify

Open `/status` on the deployed site. It probes the API and reports what actually
works — including a mixed-content warning and a real CORS preflight. All four
checks should pass. If they don't, that page names the likely cause.

## Config files

- `wrangler.jsonc` — Worker config. `nodejs_compat` is already enabled.
- `vite.config.ts` — vinext + Cloudflare plugins, edge CDN caching.

No KV namespace or Cloudflare Images subscription is used.

---

# Option B: Deploy with Docker (any host)

Runs the app as a normal Next.js server in a container — no Cloudflare adapter
involved, and all dynamic routes work. Use this on a VPS, Fly.io, Railway, Render,
ECS, or anywhere that runs a container.

## Build and run

    NEXT_PUBLIC_API_URL=https://api.dreamfitters.com \
      docker compose -f docker-compose.prod.yml up -d --build

The image is ~333MB (Next.js `output: 'standalone'`), runs as a non-root user, and
has a healthcheck. It listens on port 3000, bound to 127.0.0.1.

**`NEXT_PUBLIC_API_URL` must be set at BUILD time** — it is inlined into the client
bundle. Setting it only at runtime has no effect. `docker-compose.prod.yml` refuses
to build without it rather than silently defaulting to localhost.

## Put TLS in front

The container serves plain HTTP on 127.0.0.1:3000. Terminate TLS with a reverse
proxy (Caddy, nginx, Traefik) or Cloudflare Tunnel. The page must be served over
HTTPS or the browser will block calls to the HTTPS API as mixed content.

Caddy example — automatic TLS:

    dreamfitters.com {
        reverse_proxy 127.0.0.1:3000
    }

## Backend CORS

Whatever origin the site ends up on must be in the backend's `CORS_ORIGINS`.
`https://dreamfitters.com` is already allowed.

## Updating

    NEXT_PUBLIC_API_URL=https://api.dreamfitters.com \
      docker compose -f docker-compose.prod.yml up -d --build

## Verify

Open `/status` on the deployed site — all four checks should pass.
