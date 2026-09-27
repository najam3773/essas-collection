import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { prisma } from '../lib/db.js';
import type { Prisma } from '@prisma/client';
import { resolveTenant, requireTenant } from '../middleware/tenant.js';
import { requireAuth, requirePermissions } from '../middleware/auth.js';
import { loadTenantBootstrap } from '../middleware/bootstrap.js';
import { AppError, assertFound } from '../lib/errors.js';
import { storePublicUrl } from '../lib/domains.js';

export const storefrontPaidRouter = Router();
storefrontPaidRouter.use(resolveTenant, requireTenant);

export const adminPaidRouter = Router();
adminPaidRouter.use(requireAuth('tenant'), loadTenantBootstrap);

function tid(req: { tenantId?: string }) {
  return req.tenantId!;
}

function code(prefix = 'GC') {
  return `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

/* ─── Gift cards ─── */
adminPaidRouter.get('/gift-cards', requirePermissions('orders.read'), async (req, res, next) => {
  try {
    res.json(await prisma.giftCard.findMany({ where: { tenantId: tid(req) }, orderBy: { createdAt: 'desc' } }));
  } catch (e) { next(e); }
});

adminPaidRouter.post('/gift-cards', requirePermissions('orders.write'), async (req, res, next) => {
  try {
    const body = z.object({
      initialCents: z.number().int().positive(),
      note: z.string().optional(),
      customerId: z.string().uuid().optional(),
      code: z.string().optional(),
    }).parse(req.body);
    const card = await prisma.giftCard.create({
      data: {
        tenantId: tid(req),
        code: body.code || code('GC'),
        initialCents: body.initialCents,
        balanceCents: body.initialCents,
        note: body.note,
        customerId: body.customerId,
      },
    });
    await prisma.giftCardTransaction.create({
      data: {
        tenantId: tid(req),
        giftCardId: card.id,
        amountCents: body.initialCents,
        type: 'issue',
        note: 'Issued',
      },
    });
    res.status(201).json(card);
  } catch (e) { next(e); }
});

adminPaidRouter.patch('/gift-cards/:id', requirePermissions('orders.write'), async (req, res, next) => {
  try {
    const body = z
      .object({
        note: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        balanceCents: z.number().int().nonnegative().optional(),
      })
      .parse(req.body);
    const existing = assertFound(
      await prisma.giftCard.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
    );
    const updated = await prisma.giftCard.update({ where: { id: existing.id }, data: body });
    if (body.balanceCents != null && body.balanceCents !== existing.balanceCents) {
      await prisma.giftCardTransaction.create({
        data: {
          tenantId: tid(req),
          giftCardId: existing.id,
          amountCents: body.balanceCents - existing.balanceCents,
          type: 'adjustment',
          note: 'Admin balance adjustment',
        },
      });
    }
    res.json(updated);
  } catch (e) { next(e); }
});

adminPaidRouter.delete('/gift-cards/:id', requirePermissions('orders.write'), async (req, res, next) => {
  try {
    const existing = assertFound(
      await prisma.giftCard.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
    );
    await prisma.giftCardTransaction.deleteMany({ where: { giftCardId: existing.id, tenantId: tid(req) } });
    await prisma.giftCard.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

storefrontPaidRouter.post('/gift-cards/lookup', async (req, res, next) => {
  try {
    const body = z.object({ code: z.string().min(3) }).parse(req.body);
    const card = assertFound(
      await prisma.giftCard.findFirst({
        where: { tenantId: tid(req), code: body.code.toUpperCase(), isActive: true },
      }),
    );
    res.json({ code: card.code, balanceCents: card.balanceCents, currency: card.currency });
  } catch (e) { next(e); }
});

/* ─── Bundles ─── */
adminPaidRouter.get('/bundles', requirePermissions('products.read'), async (req, res, next) => {
  try {
    res.json(await prisma.productBundle.findMany({
      where: { tenantId: tid(req) },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    }));
  } catch (e) { next(e); }
});

adminPaidRouter.post('/bundles', requirePermissions('products.write'), async (req, res, next) => {
  try {
    const body = z.object({
      name: z.string(),
      slug: z.string(),
      description: z.string().optional(),
      priceCents: z.number().int().positive(),
      compareAtCents: z.number().int().optional(),
      imageUrl: z.string().optional(),
      items: z.array(z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().int().positive().default(1),
      })).min(1),
    }).parse(req.body);
    const bundle = await prisma.productBundle.create({
      data: {
        tenantId: tid(req),
        name: body.name,
        slug: body.slug,
        description: body.description,
        priceCents: body.priceCents,
        compareAtCents: body.compareAtCents,
        imageUrl: body.imageUrl,
        items: {
          create: body.items.map((i) => ({
            tenantId: tid(req),
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        },
      },
      include: { items: true },
    });
    res.status(201).json(bundle);
  } catch (e) { next(e); }
});

storefrontPaidRouter.get('/bundles', async (req, res, next) => {
  try {
    res.json(await prisma.productBundle.findMany({
      where: { tenantId: tid(req), isActive: true },
      include: { items: true },
    }));
  } catch (e) { next(e); }
});

storefrontPaidRouter.post('/bundles/:slug/add-to-cart', async (req, res, next) => {
  try {
    const bundle = assertFound(await prisma.productBundle.findFirst({
      where: { tenantId: tid(req), slug: req.params.slug, isActive: true },
      include: { items: true },
    }));
    const sessionToken = (req.headers['x-cart-session'] as string) || randomBytes(8).toString('hex');
    let cart = await prisma.cart.findFirst({ where: { tenantId: tid(req), sessionToken } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { tenantId: tid(req), sessionToken } });
    }
    for (const item of bundle.items) {
      let variantId = item.variantId;
      if (!variantId) {
        const v = await prisma.productVariant.findFirst({ where: { productId: item.productId, isActive: true } });
        if (!v) continue;
        variantId = v.id;
      }
      const existing = await prisma.cartItem.findUnique({
        where: { cartId_variantId: { cartId: cart.id, variantId } },
      });
      const unit = Math.round(bundle.priceCents / Math.max(1, bundle.items.reduce((s, i) => s + i.quantity, 0)));
      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.quantity },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            tenantId: tid(req),
            cartId: cart.id,
            variantId,
            quantity: item.quantity,
            unitPriceCents: unit,
          },
        });
      }
    }
    res.json({ ok: true, cartId: cart.id, sessionToken });
  } catch (e) { next(e); }
});

/* ─── Add-ons & qty breaks ─── */
adminPaidRouter.post('/products/:id/addons', requirePermissions('products.write'), async (req, res, next) => {
  try {
    const body = z.object({
      name: z.string(),
      priceCents: z.number().int().nonnegative().default(0),
      isRequired: z.boolean().optional(),
    }).parse(req.body);
    res.status(201).json(await prisma.productAddon.create({
      data: {
        tenantId: tid(req),
        productId: req.params.id,
        name: body.name,
        priceCents: body.priceCents,
        isRequired: body.isRequired ?? false,
      },
    }));
  } catch (e) { next(e); }
});

adminPaidRouter.post('/products/:id/quantity-breaks', requirePermissions('products.write'), async (req, res, next) => {
  try {
    const body = z.object({
      minQty: z.number().int().positive(),
      maxQty: z.number().int().optional(),
      percentOff: z.number().int().nonnegative().default(0),
      priceCents: z.number().int().optional(),
    }).parse(req.body);
    res.status(201).json(await prisma.quantityBreak.create({
      data: {
        tenantId: tid(req),
        productId: req.params.id,
        minQty: body.minQty,
        maxQty: body.maxQty,
        percentOff: body.percentOff,
        priceCents: body.priceCents,
      },
    }));
  } catch (e) { next(e); }
});

storefrontPaidRouter.get('/products/:id/commerce-extras', async (req, res, next) => {
  try {
    const [addons, breaks, plans] = await Promise.all([
      prisma.productAddon.findMany({ where: { tenantId: tid(req), productId: req.params.id, isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.quantityBreak.findMany({ where: { tenantId: tid(req), productId: req.params.id }, orderBy: { minQty: 'asc' } }),
      prisma.sellingPlan.findMany({ where: { tenantId: tid(req), productId: req.params.id, isActive: true } }),
    ]);
    res.json({ addons, quantityBreaks: breaks, sellingPlans: plans });
  } catch (e) { next(e); }
});

/* ─── Loyalty ─── */
adminPaidRouter.get('/loyalty', requirePermissions('customers.read'), async (req, res, next) => {
  try {
    const settings = await prisma.loyaltySettings.upsert({
      where: { tenantId: tid(req) },
      create: { tenantId: tid(req) },
      update: {},
    });
    const ledger = await prisma.loyaltyLedger.findMany({
      where: { tenantId: tid(req) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ settings, ledger });
  } catch (e) { next(e); }
});

adminPaidRouter.put('/loyalty', requirePermissions('customers.write'), async (req, res, next) => {
  try {
    const body = z.object({
      enabled: z.boolean().optional(),
      pointsPerDollar: z.number().int().optional(),
      redeemRateCents: z.number().int().optional(),
      minRedeemPoints: z.number().int().optional(),
      welcomePoints: z.number().int().optional(),
    }).parse(req.body);
    res.json(await prisma.loyaltySettings.upsert({
      where: { tenantId: tid(req) },
      create: { tenantId: tid(req), ...body },
      update: body,
    }));
  } catch (e) { next(e); }
});

storefrontPaidRouter.get('/loyalty/me', requireAuth('customer'), async (req, res, next) => {
  try {
    const customer = assertFound(await prisma.customer.findFirst({ where: { id: req.auth!.sub, tenantId: tid(req) } }));
    const settings = await prisma.loyaltySettings.findUnique({ where: { tenantId: tid(req) } });
    res.json({
      points: customer.loyaltyPoints,
      storeCreditCents: customer.storeCreditCents,
      referralCode: customer.referralCode,
      settings,
    });
  } catch (e) { next(e); }
});

/* ─── Abandoned carts ─── */
adminPaidRouter.get('/abandoned-carts', requirePermissions('orders.read'), async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
    const carts = await prisma.cart.findMany({
      where: {
        tenantId: tid(req),
        updatedAt: { lt: new Date(Date.now() - 1000 * 60 * 60) },
        items: { some: {} },
        OR: [{ abandonedEmailSentAt: null }, { abandonedEmailSentAt: { lt: since } }],
      },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        customer: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    res.json(carts);
  } catch (e) { next(e); }
});

adminPaidRouter.post('/abandoned-carts/:id/recover', requirePermissions('orders.write'), async (req, res, next) => {
  try {
    const cart = assertFound(await prisma.cart.findFirst({
      where: { id: req.params.id, tenantId: tid(req) },
      include: { customer: true, items: true },
    }));
    if (!cart.items.length) throw new AppError(400, 'Cart empty');
    const token = cart.recoveryToken || randomBytes(12).toString('hex');
    const email = cart.customer?.email || (req.body?.email as string);
    if (!email) throw new AppError(400, 'No email for recovery');
    const tenant = assertFound(await prisma.tenant.findUnique({ where: { id: tid(req) } }));
    const auto = await prisma.emailAutomation.findFirst({
      where: { tenantId: tid(req), type: 'abandoned_cart', isActive: true },
    });
    const recoveryUrl = `${storePublicUrl(tenant.customDomain, tenant.slug, '/cart')}?recover=${token}`;
    const subject = auto?.subject || 'You left something behind';
    const body = (auto?.bodyTemplate || 'Complete checkout: {{recovery_url}}')
      .replace('{{email}}', email)
      .replace('{{recovery_url}}', recoveryUrl)
      .replace('{{brand}}', tenant.name);
    await prisma.emailOutbox.create({
      data: {
        tenantId: tid(req),
        toEmail: email,
        subject,
        body,
        status: 'sent',
        sentAt: new Date(),
        meta: { cartId: cart.id, type: 'abandoned_cart' },
      },
    });
    await prisma.cart.update({
      where: { id: cart.id },
      data: { recoveryToken: token, abandonedEmailSentAt: new Date() },
    });
    res.json({ ok: true, recoveryUrl, emailed: email, recoveryToken: token });
  } catch (e) { next(e); }
});

storefrontPaidRouter.get('/cart/recover/:token', async (req, res, next) => {
  try {
    const cart = assertFound(await prisma.cart.findFirst({
      where: { tenantId: tid(req), recoveryToken: req.params.token },
      include: { items: { include: { variant: { include: { product: true } } } } },
    }));
    res.json(cart);
  } catch (e) { next(e); }
});

/* ─── B2B groups & wholesale ─── */
adminPaidRouter.get('/customer-groups', requirePermissions('customers.read'), async (req, res, next) => {
  try {
    res.json(await prisma.customerGroup.findMany({ where: { tenantId: tid(req) }, orderBy: { name: 'asc' } }));
  } catch (e) { next(e); }
});

adminPaidRouter.post('/customer-groups', requirePermissions('customers.write'), async (req, res, next) => {
  try {
    const body = z.object({
      name: z.string(),
      discountPercent: z.number().int().nonnegative().default(0),
      isB2b: z.boolean().optional(),
    }).parse(req.body);
    res.status(201).json(await prisma.customerGroup.create({
      data: {
        tenantId: tid(req),
        name: body.name,
        discountPercent: body.discountPercent,
        isB2b: body.isB2b ?? false,
      },
    }));
  } catch (e) { next(e); }
});

adminPaidRouter.post('/customers/:id/assign-group', requirePermissions('customers.write'), async (req, res, next) => {
  try {
    const body = z.object({ customerGroupId: z.string().uuid().nullable() }).parse(req.body);
    res.json(await prisma.customer.update({
      where: { id: req.params.id },
      data: { customerGroupId: body.customerGroupId },
    }));
  } catch (e) { next(e); }
});

adminPaidRouter.post('/customers/:id/store-credit', requirePermissions('customers.write'), async (req, res, next) => {
  try {
    const body = z.object({ amountCents: z.number().int(), note: z.string().optional() }).parse(req.body);
    const customer = assertFound(await prisma.customer.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }));
    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: { storeCreditCents: Math.max(0, customer.storeCreditCents + body.amountCents) },
    });
    res.json(updated);
  } catch (e) { next(e); }
});

/* ─── Currencies ─── */
adminPaidRouter.get('/currencies', requirePermissions('settings.write'), async (req, res, next) => {
  try {
    res.json(await prisma.storeCurrency.findMany({ where: { tenantId: tid(req) }, orderBy: { code: 'asc' } }));
  } catch (e) { next(e); }
});

adminPaidRouter.post('/currencies', requirePermissions('settings.write'), async (req, res, next) => {
  try {
    const body = z
      .object({
        code: z.string().length(3),
        name: z.string().min(1),
        rateToBase: z.number().positive().default(1),
        isDefault: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);
    const code = body.code.toUpperCase();
    if (body.isDefault) {
      await prisma.storeCurrency.updateMany({
        where: { tenantId: tid(req), isDefault: true },
        data: { isDefault: false },
      });
      await prisma.storeSettings.upsert({
        where: { tenantId: tid(req) },
        create: { tenantId: tid(req), currency: code },
        update: { currency: code },
      });
    }
    res.status(201).json(
      await prisma.storeCurrency.create({
        data: {
          tenantId: tid(req),
          code,
          name: body.name,
          rateToBase: body.rateToBase,
          isDefault: body.isDefault ?? false,
          isActive: body.isActive ?? true,
        },
      }),
    );
  } catch (e) { next(e); }
});

adminPaidRouter.patch('/currencies/:id', requirePermissions('settings.write'), async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().optional(),
        rateToBase: z.number().positive().optional(),
        isDefault: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);
    const existing = assertFound(
      await prisma.storeCurrency.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
    );
    if (body.isDefault) {
      await prisma.storeCurrency.updateMany({
        where: { tenantId: tid(req), isDefault: true, NOT: { id: existing.id } },
        data: { isDefault: false },
      });
      await prisma.storeSettings.upsert({
        where: { tenantId: tid(req) },
        create: { tenantId: tid(req), currency: existing.code },
        update: { currency: existing.code },
      });
    }
    if (body.isDefault === false && existing.isDefault) {
      throw new AppError(400, 'Set another currency as default before unsetting this one');
    }
    res.json(await prisma.storeCurrency.update({ where: { id: existing.id }, data: body }));
  } catch (e) { next(e); }
});

adminPaidRouter.delete('/currencies/:id', requirePermissions('settings.write'), async (req, res, next) => {
  try {
    const existing = assertFound(
      await prisma.storeCurrency.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
    );
    if (existing.isDefault) throw new AppError(400, 'Cannot delete the default currency');
    await prisma.storeCurrency.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

storefrontPaidRouter.get('/currencies', async (req, res, next) => {
  try {
    res.json(await prisma.storeCurrency.findMany({ where: { tenantId: tid(req), isActive: true } }));
  } catch (e) { next(e); }
});

/* ─── Fulfillment options ─── */
adminPaidRouter.get('/fulfillment-options', requirePermissions('settings.write'), async (req, res, next) => {
  try {
    res.json(await prisma.fulfillmentOption.findMany({ where: { tenantId: tid(req) } }));
  } catch (e) { next(e); }
});

storefrontPaidRouter.get('/fulfillment-options', async (req, res, next) => {
  try {
    res.json(await prisma.fulfillmentOption.findMany({ where: { tenantId: tid(req), isActive: true } }));
  } catch (e) { next(e); }
});

/* ─── Memberships & subscriptions ─── */
adminPaidRouter.get('/memberships', requirePermissions('customers.read'), async (req, res, next) => {
  try {
    res.json(await prisma.membershipTier.findMany({ where: { tenantId: tid(req) } }));
  } catch (e) { next(e); }
});

storefrontPaidRouter.get('/memberships', async (req, res, next) => {
  try {
    res.json(await prisma.membershipTier.findMany({ where: { tenantId: tid(req), isActive: true } }));
  } catch (e) { next(e); }
});

adminPaidRouter.post('/selling-plans', requirePermissions('products.write'), async (req, res, next) => {
  try {
    const body = z.object({
      productId: z.string().uuid(),
      name: z.string(),
      intervalDays: z.number().int().positive().default(30),
      discountPercent: z.number().int().nonnegative().default(0),
    }).parse(req.body);
    res.status(201).json(await prisma.sellingPlan.create({ data: { tenantId: tid(req), ...body } }));
  } catch (e) { next(e); }
});

adminPaidRouter.get('/subscriptions', requirePermissions('orders.read'), async (req, res, next) => {
  try {
    res.json(await prisma.customerSubscription.findMany({
      where: { tenantId: tid(req) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }));
  } catch (e) { next(e); }
});

/* ─── Draft orders ─── */
adminPaidRouter.post('/draft-orders', requirePermissions('orders.write'), async (req, res, next) => {
  try {
    const body = z.object({
      email: z.string().email().optional(),
      customerId: z.string().uuid().optional(),
      lines: z.array(z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().positive(),
        unitPriceCents: z.number().int().nonnegative().optional(),
        productName: z.string().optional(),
      })).min(1),
      note: z.string().optional(),
    }).parse(req.body);

    const lines = [];
    let subtotal = 0;
    for (const line of body.lines) {
      const variant = assertFound(await prisma.productVariant.findFirst({
        where: { id: line.variantId, tenantId: tid(req) },
        include: { product: true },
      }));
      const unit = line.unitPriceCents ?? variant.priceCents;
      subtotal += unit * line.quantity;
      lines.push({
        tenantId: tid(req),
        variantId: variant.id,
        productName: line.productName || variant.product.name,
        sku: variant.sku,
        quantity: line.quantity,
        unitPriceCents: unit,
      });
    }
    const orderNumber = `DRFT-${Date.now().toString().slice(-8)}`;
    const order = await prisma.order.create({
      data: {
        tenantId: tid(req),
        customerId: body.customerId,
        orderNumber,
        status: 'pending',
        isDraft: true,
        subtotalCents: subtotal,
        totalCents: subtotal,
        notes: body.note,
        lines: { create: lines },
      },
      include: { lines: true },
    });
    res.status(201).json(order);
  } catch (e) { next(e); }
});

adminPaidRouter.get('/draft-orders', requirePermissions('orders.read'), async (req, res, next) => {
  try {
    res.json(await prisma.order.findMany({
      where: { tenantId: tid(req), isDraft: true },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    }));
  } catch (e) { next(e); }
});

/* ─── Automations / email outbox ─── */
adminPaidRouter.get('/automations', requirePermissions('settings.write'), async (req, res, next) => {
  try {
    const [automations, outbox] = await Promise.all([
      prisma.emailAutomation.findMany({ where: { tenantId: tid(req) } }),
      prisma.emailOutbox.findMany({ where: { tenantId: tid(req) }, orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);
    res.json({ automations, outbox });
  } catch (e) { next(e); }
});

adminPaidRouter.get('/referrals', requirePermissions('customers.read'), async (req, res, next) => {
  try {
    const settings = await prisma.referralSettings.upsert({
      where: { tenantId: tid(req) },
      create: { tenantId: tid(req) },
      update: {},
    });
    res.json(settings);
  } catch (e) { next(e); }
});

/* ─── Checkout helpers: apply gift card / credit / loyalty preview ─── */
storefrontPaidRouter.post('/checkout/paid-quote', async (req, res, next) => {
  try {
    const body = z.object({
      subtotalCents: z.number().int().nonnegative(),
      giftCardCode: z.string().optional(),
      useStoreCreditCents: z.number().int().nonnegative().optional(),
      loyaltyPoints: z.number().int().nonnegative().optional(),
      fulfillmentType: z.enum(['ship', 'pickup', 'local_delivery']).optional(),
      currency: z.string().optional(),
    }).parse(req.body);

    let remaining = body.subtotalCents;
    let giftCardCents = 0;
    let storeCreditCents = 0;
    let loyaltyCents = 0;

    if (body.giftCardCode) {
      const card = await prisma.giftCard.findFirst({
        where: { tenantId: tid(req), code: body.giftCardCode.toUpperCase(), isActive: true },
      });
      if (card) {
        giftCardCents = Math.min(card.balanceCents, remaining);
        remaining -= giftCardCents;
      }
    }

    if (body.useStoreCreditCents && req.auth?.realm === 'customer') {
      const customer = await prisma.customer.findFirst({ where: { id: req.auth.sub, tenantId: tid(req) } });
      if (customer) {
        storeCreditCents = Math.min(body.useStoreCreditCents, customer.storeCreditCents, remaining);
        remaining -= storeCreditCents;
      }
    }

    if (body.loyaltyPoints && req.auth?.realm === 'customer') {
      const settings = await prisma.loyaltySettings.findUnique({ where: { tenantId: tid(req) } });
      const customer = await prisma.customer.findFirst({ where: { id: req.auth.sub, tenantId: tid(req) } });
      if (settings?.enabled && customer && body.loyaltyPoints >= settings.minRedeemPoints) {
        const pts = Math.min(body.loyaltyPoints, customer.loyaltyPoints);
        loyaltyCents = Math.min(pts * settings.redeemRateCents, remaining);
        remaining -= loyaltyCents;
      }
    }

    let fulfillmentCents = 0;
    if (body.fulfillmentType) {
      const opt = await prisma.fulfillmentOption.findFirst({
        where: { tenantId: tid(req), type: body.fulfillmentType, isActive: true },
      });
      fulfillmentCents = opt?.priceCents || 0;
    }

    let currency = body.currency || 'USD';
    let rate = 1;
    if (body.currency) {
      const cur = await prisma.storeCurrency.findFirst({
        where: { tenantId: tid(req), code: body.currency, isActive: true },
      });
      if (cur) rate = Number(cur.rateToBase);
    }

    res.json({
      giftCardCents,
      storeCreditCents,
      loyaltyCents,
      fulfillmentCents,
      remainingCents: remaining + fulfillmentCents,
      currency,
      rateToBase: rate,
      displayTotal: Math.round((remaining + fulfillmentCents) * rate),
    });
  } catch (e) { next(e); }
});

/* ─── Apps / webhooks / integrations ─── */
adminPaidRouter.get('/apps', requirePermissions('orders.read'), async (req, res, next) => {
  try {
    const [webhooks, integrations] = await Promise.all([
      prisma.webhook.findMany({ where: { tenantId: tid(req) }, orderBy: { createdAt: 'desc' } }),
      prisma.integration.findMany({ where: { tenantId: tid(req) }, orderBy: { provider: 'asc' } }),
    ]);
    res.json({ webhooks, integrations });
  } catch (e) { next(e); }
});

adminPaidRouter.post('/apps/webhooks', requirePermissions('orders.write'), async (req, res, next) => {
  try {
    const body = z.object({
      url: z.string().url(),
      events: z.array(z.string()).min(1),
    }).parse(req.body);
    const secret = randomBytes(16).toString('hex');
    res.status(201).json(await prisma.webhook.create({
      data: {
        tenantId: tid(req),
        url: body.url,
        events: body.events,
        secret,
        isActive: true,
      },
    }));
  } catch (e) { next(e); }
});

adminPaidRouter.post('/apps/integrations', requirePermissions('orders.write'), async (req, res, next) => {
  try {
    const body = z.object({
      provider: z.string().min(2),
      config: z.record(z.unknown()).optional(),
      isActive: z.boolean().optional(),
    }).parse(req.body);
    // z.record(z.unknown()) widens to Record<string, unknown>, which Prisma's
    // Json input type does not accept directly; the parsed value is already
    // JSON-shaped, so assert it rather than re-validating.
    const config = (body.config ?? {}) as Prisma.InputJsonValue;
    res.json(await prisma.integration.upsert({
      where: { tenantId_provider: { tenantId: tid(req), provider: body.provider } },
      create: {
        tenantId: tid(req),
        provider: body.provider,
        config,
        isActive: body.isActive ?? true,
      },
      update: {
        config,
        isActive: body.isActive ?? true,
      },
    }));
  } catch (e) { next(e); }
});

/* ─── Paid features dashboard summary ─── */
adminPaidRouter.get('/paid-features/summary', requirePermissions('orders.read'), async (req, res, next) => {
  try {
    const tenantId = tid(req);
    const [
      giftCards,
      bundles,
      abandoned,
      drafts,
      subscriptions,
      outbox,
      currencies,
      groups,
    ] = await Promise.all([
      prisma.giftCard.count({ where: { tenantId } }),
      prisma.productBundle.count({ where: { tenantId } }),
      prisma.cart.count({
        where: {
          tenantId,
          updatedAt: { lt: new Date(Date.now() - 3600000) },
          items: { some: {} },
        },
      }),
      prisma.order.count({ where: { tenantId, isDraft: true } }),
      prisma.customerSubscription.count({ where: { tenantId, status: 'active' } }),
      prisma.emailOutbox.count({ where: { tenantId } }),
      prisma.storeCurrency.count({ where: { tenantId, isActive: true } }),
      prisma.customerGroup.count({ where: { tenantId } }),
    ]);
    res.json({
      features: [
        { key: 'gift_cards', name: 'Gift cards', count: giftCards, status: 'active' },
        { key: 'bundles', name: 'Product bundles', count: bundles, status: 'active' },
        { key: 'loyalty', name: 'Loyalty & rewards', count: 1, status: 'active' },
        { key: 'abandoned_cart', name: 'Abandoned cart recovery', count: abandoned, status: 'active' },
        { key: 'store_credit', name: 'Store credit', count: 1, status: 'active' },
        { key: 'b2b', name: 'B2B / wholesale groups', count: groups, status: 'active' },
        { key: 'multi_currency', name: 'Multi-currency', count: currencies, status: 'active' },
        { key: 'draft_orders', name: 'Draft orders', count: drafts, status: 'active' },
        { key: 'subscriptions', name: 'Selling plans / subscriptions', count: subscriptions, status: 'active' },
        { key: 'automations', name: 'Email automations', count: outbox, status: 'active' },
        { key: 'pickup_delivery', name: 'Pickup & local delivery', count: 1, status: 'active' },
        { key: 'memberships', name: 'Memberships', count: 1, status: 'active' },
        { key: 'referrals', name: 'Referral program', count: 1, status: 'active' },
        { key: 'addons', name: 'Product add-ons', count: 1, status: 'active' },
        { key: 'qty_breaks', name: 'Quantity breaks', count: 1, status: 'active' },
        { key: 'preorder_digital', name: 'Pre-order & digital goods', count: 1, status: 'active' },
      ],
    });
  } catch (e) { next(e); }
});
