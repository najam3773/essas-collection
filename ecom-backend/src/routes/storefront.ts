import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/db.js';
import { resolveTenant, requireTenant } from '../middleware/tenant.js';
import { AppError, assertFound } from '../lib/errors.js';
import { hashPassword, signToken } from '../lib/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { saleUnitPriceCents } from '../lib/sale-pricing.js';
import { storefrontAddressSchema } from '../lib/storefront-address.js';

export const storefrontRouter = Router();
storefrontRouter.use(resolveTenant);

storefrontRouter.get('/resolve-host', async (req, res, next) => {
  try {
    const { getStore } = await import('../lib/store.js');
    const tenant = await getStore();
    res.json({
      surface: 'store',
      host: String(req.headers.host || ''),
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        customDomain: tenant.customDomain,
        subdomain: tenant.subdomain,
      },
    });
  } catch (e) {
    next(e);
  }
});

storefrontRouter.get('/context', requireTenant, async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: req.tenantId! },
      include: {
        themeConfig: { include: { theme: true } },
        pageSections: true,
        menus: { include: { items: { orderBy: { sortOrder: 'asc' } } } },
      },
    });
    const entitlements = await prisma.tenantEntitlement.findMany({
      where: { tenantId: tenant.id, enabled: true },
    });
    res.json({
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
    });
  } catch (e) {
    next(e);
  }
});

storefrontRouter.get('/products', requireTenant, async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const products = await prisma.product.findMany({
      where: {
        tenantId: req.tenantId!,
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
    res.json(products);
  } catch (e) {
    next(e);
  }
});

storefrontRouter.get('/products/:slug', requireTenant, async (req, res, next) => {
  try {
    const product = assertFound(
      await prisma.product.findFirst({
        where: { tenantId: req.tenantId!, slug: req.params.slug, status: 'active' },
        include: {
          variants: { where: { isActive: true }, include: { inventory: true } },
          category: true,
        },
      }),
    );
    res.json(product);
  } catch (e) {
    next(e);
  }
});

storefrontRouter.get('/categories', requireTenant, async (req, res, next) => {
  try {
    res.json(
      await prisma.category.findMany({
        where: { tenantId: req.tenantId!, isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
    );
  } catch (e) {
    next(e);
  }
});

async function getOrCreateCart(tenantId: string, sessionToken?: string, customerId?: string) {
  if (customerId) {
    let cart = await prisma.cart.findFirst({
      where: { tenantId, customerId },
      include: { items: { include: { variant: { include: { product: true } } } } },
      orderBy: { updatedAt: 'desc' },
    });
    if (!cart) {
      const settings = await prisma.storeSettings.findUnique({ where: { tenantId } });
      cart = await prisma.cart.create({
        data: { tenantId, customerId, currency: settings?.currency || 'USD' },
        include: { items: { include: { variant: { include: { product: true } } } } },
      });
    }
    return cart;
  }
  const token = sessionToken || randomUUID();
  let cart = await prisma.cart.findFirst({
    where: { tenantId, sessionToken: token },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });
  if (!cart) {
    const settings = await prisma.storeSettings.findUnique({ where: { tenantId } });
    cart = await prisma.cart.create({
      data: { tenantId, sessionToken: token, currency: settings?.currency || 'USD' },
      include: { items: { include: { variant: { include: { product: true } } } } },
    });
  }
  return cart;
}

storefrontRouter.get('/cart', requireTenant, async (req, res, next) => {
  try {
    const sessionToken = (req.headers['x-cart-session'] as string) || undefined;
    const customerId = req.auth?.realm === 'customer' ? req.auth.sub : undefined;
    const cart = await getOrCreateCart(req.tenantId!, sessionToken, customerId);
    res.json(cart);
  } catch (e) {
    next(e);
  }
});

storefrontRouter.post('/cart/items', requireTenant, async (req, res, next) => {
  try {
    const body = z
      .object({ variantId: z.string().uuid(), quantity: z.number().int().positive().default(1) })
      .parse(req.body);
    const sessionToken = (req.headers['x-cart-session'] as string) || undefined;
    const variant = assertFound(
      await prisma.productVariant.findFirst({
        where: { id: body.variantId, tenantId: req.tenantId!, isActive: true },
        include: { product: { select: { id: true, categoryId: true } } },
      }),
    );
    const unitPriceCents = await saleUnitPriceCents(
      req.tenantId!,
      { id: variant.product.id, categoryId: variant.product.categoryId },
      variant.priceCents,
    );
    const cart = await getOrCreateCart(req.tenantId!, sessionToken);
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
    });
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + body.quantity, unitPriceCents },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          tenantId: req.tenantId!,
          cartId: cart.id,
          variantId: variant.id,
          quantity: body.quantity,
          unitPriceCents,
        },
      });
    }
    const updated = await prisma.cart.findUniqueOrThrow({
      where: { id: cart.id },
      include: { items: { include: { variant: { include: { product: true } } } } },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

storefrontRouter.patch('/cart/items/:id', requireTenant, async (req, res, next) => {
  try {
    const body = z.object({ quantity: z.number().int().nonnegative() }).parse(req.body);
    const item = assertFound(
      await prisma.cartItem.findFirst({ where: { id: req.params.id, tenantId: req.tenantId! } }),
    );
    if (body.quantity === 0) {
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: body.quantity } });
    }
    const cart = await prisma.cart.findUniqueOrThrow({
      where: { id: item.cartId },
      include: { items: { include: { variant: { include: { product: true } } } } },
    });
    res.json(cart);
  } catch (e) {
    next(e);
  }
});

storefrontRouter.post('/checkout', requireTenant, async (req, res, next) => {
  try {
    const body = z
      .object({
        cartId: z.string().uuid(),
        email: z.string().email().optional(),
        couponCode: z.string().optional(),
        giftNote: z.string().optional(),
        shippingAddress: storefrontAddressSchema,
        mockPay: z.boolean().default(true),
      })
      .parse(req.body);

    const cart = assertFound(
      await prisma.cart.findFirst({
        where: { id: body.cartId, tenantId: req.tenantId! },
        include: { items: { include: { variant: { include: { product: true } } } } },
      }),
    );
    if (!cart.items.length) throw new AppError(400, 'Cart is empty');

    let customerId = req.auth?.realm === 'customer' ? req.auth.sub : cart.customerId;
    if (!customerId && body.email) {
      const customer = await prisma.customer.upsert({
        where: { tenantId_email: { tenantId: req.tenantId!, email: body.email } },
        create: { tenantId: req.tenantId!, email: body.email, fullName: body.email.split('@')[0] },
        update: {},
      });
      customerId = customer.id;
    }

    const subtotal = cart.items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
    const { computePricing } = await import('./advanced.js');
    const pricing = await computePricing({
      tenantId: req.tenantId!,
      subtotalCents: subtotal,
      country: body.shippingAddress.country,
      couponCode: body.couponCode,
    });
    const { shippingCents: shipping, taxCents: tax, discountCents: discount, totalCents: total, couponCode } = pricing;
    let couponId: string | undefined;
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { tenantId_code: { tenantId: req.tenantId!, code: couponCode } },
      });
      couponId = coupon?.id;
    }
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    const storeSettings = await prisma.storeSettings.findUnique({ where: { tenantId: req.tenantId! } });
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          tenantId: req.tenantId!,
          customerId,
          orderNumber,
          status: body.mockPay ? 'paid' : 'pending',
          currency: storeSettings?.currency || cart.currency || 'USD',
          subtotalCents: subtotal,
          shippingCents: shipping,
          taxCents: tax,
          discountCents: discount,
          couponCode: couponCode || undefined,
          giftNote: body.giftNote,
          totalCents: total,
          shippingAddress: body.shippingAddress,
          notes: pricing.autoRuleName ? `Promo: ${pricing.autoRuleName}` : undefined,
          lines: {
            create: cart.items.map((i) => ({
              tenantId: req.tenantId!,
              variantId: i.variantId,
              productName: i.variant.product.name,
              sku: i.variant.sku,
              quantity: i.quantity,
              unitPriceCents: i.unitPriceCents,
              attributeValues: i.variant.attributeValues as object,
            })),
          },
          payments: {
            create: {
              tenantId: req.tenantId!,
              provider: 'cod',
              providerRef: `cod_${randomUUID()}`,
              amountCents: total,
              status: body.mockPay ? 'succeeded' : 'pending',
              metadata: { discountCents: discount, couponId, autoRule: pricing.autoRuleName },
            },
          },
        },
        include: { lines: true, payments: true },
      });

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      for (const item of cart.items) {
        const inv = await tx.inventoryItem.findFirst({
          where: { tenantId: req.tenantId!, variantId: item.variantId },
        });
        if (inv) {
          if (inv.quantity < item.quantity) {
            throw new AppError(400, `Insufficient stock for ${item.variant.sku}`);
          }
          await tx.inventoryItem.update({
            where: { id: inv.id },
            data: { quantity: inv.quantity - item.quantity },
          });
        }
      }
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    });

    res.status(201).json(order);
  } catch (e) {
    next(e);
  }
});

storefrontRouter.post('/register', requireTenant, async (req, res, next) => {
  try {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
        fullName: z.string().min(1),
      })
      .parse(req.body);
    const customer = await prisma.customer.create({
      data: {
        tenantId: req.tenantId!,
        email: body.email,
        fullName: body.fullName,
        passwordHash: await hashPassword(body.password),
      },
    });
    const token = signToken({
      sub: customer.id,
      realm: 'customer',
      email: customer.email,
      tenantId: req.tenantId!,
    });
    res.status(201).json({
      token,
      customer: { id: customer.id, email: customer.email, fullName: customer.fullName },
    });
  } catch (e) {
    next(e);
  }
});

storefrontRouter.get('/orders', requireTenant, requireAuth('customer'), async (req, res, next) => {
  try {
    res.json(
      await prisma.order.findMany({
        where: { tenantId: req.tenantId!, customerId: req.auth!.sub },
        include: { lines: true },
        orderBy: { createdAt: 'desc' },
      }),
    );
  } catch (e) {
    next(e);
  }
});

storefrontRouter.get('/extensions', requireTenant, async (req, res, next) => {
  try {
    const entitled = await prisma.tenantEntitlement.findMany({
      where: { tenantId: req.tenantId!, enabled: true },
    });
    const keys = new Set(entitled.map((e) => e.featureKey));
    const services = await prisma.featureService.findMany({ where: { isActive: true } });
    const widgets = services
      .filter((s) => keys.has(s.entitlementKey))
      .flatMap((s) => {
        const exts = s.storefrontExtensions as Array<{ slot: string; bundle: string }>;
        return exts.map((e) => ({
          serviceKey: s.serviceKey,
          slot: e.slot,
          bundle: e.bundle,
          name: s.name,
        }));
      });
    res.json({ widgets });
  } catch (e) {
    next(e);
  }
});

storefrontRouter.get('/pages/:slug', requireTenant, async (req, res, next) => {
  try {
    res.json(
      assertFound(
        await prisma.contentPage.findFirst({
          where: { tenantId: req.tenantId!, slug: req.params.slug, status: 'published' },
        }),
      ),
    );
  } catch (e) {
    next(e);
  }
});
