import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { resolveTenant, requireTenant } from '../middleware/tenant.js';
import { requireAuth, requireFeatures, requirePermissions } from '../middleware/auth.js';
import { loadTenantBootstrap } from '../middleware/bootstrap.js';
import { AppError, assertFound } from '../lib/errors.js';
import { parsePieceTypeKey, pieceFilterEnum, pieceTypeTags, pieceTypeToEnum } from '../lib/piece-type.js';
import { decorateProductPricing, loadTenantSales } from '../lib/sale-pricing.js';

export const storefrontAdvancedRouter = Router();
storefrontAdvancedRouter.use(resolveTenant, requireTenant);

export const adminAdvancedRouter = Router();
adminAdvancedRouter.use(requireAuth('tenant'), loadTenantBootstrap);

function tid(req: { tenantId?: string }) {
  return req.tenantId!;
}

const STORE_CURRENCY_CODES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'PKR',
  'INR',
  'AED',
  'SAR',
  'JPY',
] as const;

const CURRENCY_NAMES: Record<(typeof STORE_CURRENCY_CODES)[number], string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  PKR: 'Pakistani Rupee',
  INR: 'Indian Rupee',
  AED: 'UAE Dirham',
  SAR: 'Saudi Riyal',
  JPY: 'Japanese Yen',
};

async function getSettings(tenantId: string) {
  return prisma.storeSettings.upsert({
    where: { tenantId },
    create: {
      tenantId,
      announcementEnabled: true,
      announcementText: 'Free shipping on orders over $75 · Use code WELCOME10',
      freeShippingThresholdCents: 7500,
      giftNotesEnabled: true,
      supportEmail: 'support@example.com',
      currency: 'USD',
    },
    update: {},
  });
}

async function syncDefaultCurrency(tenantId: string, code: string) {
  const name = CURRENCY_NAMES[code as keyof typeof CURRENCY_NAMES] || code;
  await prisma.storeCurrency.updateMany({
    where: { tenantId, isDefault: true, NOT: { code } },
    data: { isDefault: false },
  });
  await prisma.storeCurrency.upsert({
    where: { tenantId_code: { tenantId, code } },
    create: { tenantId, code, name, rateToBase: 1, isDefault: true, isActive: true },
    update: { name, isDefault: true, isActive: true, rateToBase: 1 },
  });
}

export async function computePricing(opts: {
  tenantId: string;
  subtotalCents: number;
  country: string;
  couponCode?: string;
}) {
  const settings = await getSettings(opts.tenantId);
  const zone = await prisma.shippingZone.findFirst({
    where: { tenantId: opts.tenantId, isActive: true, countries: { has: opts.country } },
  });
  let shipping = zone?.rateCents ?? 599;
  const taxRule = await prisma.taxRule.findFirst({
    where: { tenantId: opts.tenantId, isActive: true, country: opts.country },
  });
  const tax = Math.round((opts.subtotalCents * (taxRule?.rateBps || 825)) / 10000);

  let discount = 0;
  let couponCode: string | undefined;
  let autoRuleName: string | undefined;

  if (opts.couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { tenantId_code: { tenantId: opts.tenantId, code: opts.couponCode.toUpperCase() } },
    });
    if (coupon?.isActive && (coupon.maxUses == null || coupon.usedCount < coupon.maxUses)) {
      discount =
        coupon.type === 'percent'
          ? Math.round((opts.subtotalCents * coupon.value) / 100)
          : Math.min(coupon.value, opts.subtotalCents);
      couponCode = coupon.code;
    }
  }

  const rules = await prisma.discountRule.findMany({
    where: { tenantId: opts.tenantId, isActive: true },
    orderBy: { value: 'desc' },
  });
  const now = new Date();
  for (const rule of rules) {
    if (rule.startsAt && rule.startsAt > now) continue;
    if (rule.endsAt && rule.endsAt < now) continue;
    if (opts.subtotalCents < rule.minSubtotalCents) continue;
    if (rule.type === 'free_shipping') {
      shipping = 0;
      autoRuleName = rule.name;
    } else if (rule.type === 'percent_off_order') {
      const d = Math.round((opts.subtotalCents * rule.value) / 100);
      if (d > discount) {
        discount = d;
        autoRuleName = rule.name;
        couponCode = undefined;
      }
    } else if (rule.type === 'fixed_off_order') {
      const d = Math.min(rule.value, opts.subtotalCents);
      if (d > discount) {
        discount = d;
        autoRuleName = rule.name;
        couponCode = undefined;
      }
    }
  }

  if (
    settings.freeShippingThresholdCents != null &&
    opts.subtotalCents >= settings.freeShippingThresholdCents
  ) {
    shipping = 0;
    autoRuleName = autoRuleName || 'Free shipping threshold';
  }

  const total = Math.max(0, opts.subtotalCents - discount) + shipping + tax;
  return {
    subtotalCents: opts.subtotalCents,
    discountCents: discount,
    shippingCents: shipping,
    taxCents: tax,
    totalCents: total,
    couponCode,
    autoRuleName,
    freeShippingThresholdCents: settings.freeShippingThresholdCents,
    amountToFreeShipping: settings.freeShippingThresholdCents
      ? Math.max(0, settings.freeShippingThresholdCents - opts.subtotalCents)
      : null,
    giftNotesEnabled: settings.giftNotesEnabled,
  };
}

storefrontAdvancedRouter.get('/settings', async (req, res, next) => {
  try {
    res.json(await getSettings(tid(req)));
  } catch (e) {
    next(e);
  }
});

storefrontAdvancedRouter.get('/search/suggest', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ products: [], categories: [] });
    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: {
          tenantId: tid(req),
          status: 'active',
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { tags: { has: q.toLowerCase() } },
            { vendor: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          media: true,
          variants: { where: { isActive: true }, take: 1, select: { priceCents: true } },
        },
        take: 8,
      }),
      prisma.category.findMany({
        where: { tenantId: tid(req), isActive: true, name: { contains: q, mode: 'insensitive' } },
        take: 5,
      }),
    ]);
    res.json({ products, categories });
  } catch (e) {
    next(e);
  }
});

storefrontAdvancedRouter.get('/collections/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const pieceMap: Record<string, { tag: string; name: string; description: string }> = {
      '1-piece': { tag: '1-piece', name: '1 Piece', description: 'Single unstitched shirts.' },
      '2-piece': { tag: '2-piece', name: '2 Piece', description: 'Unstitched shirt and trouser sets.' },
      '3-piece': { tag: '3-piece', name: '3 Piece', description: 'Unstitched shirt, trouser and dupatta ensembles.' },
      dupatta: { tag: 'dupatta', name: 'Dupattas', description: 'Standalone dupattas in chiffon, silk and organza.' },
      dupattas: { tag: 'dupatta', name: 'Dupattas', description: 'Standalone dupattas in chiffon, silk and organza.' },
    };

    const category = await prisma.category.findFirst({
      where: { tenantId: tid(req), slug, isActive: true },
    });

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
        where: { tenantId: tid(req), status: 'active' },
        include,
        orderBy: { createdAt: 'desc' },
        take: 16,
      });
    } else if (pieceMap[slug]) {
      const meta = pieceMap[slug];
      collection = { name: meta.name, slug, description: meta.description };
      products = await prisma.product.findMany({
        where: {
          tenantId: tid(req),
          status: 'active',
          OR: [
            { tags: { has: meta.tag } },
            { pieceType: pieceFilterEnum(meta.tag) ?? 'THREE_PIECE' },
          ],
        },
        include,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      });
    } else {
      const found = assertFound(category);
      collection = found;
      products = await prisma.product.findMany({
        where: { tenantId: tid(req), status: 'active', categoryId: found.id },
        include,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      });
    }

    const sales = await loadTenantSales(tid(req));
    res.json({
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
    });
  } catch (e) {
    next(e);
  }
});

storefrontAdvancedRouter.get('/featured', async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { tenantId: tid(req), status: 'active', featured: true },
      include: { variants: { where: { isActive: true }, take: 1 }, category: true },
      take: 12,
    });
    res.json(products);
  } catch (e) {
    next(e);
  }
});

storefrontAdvancedRouter.post('/stock-notify', async (req, res, next) => {
  try {
    const body = z.object({ variantId: z.string().uuid(), email: z.string().email() }).parse(req.body);
    const variant = assertFound(
      await prisma.productVariant.findFirst({ where: { id: body.variantId, tenantId: tid(req) } }),
    );
    await prisma.stockNotification.upsert({
      where: {
        tenantId_variantId_email: {
          tenantId: tid(req),
          variantId: variant.id,
          email: body.email,
        },
      },
      create: { tenantId: tid(req), variantId: variant.id, email: body.email },
      update: { notified: false },
    });
    res.json({ ok: true, message: 'We will email you when this item is back in stock.' });
  } catch (e) {
    next(e);
  }
});

storefrontAdvancedRouter.get('/cart/upsells', async (req, res, next) => {
  try {
    const sessionToken = req.headers['x-cart-session'] as string | undefined;
    const cart = await prisma.cart.findFirst({
      where: { tenantId: tid(req), ...(sessionToken ? { sessionToken } : {}) },
      include: { items: true },
      orderBy: { updatedAt: 'desc' },
    });
    const productIds = cart?.items.length
      ? (
          await prisma.productVariant.findMany({
            where: { id: { in: cart.items.map((i) => i.variantId) } },
            select: { productId: true },
          })
        ).map((v) => v.productId)
      : [];
    let upsells = await prisma.product.findMany({
      where: {
        tenantId: tid(req),
        status: 'active',
        featured: true,
        NOT: productIds.length ? { id: { in: productIds } } : undefined,
      },
      include: { variants: { where: { isActive: true }, take: 1 } },
      take: 4,
    });
    if (!upsells.length) {
      upsells = await prisma.product.findMany({
        where: {
          tenantId: tid(req),
          status: 'active',
          NOT: productIds.length ? { id: { in: productIds } } : undefined,
        },
        include: { variants: { where: { isActive: true }, take: 1 } },
        take: 4,
      });
    }
    res.json(upsells);
  } catch (e) {
    next(e);
  }
});

storefrontAdvancedRouter.get('/tags/:tag', async (req, res, next) => {
  try {
    const tag = req.params.tag.toLowerCase();
    const products = await prisma.product.findMany({
      where: { tenantId: tid(req), status: 'active', tags: { has: tag } },
      include: { variants: { where: { isActive: true }, take: 1 }, category: true },
    });
    res.json({ tag, products });
  } catch (e) {
    next(e);
  }
});

// —— Admin advanced ——
adminAdvancedRouter.get('/settings', async (req, res, next) => {
  try {
    res.json(await getSettings(tid(req)));
  } catch (e) {
    next(e);
  }
});

adminAdvancedRouter.put('/settings', requirePermissions('settings.write'), async (req, res, next) => {
  try {
    const body = z
      .object({
        announcementEnabled: z.boolean().optional(),
        announcementText: z.string().optional(),
        freeShippingThresholdCents: z.number().int().nullable().optional(),
        lowStockThreshold: z.number().int().optional(),
        giftNotesEnabled: z.boolean().optional(),
        supportEmail: z.string().email().optional().nullable(),
        currency: z.enum(STORE_CURRENCY_CODES).optional(),
      })
      .parse(req.body);
    const settings = await prisma.storeSettings.upsert({
      where: { tenantId: tid(req) },
      create: { tenantId: tid(req), ...body },
      update: body,
    });
    if (body.currency) {
      await syncDefaultCurrency(tid(req), body.currency);
    }
    res.json(settings);
  } catch (e) {
    next(e);
  }
});

adminAdvancedRouter.get('/discount-rules', async (req, res, next) => {
  try {
    res.json(await prisma.discountRule.findMany({ where: { tenantId: tid(req) }, orderBy: { createdAt: 'desc' } }));
  } catch (e) {
    next(e);
  }
});

adminAdvancedRouter.post('/discount-rules', requirePermissions('coupons.write'), async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string(),
        type: z.enum(['percent_off_order', 'fixed_off_order', 'free_shipping']),
        value: z.number().int().nonnegative().default(0),
        minSubtotalCents: z.number().int().nonnegative().default(0),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);
    res.status(201).json(await prisma.discountRule.create({ data: { tenantId: tid(req), ...body } }));
  } catch (e) {
    next(e);
  }
});

adminAdvancedRouter.patch('/discount-rules/:id', requirePermissions('coupons.write'), async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().optional(),
        type: z.enum(['percent_off_order', 'fixed_off_order', 'free_shipping']).optional(),
        value: z.number().int().nonnegative().optional(),
        minSubtotalCents: z.number().int().nonnegative().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);
    const existing = assertFound(
      await prisma.discountRule.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
    );
    res.json(await prisma.discountRule.update({ where: { id: existing.id }, data: body }));
  } catch (e) {
    next(e);
  }
});

adminAdvancedRouter.delete('/discount-rules/:id', requirePermissions('coupons.write'), async (req, res, next) => {
  try {
    const n = await prisma.discountRule.deleteMany({ where: { id: req.params.id, tenantId: tid(req) } });
    if (!n.count) throw new AppError(404, 'Discount rule not found');
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

adminAdvancedRouter.get('/orders/:id', requireFeatures('orders.management'), async (req, res, next) => {
  try {
    res.json(
      assertFound(
        await prisma.order.findFirst({
          where: { id: req.params.id, tenantId: tid(req) },
          include: {
            lines: true,
            customer: true,
            payments: true,
            shipments: true,
          },
        }),
      ),
    );
  } catch (e) {
    next(e);
  }
});

adminAdvancedRouter.post(
  '/orders/:id/fulfill',
  requireFeatures('orders.management'),
  requirePermissions('orders.write'),
  async (req, res, next) => {
    try {
      const body = z
        .object({
          carrier: z.string().optional(),
          trackingNumber: z.string().optional(),
          trackingUrl: z.string().optional(),
          notes: z.string().optional(),
        })
        .parse(req.body);
      const order = assertFound(
        await prisma.order.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
      );
      const shipment = await prisma.shipment.create({
        data: {
          tenantId: tid(req),
          orderId: order.id,
          carrier: body.carrier || 'Standard',
          trackingNumber: body.trackingNumber,
          trackingUrl: body.trackingUrl,
          notes: body.notes,
          status: 'shipped',
          shippedAt: new Date(),
        },
      });
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { status: 'fulfilled' },
        include: { shipments: true, lines: true },
      });
      res.json({ order: updated, shipment });
    } catch (e) {
      next(e);
    }
  },
);

adminAdvancedRouter.post(
  '/orders/:id/refund',
  requireFeatures('orders.refunds'),
  requirePermissions('orders.refund'),
  async (req, res, next) => {
    try {
      const order = assertFound(
        await prisma.order.findFirst({
          where: { id: req.params.id, tenantId: tid(req) },
          include: { payments: true, lines: true },
        }),
      );
      await prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id: order.id }, data: { status: 'refunded' } });
        for (const p of order.payments) {
          await tx.payment.update({ where: { id: p.id }, data: { status: 'refunded' } });
        }
        for (const line of order.lines) {
          if (!line.variantId) continue;
          const inv = await tx.inventoryItem.findFirst({
            where: { tenantId: tid(req), variantId: line.variantId },
          });
          if (inv) {
            await tx.inventoryItem.update({
              where: { id: inv.id },
              data: { quantity: inv.quantity + line.quantity },
            });
          }
        }
      });
      res.json(await prisma.order.findUnique({ where: { id: order.id }, include: { payments: true } }));
    } catch (e) {
      next(e);
    }
  },
);

adminAdvancedRouter.get('/products/:id', requireFeatures('catalog.products'), async (req, res, next) => {
  try {
    res.json(
      assertFound(
        await prisma.product.findFirst({
          where: { id: req.params.id, tenantId: tid(req) },
          include: {
            variants: { include: { inventory: true } },
            category: true,
            upsellsFrom: { include: { upsellProduct: true } },
          },
        }),
      ),
    );
  } catch (e) {
    next(e);
  }
});

adminAdvancedRouter.put(
  '/products/:id/full',
  requireFeatures('catalog.products'),
  requirePermissions('products.write'),
  async (req, res, next) => {
    try {
      const body = z
        .object({
          name: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(['draft', 'active', 'archived']).optional(),
          categoryId: z.string().uuid().nullable().optional(),
          media: z.array(z.any()).optional(),
          tags: z.array(z.string()).optional(),
          vendor: z.string().optional().nullable(),
          seoTitle: z.string().optional().nullable(),
          seoDescription: z.string().optional().nullable(),
          featured: z.boolean().optional(),
          pieceType: z.string().optional(),
          weightGrams: z.number().int().optional().nullable(),
          variants: z
            .array(
              z.object({
                id: z.string().uuid().optional(),
                sku: z.string(),
                priceCents: z.number().int().positive(),
                compareAtCents: z.number().int().optional().nullable(),
                attributeValues: z.record(z.string()).optional(),
                quantity: z.number().int().nonnegative().optional(),
                isActive: z.boolean().optional(),
              }),
            )
            .optional(),
        })
        .parse(req.body);

      const existing = assertFound(
        await prisma.product.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
      );

      const { variants, pieceType: pieceTypeRaw, ...productData } = body;
      const pieceKey = parsePieceTypeKey(pieceTypeRaw);
      if (!pieceKey) {
        throw new AppError(400, 'Piece Type is required and must be 1 Piece, 2 Piece, 3 Piece, or Dupatta');
      }
      const tags = productData.tags?.map((t) => t.toLowerCase().trim()).filter(Boolean) || existing.tags;
      const nextTags = pieceKey
        ? [...new Set([...tags.filter((t) => !['1-piece', '2-piece', '3-piece', 'dupatta', 'dupattas'].includes(t)), ...pieceTypeTags(pieceKey)])]
        : tags;
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          ...productData,
          tags: nextTags,
          ...(pieceKey ? { pieceType: pieceTypeToEnum(pieceKey) } : {}),
        },
      });

      if (variants) {
        for (const v of variants) {
          if (v.id) {
            await prisma.productVariant.updateMany({
              where: { id: v.id, tenantId: tid(req) },
              data: {
                sku: v.sku,
                priceCents: v.priceCents,
                compareAtCents: v.compareAtCents ?? undefined,
                attributeValues: v.attributeValues || {},
                isActive: v.isActive ?? true,
              },
            });
            if (v.quantity != null) {
              const inv = await prisma.inventoryItem.findFirst({
                where: { variantId: v.id, tenantId: tid(req) },
              });
              if (inv) {
                await prisma.inventoryItem.update({ where: { id: inv.id }, data: { quantity: v.quantity } });
              } else {
                await prisma.inventoryItem.create({
                  data: { tenantId: tid(req), variantId: v.id, quantity: v.quantity },
                });
              }
            }
          } else {
            await prisma.productVariant.create({
              data: {
                tenantId: tid(req),
                productId: existing.id,
                sku: v.sku,
                priceCents: v.priceCents,
                compareAtCents: v.compareAtCents ?? undefined,
                attributeValues: v.attributeValues || {},
                inventory: { create: { tenantId: tid(req), quantity: v.quantity || 0 } },
              },
            });
          }
        }
      }

      res.json(
        await prisma.product.findUnique({
          where: { id: existing.id },
          include: { variants: { include: { inventory: true } }, category: true },
        }),
      );
    } catch (e) {
      next(e);
    }
  },
);

adminAdvancedRouter.get('/export/products', requireFeatures('catalog.products'), async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { tenantId: tid(req) },
      include: { variants: { include: { inventory: true } }, category: true },
    });
    const rows = [
      ['id', 'name', 'slug', 'status', 'category', 'tags', 'sku', 'price', 'qty', 'vendor'].join(','),
      ...products.flatMap((p) =>
        p.variants.map((v) =>
          [
            p.id,
            JSON.stringify(p.name),
            p.slug,
            p.status,
            p.category?.slug || '',
            p.tags.join('|'),
            v.sku,
            (v.priceCents / 100).toFixed(2),
            v.inventory[0]?.quantity ?? 0,
            p.vendor || '',
          ].join(','),
        ),
      ),
    ];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
    res.send(rows.join('\n'));
  } catch (e) {
    next(e);
  }
});
