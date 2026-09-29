FROM node:22-alpine AS backend-build
WORKDIR /app/ecom-backend
COPY ecom-backend/package.json ecom-backend/package-lock.json ./
RUN npm ci
COPY ecom-backend/ ./
ENV DATABASE_URL=postgresql://user:pass@localhost:5432/db?schema=public
ENV DIRECT_URL=postgresql://user:pass@localhost:5432/db?schema=public
RUN npx prisma generate && npm run build

FROM node:22-alpine AS frontend-build
WORKDIR /app/ecom-frontend
COPY ecom-frontend/package.json ecom-frontend/package-lock.json ./
RUN npm ci
COPY ecom-frontend/ ./
ENV NEXT_PUBLIC_API_URL=/api
ENV INTERNAL_API_URL=http://127.0.0.1:4000
ENV NEXT_TELEMETRY_DISABLED=1
# Deplexo serves /api through Express rewrites (INTERNAL_API_URL). Next.js
# type-checks every file in tsconfig include (`**/*.ts`), so leftover Workers
# Route Handlers and src/server still require ../generated/prisma/client even
# when nothing in the Deplexo UI imports them. Strip that experiment from this
# image only; it remains in git for vinext. Do not generate Cloudflare Prisma.
RUN rm -rf src/app/api src/server
RUN npm run build

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=backend-build /app/ecom-backend/package.json ./ecom-backend/package.json
COPY --from=backend-build /app/ecom-backend/package-lock.json ./ecom-backend/package-lock.json
COPY --from=backend-build /app/ecom-backend/node_modules ./ecom-backend/node_modules
COPY --from=backend-build /app/ecom-backend/dist ./ecom-backend/dist
COPY --from=backend-build /app/ecom-backend/prisma ./ecom-backend/prisma
COPY --from=backend-build /app/ecom-backend/uploads/essa ./ecom-backend/uploads/essa
COPY --from=frontend-build /app/ecom-frontend/.next/standalone ./ecom-frontend
COPY --from=frontend-build /app/ecom-frontend/.next/static ./ecom-frontend/.next/static
COPY --from=frontend-build /app/ecom-frontend/public ./ecom-frontend/public
COPY scripts/start-docker.mjs ./scripts/start-docker.mjs
ENV NODE_ENV=production
ENV API_PORT=4000
ENV API_HOST=127.0.0.1
ENV NEXT_PUBLIC_API_URL=/api
ENV INTERNAL_API_URL=http://127.0.0.1:4000
ENV HOSTNAME=0.0.0.0
# Deplexo injects PORT at runtime. Default 3000 only if PORT is unset (local docker).
ENV PORT=3000
EXPOSE 3000
CMD ["node", "scripts/start-docker.mjs"]
