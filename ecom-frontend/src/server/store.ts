import { getPrisma } from './db';
import { AppError } from './errors';

export const STORE_SLUG = 'essas-collection';

let cachedId: string | null = null;

export async function getStoreId(): Promise<string> {
  if (cachedId) return cachedId;
  const prisma = getPrisma();
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
  const prisma = getPrisma();
  const id = await getStoreId();
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: { plan: true, themeConfig: { include: { theme: true } } },
  });
  if (!tenant || tenant.status !== 'active') {
    throw new AppError(tenant ? 403 : 500, tenant ? 'Store is not available' : 'Store not found');
  }
  return tenant;
}

export async function requireStoreId() {
  const store = await getStore();
  return store.id;
}
