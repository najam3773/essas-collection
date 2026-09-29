import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { resolveTenant, requireTenant } from '../middleware/tenant.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError, assertFound } from '../lib/errors.js';
import { decorateProductPricing, loadTenantSales } from '../lib/sale-pricing.js';
import { pieceFilterEnum } from '../lib/piece-type.js';
import { storefrontAddressSchema } from '../lib/storefront-address.js';

export const storefrontExtraRouter = Router();
storefrontExtraRouter.use(resolveTenant, requireTenant);

function tid(req: { tenantId?: string }) {
  return req.tenantId!;
}

/** Product listing with filters, sort, pagination */
storefrontExtraRouter.get('/catalog', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const tag = typeof req.query.tag === 'string' ? req.query.tag.toLowerCase().trim() : undefined;
    const color = typeof req.query.color === 'string' ? req.query.color.toLowerCase().trim() : undefined;
    const pieces = typeof req.query.pieces === 'string' ? req.query.pieces.toLowerCase().trim() : undefined;
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'newest';
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(48, Math.max(1, Number(req.query.limit || 12)));
    const skip = (page - 1) * limit;

    const { searchTagHints } = await import('../lib/unstitched-catalog.js');
    const hinted = q ? searchTagHints(q) : [];
    const pieceTag = pieces
      ? pieces === 'dupattas'
        ? 'dupatta'
        : pieces
      : undefined;
    const pieceEnum = pieceFilterEnum(pieceTag);

    const where: Prisma.ProductWhereInput = {
      tenantId: tid(req),
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
        ? {
            AND: [
              {
                OR: [{ tags: { has: pieceTag } }, { pieceType: pieceEnum }],
              },
            ],
          }
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

    const orderBy =
      sort === 'name'
        ? { name: 'asc' as const }
        : sort === 'price_asc' || sort === 'price_desc'
          ? { createdAt: 'desc' as const }
          : { createdAt: 'desc' as const };

    const [total, products, sales] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          variants: { where: { isActive: true }, include: { inventory: true } },
          category: true,
          reviews: { where: { isApproved: true }, select: { rating: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      loadTenantSales(tid(req)),
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

    res.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    next(e);
  }
});

storefrontExtraRouter.get('/products/:slug/detail', async (req, res, next) => {
  try {
    const product = assertFound(
      await prisma.product.findFirst({
        where: { tenantId: tid(req), slug: req.params.slug, status: 'active' },
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
    const sales = await loadTenantSales(tid(req));
    const related = product.categoryId
      ? await prisma.product.findMany({
          where: {
            tenantId: tid(req),
            status: 'active',
            categoryId: product.categoryId,
            NOT: { id: product.id },
          },
          include: { variants: { where: { isActive: true } }, category: true },
          take: 4,
        })
      : [];
    const ratings = product.reviews.map((r) => r.rating);
    const min = Math.min(...product.variants.map((v) => v.priceCents), Infinity);
    res.json(
      decorateProductPricing(
        {
          ...product,
          avgRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0,
          reviewCount: ratings.length,
          fromPriceCents: Number.isFinite(min) ? min : 0,
          related: related.map((r) => {
            const rMin = Math.min(...r.variants.map((v) => v.priceCents), Infinity);
            return decorateProductPricing(
              { ...r, fromPriceCents: Number.isFinite(rMin) ? rMin : 0 },
              sales,
            );
          }),
        },
        sales,
      ),
    );
  } catch (e) {
    next(e);
  }
});

storefrontExtraRouter.post('/products/:id/reviews', async (req, res, next) => {
  try {
    const body = z
      .object({
        authorName: z.string().min(1),
        rating: z.number().int().min(1).max(5),
        title: z.string().optional(),
        body: z.string().optional(),
      })
      .parse(req.body);
    const product = assertFound(
      await prisma.product.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
    );
    const review = await prisma.productReview.create({
      data: {
        tenantId: tid(req),
        productId: product.id,
        customerId: req.auth?.realm === 'customer' ? req.auth.sub : undefined,
        authorName: body.authorName,
        rating: body.rating,
        title: body.title,
        body: body.body,
      },
    });
    res.status(201).json(review);
  } catch (e) {
    next(e);
  }
});

storefrontExtraRouter.get('/wishlist', requireAuth('customer'), async (req, res, next) => {
  try {
    const wishlist = await prisma.wishlist.upsert({
      where: { tenantId_customerId: { tenantId: tid(req), customerId: req.auth!.sub } },
      create: { tenantId: tid(req), customerId: req.auth!.sub },
      update: {},
      include: {
        items: {
          include: { product: { include: { variants: { where: { isActive: true }, take: 1 } } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    res.json(wishlist);
  } catch (e) {
    next(e);
  }
});

storefrontExtraRouter.post('/wishlist/:productId', requireAuth('customer'), async (req, res, next) => {
  try {
    const product = assertFound(
      await prisma.product.findFirst({ where: { id: req.params.productId, tenantId: tid(req) } }),
    );
    const wishlist = await prisma.wishlist.upsert({
      where: { tenantId_customerId: { tenantId: tid(req), customerId: req.auth!.sub } },
      create: { tenantId: tid(req), customerId: req.auth!.sub },
      update: {},
    });
    await prisma.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId: product.id } },
      create: { tenantId: tid(req), wishlistId: wishlist.id, productId: product.id },
      update: {},
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

storefrontExtraRouter.delete('/wishlist/:productId', requireAuth('customer'), async (req, res, next) => {
  try {
    const wishlist = await prisma.wishlist.findUnique({
      where: { tenantId_customerId: { tenantId: tid(req), customerId: req.auth!.sub } },
    });
    if (wishlist) {
      await prisma.wishlistItem.deleteMany({
        where: { wishlistId: wishlist.id, productId: req.params.productId },
      });
    }
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

storefrontExtraRouter.post('/coupons/validate', async (req, res, next) => {
  try {
    const body = z.object({ code: z.string(), subtotalCents: z.number().int() }).parse(req.body);
    const coupon = await prisma.coupon.findUnique({
      where: { tenantId_code: { tenantId: tid(req), code: body.code.toUpperCase() } },
    });
    if (!coupon || !coupon.isActive) throw new AppError(404, 'Invalid coupon');
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      throw new AppError(400, 'Coupon usage limit reached');
    }
    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) throw new AppError(400, 'Coupon not active yet');
    if (coupon.endsAt && coupon.endsAt < now) throw new AppError(400, 'Coupon expired');
    const discount =
      coupon.type === 'percent'
        ? Math.round((body.subtotalCents * coupon.value) / 100)
        : Math.min(coupon.value, body.subtotalCents);
    res.json({ code: coupon.code, type: coupon.type, value: coupon.value, discountCents: discount });
  } catch (e) {
    next(e);
  }
});

storefrontExtraRouter.post('/checkout/quote', async (req, res, next) => {
  try {
    const body = z
      .object({
        cartId: z.string().uuid(),
        country: z.string().default('US'),
        region: z.string().optional(),
        couponCode: z.string().optional(),
      })
      .parse(req.body);
    const cart = assertFound(
      await prisma.cart.findFirst({
        where: { id: body.cartId, tenantId: tid(req) },
        include: { items: true },
      }),
    );
    const subtotal = cart.items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
    const { computePricing } = await import('./advanced.js');
    const pricing = await computePricing({
      tenantId: tid(req),
      subtotalCents: subtotal,
      country: body.country,
      couponCode: body.couponCode,
    });
    res.json(pricing);
  } catch (e) {
    next(e);
  }
});

storefrontExtraRouter.post('/newsletter', async (req, res, next) => {
  try {
    const body = z.object({ email: z.string().email() }).parse(req.body);
    await prisma.newsletterSubscriber.upsert({
      where: { tenantId_email: { tenantId: tid(req), email: body.email } },
      create: { tenantId: tid(req), email: body.email },
      update: {},
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

storefrontExtraRouter.get('/account', requireAuth('customer'), async (req, res, next) => {
  try {
    const customer = assertFound(
      await prisma.customer.findFirst({
        where: { id: req.auth!.sub, tenantId: tid(req) },
        include: {
          addresses: true,
          orders: { include: { lines: true }, orderBy: { createdAt: 'desc' }, take: 20 },
        },
      }),
    );
    const { passwordHash: _, ...safe } = customer;
    res.json(safe);
  } catch (e) {
    next(e);
  }
});

storefrontExtraRouter.put('/account', requireAuth('customer'), async (req, res, next) => {
  try {
    const body = z
      .object({ fullName: z.string().optional(), phone: z.string().optional() })
      .parse(req.body);
    const updated = await prisma.customer.update({
      where: { id: req.auth!.sub },
      data: body,
    });
    res.json({ id: updated.id, email: updated.email, fullName: updated.fullName, phone: updated.phone });
  } catch (e) {
    next(e);
  }
});

storefrontExtraRouter.post('/account/addresses', requireAuth('customer'), async (req, res, next) => {
  try {
    const body = storefrontAddressSchema
      .extend({
        label: z.string().optional(),
        isDefault: z.boolean().optional(),
      })
      .parse(req.body);
    if (body.isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId: req.auth!.sub, tenantId: tid(req) },
        data: { isDefault: false },
      });
    }
    res.status(201).json(
      await prisma.customerAddress.create({
        data: { tenantId: tid(req), customerId: req.auth!.sub, ...body },
      }),
    );
  } catch (e) {
    next(e);
  }
});

storefrontExtraRouter.get('/pages', async (req, res, next) => {
  try {
    res.json(
      await prisma.contentPage.findMany({
        where: { tenantId: tid(req), status: 'published' },
        select: { id: true, title: true, slug: true },
      }),
    );
  } catch (e) {
    next(e);
  }
});
