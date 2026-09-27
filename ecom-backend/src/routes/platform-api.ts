import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { AppError, assertFound } from '../lib/errors.js';

/**
 * Platform API for pluggable feature services (m2m).
 * Auth: Bearer PLATFORM_API_KEY or feature-service JWT in production.
 */
export const platformApiRouter = Router();

platformApiRouter.use((req, _res, next) => {
  const key = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
  const expected = process.env.PLATFORM_API_KEY || 'dev-platform-api-key';
  if (key !== expected) return next(new AppError(401, 'Invalid platform API key'));
  next();
});

platformApiRouter.get('/tenants/:id/context', async (req, res, next) => {
  try {
    const tenant = assertFound(
      await prisma.tenant.findUnique({
        where: { id: req.params.id },
        include: {
          themeConfig: true,
          entitlements: { where: { enabled: true } },
        },
      }),
    );
    res.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      branding: tenant.themeConfig,
      entitlements: tenant.entitlements.map((e) => e.featureKey),
    });
  } catch (e) {
    next(e);
  }
});

platformApiRouter.get('/products/:id', async (req, res, next) => {
  try {
    res.json(
      assertFound(
        await prisma.product.findUnique({
          where: { id: req.params.id },
          include: { variants: true, category: true },
        }),
      ),
    );
  } catch (e) {
    next(e);
  }
});

platformApiRouter.get('/carts/:id', async (req, res, next) => {
  try {
    res.json(
      assertFound(
        await prisma.cart.findUnique({
          where: { id: req.params.id },
          include: { items: { include: { variant: { include: { product: true } } } } },
        }),
      ),
    );
  } catch (e) {
    next(e);
  }
});

platformApiRouter.post('/carts/:id/items', async (req, res, next) => {
  try {
    const body = z
      .object({ variantId: z.string().uuid(), quantity: z.number().int().positive() })
      .parse(req.body);
    const cart = assertFound(await prisma.cart.findUnique({ where: { id: req.params.id } }));
    const variant = assertFound(
      await prisma.productVariant.findFirst({
        where: { id: body.variantId, tenantId: cart.tenantId },
      }),
    );
    await prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
      create: {
        tenantId: cart.tenantId,
        cartId: cart.id,
        variantId: variant.id,
        quantity: body.quantity,
        unitPriceCents: variant.priceCents,
      },
      update: { quantity: { increment: body.quantity } },
    });
    res.json(
      await prisma.cart.findUnique({
        where: { id: cart.id },
        include: { items: true },
      }),
    );
  } catch (e) {
    next(e);
  }
});

platformApiRouter.post('/orders', async (req, res, next) => {
  try {
    const body = z
      .object({
        tenantId: z.string().uuid(),
        customerId: z.string().uuid().optional(),
        lines: z.array(
          z.object({
            variantId: z.string().uuid(),
            quantity: z.number().int().positive(),
          }),
        ),
        shippingAddress: z.record(z.any()).optional(),
        source: z.string().default('feature-service'),
      })
      .parse(req.body);

    const variants = await prisma.productVariant.findMany({
      where: { id: { in: body.lines.map((l) => l.variantId) }, tenantId: body.tenantId },
      include: { product: true },
    });
    const byId = new Map(variants.map((v) => [v.id, v]));
    let subtotal = 0;
    const lineData = body.lines.map((l) => {
      const v = byId.get(l.variantId);
      if (!v) throw new AppError(400, `Variant ${l.variantId} not found`);
      subtotal += v.priceCents * l.quantity;
      return {
        tenantId: body.tenantId,
        variantId: v.id,
        productName: v.product.name,
        sku: v.sku,
        quantity: l.quantity,
        unitPriceCents: v.priceCents,
        attributeValues: v.attributeValues as object,
      };
    });

    const order = await prisma.order.create({
      data: {
        tenantId: body.tenantId,
        customerId: body.customerId,
        orderNumber: `FS-${Date.now().toString(36).toUpperCase()}`,
        status: 'paid',
        subtotalCents: subtotal,
        totalCents: subtotal,
        shippingAddress: body.shippingAddress,
        notes: `Created via Platform API (${body.source})`,
        lines: { create: lineData },
        payments: {
          create: {
            tenantId: body.tenantId,
            provider: 'platform-api',
            amountCents: subtotal,
            status: 'succeeded',
            metadata: { source: body.source },
          },
        },
      },
      include: { lines: true },
    });
    res.status(201).json(order);
  } catch (e) {
    next(e);
  }
});
