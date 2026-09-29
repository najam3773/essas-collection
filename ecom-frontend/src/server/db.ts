import { PrismaNeonHTTP } from '@prisma/adapter-neon';
import { PrismaClient } from '../generated/prisma/client';

function connectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required for the Workers Prisma client');
  }
  return url;
}

/**
 * Neon HTTP Prisma client for Cloudflare Workers.
 * A new client is created per call so query promises stay inside the current
 * request isolate (a process-wide singleton breaks under concurrent vinext requests).
 * Uses DATABASE_URL only. No native engine, DIRECT_URL, Hyperdrive, or migrations.
 */
export function getPrisma(): PrismaClient {
  const adapter = new PrismaNeonHTTP(connectionString(), {});
  return new PrismaClient({ adapter });
}
