import { PrismaNeonHTTP } from '@prisma/adapter-neon';
import { PrismaClient } from '../generated/prisma/client';

type GlobalPrisma = {
  workersPrisma?: PrismaClient;
};

const globalForPrisma = globalThis as typeof globalThis & GlobalPrisma;

function connectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required for the Workers Prisma client');
  }
  return url;
}

/**
 * Neon HTTP Prisma client for Cloudflare Workers.
 * Uses DATABASE_URL only. Does not load the native query engine, DIRECT_URL, or run migrations.
 */
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.workersPrisma) {
    const adapter = new PrismaNeonHTTP(connectionString(), {});
    globalForPrisma.workersPrisma = new PrismaClient({ adapter });
  }
  return globalForPrisma.workersPrisma;
}
