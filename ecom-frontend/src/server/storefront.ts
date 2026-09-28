import { z } from 'zod';
import type { Prisma } from '../generated/prisma/client';
import { getPrisma } from './db';
import { AppError, assertFound } from './errors';
import { hashPassword, signToken, verifyPassword } from './auth';
import { decorateProductPricing, type SaleRecord } from './sales';
import { pieceFilterEnum } from './piece-type';
import { searchTagHints } from './search-hints';
import { getStore, requireStoreId } from './store';

async function loadTenantSales(tenantId: string): Promise<SaleRecord[]> {
  return getPrisma().sale.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true,
      name: true,
      percentOff: true,
      scope: true,
      productId: true,
      categoryId: true,
      startsAt: true,
      endsAt: true,
      isActive: true,
    },
  });
}

async function getEffectiveEntitlements(tenantId: string) {
  const prisma = getPrisma();
  const [ents, limits, screens] = await Promise.all([
    prisma.tenantEntitlement.findMany({ where: { tenantId, enabled: true } }),
    prisma.tenantFeatureLimit.findMany({ where: { tenantId } }),
    prisma.tenantScreenOverride.findMany({ where: { tenantId } }),
  ]);
  return {
    entitlements: ents.map((e) => e.featureKey),
    limits: Object.fromEntries(limits.map((l) => [l.limitKey, l.value])),
    screens: screens.filter((s) => s.enabled).map((s) => s.screenKey),
  };
}

const loginBody = z.object({ email: z.string().email(), password: z.string() });
const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
});

export async function healthPayload() {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return { ok: true, service: 'essas-collection', db: 'up', api: 'workers' };
  } catch {
    throw new AppError(503, 'Database unavailable');
  }
}

export async function staffLogin(body: unknown) {
  const parsed = loginBody.parse(body);
  const prisma = getPrisma();
  const store = await getStore();
  const user = assertFound(
    await prisma.tenantUser.findUnique({
      where: { tenantId_email: { tenantId: store.id, email: parsed.email } },
      include: { role: { include: { permissions: true } } },
    }),
    'Invalid credentials',
  );
  if (!user.isActive || !(await verifyPassword(parsed.password, user.passwordHash))) {
    throw new AppError(401, 'Invalid credentials');
  }
  const token = await signToken({
    sub: user.id,
    realm: 'tenant',
    email: user.email,
    tenantId: store.id,
    role: user.role?.key,
  });
  const effective = await getEffectiveEntitlements(store.id);
  const productCount = await prisma.product.count({ where: { tenantId: store.id } });
  return {
    token,
    bootstrap: {
      tenant: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        customDomain: store.customDomain,
        plan: store.plan?.key,
      },
      entitlements: effective.entitlements,
      limits: { ...effective.limits, current_products: productCount },
      screens: effective.screens,
      permissions: user.role?.permissions.map((p) => p.permissionKey) || ['*'],
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role?.key },
    },
  };
}

export async function customerLogin(body: unknown) {
  const parsed = loginBody.parse(body);
  const prisma = getPrisma();
  const storeId = await requireStoreId();
  const customer = assertFound(
    await prisma.customer.findUnique({
      where: { tenantId_email: { tenantId: storeId, email: parsed.email } },
    }),
    'Invalid credentials',
  );
  if (!customer.passwordHash || !(await verifyPassword(parsed.password, customer.passwordHash))) {
    throw new AppError(401, 'Invalid credentials');
  }
  const store = await getStore();
  const token = await signToken({
    sub: customer.id,
    realm: 'customer',
    email: customer.email,
    tenantId: storeId,
  });
  return {
    token,
    customer: { id: customer.id, email: customer.email, fullName: customer.fullName },
    tenant: { id: store.id, slug: store.slug, name: store.name },
  };
}

export async function customerRegister(body: unknown) {
  const parsed = registerBody.parse(body);
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const customer = await prisma.customer.create({
    data: {
      tenantId,
      email: parsed.email,
      fullName: parsed.fullName,
      passwordHash: await hashPassword(parsed.password),
    },
  });
  const token = await signToken({
    sub: customer.id,
    realm: 'customer',
    email: customer.email,
    tenantId,
  });
  return {
    status: 201 as const,
    body: {
      token,
      customer: { id: customer.id, email: customer.email, fullName: customer.fullName },
    },
  };
}

export async function storefrontContext() {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    include: {
      themeConfig: { include: { theme: true } },
      pageSections: true,
      menus: { include: { items: { orderBy: { sortOrder: 'asc' } } } },
    },
  });
  const entitlements = await prisma.tenantEntitlement.findMany({
    where: { tenantId: tenant.id, enabled: true },
  });
  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      subdomain: tenant.subdomain,
      customDomain: tenant.customDomain,
    },
    branding: tenant.themeConfig,
    pages: Object.fromEntries(tenant.pageSections.map((p) => [p.pageKey, p.sections])),
    menus: tenant.menus,
    entitlements: entitlements.map((e) => e.featureKey),
  };
}

export async function storefrontSettings() {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const settings = await prisma.storeSettings.findUnique({ where: { tenantId } });
  return (
    settings || {
      tenantId,
      announcementEnabled: false,
      announcementText: null,
      freeShippingThresholdCents: 0,
      giftNotesEnabled: false,
      supportEmail: null,
      currency: 'PKR',
    }
  );
}

export async function listCategories() {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  return prisma.category.findMany({
    where: { tenantId, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function listProducts(url: URL) {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const q = url.searchParams.get('q') || undefined;
  const category = url.searchParams.get('category') || undefined;
  return prisma.product.findMany({
    where: {
      tenantId,
      status: 'active',
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { tags: { hasSome: q.toLowerCase().split(/\s+/).filter(Boolean) } },
            ],
          }
        : {}),
      ...(category ? { category: { slug: category } } : {}),
    },
    include: { variants: { where: { isActive: true } }, category: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function productBySlug(slug: string) {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  return assertFound(
    await prisma.product.findFirst({
      where: { tenantId, slug, status: 'active' },
      include: {
        variants: { where: { isActive: true }, include: { inventory: true } },
        category: true,
      },
    }),
  );
}

export async function catalog(url: URL) {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const q = url.searchParams.get('q') || undefined;
  const category = url.searchParams.get('category') || undefined;
  const tag = url.searchParams.get('tag')?.toLowerCase().trim() || undefined;
  const color = url.searchParams.get('color')?.toLowerCase().trim() || undefined;
  const pieces = url.searchParams.get('pieces')?.toLowerCase().trim() || undefined;
  const sort = url.searchParams.get('sort') || 'newest';
  const minPrice = url.searchParams.get('minPrice') ? Number(url.searchParams.get('minPrice')) : undefined;
  const maxPrice = url.searchParams.get('maxPrice') ? Number(url.searchParams.get('maxPrice')) : undefined;
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const limit = Math.min(48, Math.max(1, Number(url.searchParams.get('limit') || 12)));
  const skip = (page - 1) * limit;
  const hinted = q ? searchTagHints(q) : [];
  const pieceTag = pieces ? (pieces === 'dupattas' ? 'dupatta' : pieces) : undefined;
  const pieceEnum = pieceFilterEnum(pieceTag);

  const where: Prisma.ProductWhereInput = {
    tenantId,
    status: 'active',
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            ...(hinted.length ? [{ tags: { hasSome: hinted } }] : []),
          ],
        }
      : {}),
    ...(category ? { category: { slug: category } } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
    ...(pieceEnum && pieceTag
      ? { AND: [{ OR: [{ tags: { has: pieceTag } }, { pieceType: pieceEnum }] }] }
      : {}),
    ...(color ? { tags: { has: color } } : {}),
    ...(minPrice != null || maxPrice != null
      ? {
          variants: {
            some: {
              isActive: true,
              priceCents: {
                ...(minPrice != null ? { gte: Math.round(minPrice * 100) } : {}),
                ...(maxPrice != null ? { lte: Math.round(maxPrice * 100) } : {}),
              },
            },
          },
        }
      : {}),
  };

  const [total, products, sales] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        variants: { where: { isActive: true }, include: { inventory: true } },
        category: true,
        reviews: { where: { isApproved: true }, select: { rating: true } },
      },
      orderBy: sort === 'name' ? { name: 'asc' } : { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    loadTenantSales(tenantId),
  ]);

  let items = products.map((p) => {
    const ratings = p.reviews.map((r) => r.rating);
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    const min = Math.min(...p.variants.map((v) => v.priceCents), Infinity);
    return decorateProductPricing(
      {
        ...p,
        reviewCount: ratings.length,
        avgRating: Math.round(avg * 10) / 10,
        fromPriceCents: Number.isFinite(min) ? min : 0,
        inStock: p.variants.some((v) => (v.inventory[0]?.quantity || 0) > 0),
      },
      sales,
    );
  });

  if (sort === 'price_asc') items = items.sort((a, b) => a.fromPriceCents - b.fromPriceCents);
  if (sort === 'price_desc') items = items.sort((a, b) => b.fromPriceCents - a.fromPriceCents);
  if (sort === 'rating') items = items.sort((a, b) => b.avgRating - a.avgRating);

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function productDetail(slug: string) {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const product = assertFound(
    await prisma.product.findFirst({
      where: { tenantId, slug, status: 'active' },
      include: {
        variants: { where: { isActive: true }, include: { inventory: true } },
        category: true,
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    }),
  );
  const sales = await loadTenantSales(tenantId);
  const related = product.categoryId
    ? await prisma.product.findMany({
        where: { tenantId, status: 'active', categoryId: product.categoryId, NOT: { id: product.id } },
        include: { variants: { where: { isActive: true } }, category: true },
        take: 4,
      })
    : [];
  const ratings = product.reviews.map((r) => r.rating);
  const min = Math.min(...product.variants.map((v) => v.priceCents), Infinity);
  return decorateProductPricing(
    {
      ...product,
      avgRating: ratings.length
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : 0,
      reviewCount: ratings.length,
      fromPriceCents: Number.isFinite(min) ? min : 0,
      related: related.map((r) => {
        const rMin = Math.min(...r.variants.map((v) => v.priceCents), Infinity);
        return decorateProductPricing({ ...r, fromPriceCents: Number.isFinite(rMin) ? rMin : 0 }, sales);
      }),
    },
    sales,
  );
}

export async function collectionBySlug(slug: string) {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const pieceMap: Record<string, { tag: string; name: string; description: string }> = {
    '1-piece': { tag: '1-piece', name: '1 Piece', description: 'Single unstitched shirts.' },
    '2-piece': { tag: '2-piece', name: '2 Piece', description: 'Unstitched shirt and trouser sets.' },
    '3-piece': { tag: '3-piece', name: '3 Piece', description: 'Unstitched shirt, trouser and dupatta ensembles.' },
    dupatta: { tag: 'dupatta', name: 'Dupattas', description: 'Standalone dupattas in chiffon, silk and organza.' },
    dupattas: { tag: 'dupatta', name: 'Dupattas', description: 'Standalone dupattas in chiffon, silk and organza.' },
  };

  const include = {
    variants: { where: { isActive: true }, include: { inventory: true } },
    reviews: { where: { isApproved: true }, select: { rating: true } },
    category: true,
  } as const;

  let collection: { name: string; description?: string | null; slug: string };
  let products;

  if (slug === 'new-arrivals') {
    collection = {
      name: 'New Arrivals',
      slug,
      description: 'The latest unstitched pieces from Essa’s Collection.',
    };
    products = await prisma.product.findMany({
      where: { tenantId, status: 'active' },
      include,
      orderBy: { createdAt: 'desc' },
      take: 16,
    });
  } else if (pieceMap[slug]) {
    const meta = pieceMap[slug];
    collection = { name: meta.name, slug, description: meta.description };
    products = await prisma.product.findMany({
      where: {
        tenantId,
        status: 'active',
        OR: [{ tags: { has: meta.tag } }, { pieceType: pieceFilterEnum(meta.tag) ?? 'THREE_PIECE' }],
      },
      include,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    });
  } else {
    const found = assertFound(
      await prisma.category.findFirst({ where: { tenantId, slug, isActive: true } }),
    );
    collection = found;
    products = await prisma.product.findMany({
      where: { tenantId, status: 'active', categoryId: found.id },
      include,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    });
  }

  const sales = await loadTenantSales(tenantId);
  return {
    collection,
    products: products.map((p) => {
      const ratings = p.reviews.map((r) => r.rating);
      return decorateProductPricing(
        {
          ...p,
          avgRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0,
          reviewCount: ratings.length,
          fromPriceCents: Math.min(...p.variants.map((v) => v.priceCents), Infinity) || 0,
          inStock: p.variants.some((v) => (v.inventory[0]?.quantity || 0) > 0),
        },
        sales,
      );
    }),
  };
}

export async function featuredProducts() {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  return prisma.product.findMany({
    where: { tenantId, status: 'active', featured: true },
    include: { variants: { where: { isActive: true }, take: 1 }, category: true },
    take: 12,
  });
}

export async function healthOrDown() {
  try {
    return { status: 200 as const, body: await healthPayload() };
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 503) {
      return {
        status: 503 as const,
        body: { ok: false, service: 'essas-collection', db: 'down', api: 'workers' },
      };
    }
    throw err;
  }
}
