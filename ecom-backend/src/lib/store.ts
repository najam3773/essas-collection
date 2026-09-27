import { prisma } from './db.js';
import { AppError } from './errors.js';

export const STORE_SLUG = 'essas-collection';
export const STORE_NAME = "Essa's Collection";

let cachedId: string | null = null;

export function clearStoreCache() {
  cachedId = null;
}

/** Single-store id. Prefers the Essa slug; otherwise the first active tenant row. */
export async function getStoreId(): Promise<string> {
  if (cachedId) return cachedId;

  const preferred = await prisma.tenant.findFirst({
    where: { slug: STORE_SLUG, status: 'active' },
  });
  const tenant =
    preferred ||
    (await prisma.tenant.findFirst({
      where: { status: 'active' },
      orderBy: { createdAt: 'asc' },
    }));

  if (!tenant) {
    throw new AppError(500, 'Store is not seeded. Run npm run seed in ecom-backend.');
  }
  cachedId = tenant.id;
  return cachedId;
}

export async function getStore() {
  const id = await getStoreId();
  return prisma.tenant.findUniqueOrThrow({
    where: { id },
    include: { plan: true, themeConfig: { include: { theme: true } } },
  });
}
