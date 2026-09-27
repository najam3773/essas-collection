import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth, requireFeatures, requirePermissions } from '../middleware/auth.js';
import { loadTenantBootstrap } from '../middleware/bootstrap.js';
import { AppError, assertFound } from '../lib/errors.js';

export const adminExtraRouter = Router();
adminExtraRouter.use(requireAuth('tenant'), loadTenantBootstrap);

function tid(req: { tenantId?: string }) {
  return req.tenantId!;
}

adminExtraRouter.get('/inventory', requireFeatures('inventory.tracking'), async (req, res, next) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { tenantId: tid(req) },
      include: {
        variant: { include: { product: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

adminExtraRouter.patch('/inventory/:id', requireFeatures('inventory.tracking'), async (req, res, next) => {
  try {
    const body = z.object({ quantity: z.number().int().nonnegative(), reserved: z.number().int().optional() }).parse(req.body);
    const existing = assertFound(
      await prisma.inventoryItem.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
    );
    res.json(
      await prisma.inventoryItem.update({
        where: { id: existing.id },
        data: body,
        include: { variant: { include: { product: true } } },
      }),
    );
  } catch (e) {
    next(e);
  }
});

adminExtraRouter.get('/shipping-zones', async (req, res, next) => {
  try {
    res.json(await prisma.shippingZone.findMany({ where: { tenantId: tid(req) } }));
  } catch (e) {
    next(e);
  }
});

adminExtraRouter.post('/shipping-zones', requirePermissions('settings.write'), async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string(),
        countries: z.array(z.string()).min(1),
        rateCents: z.number().int().nonnegative(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);
    res.status(201).json(await prisma.shippingZone.create({ data: { tenantId: tid(req), ...body } }));
  } catch (e) {
    next(e);
  }
});

adminExtraRouter.patch('/shipping-zones/:id', requirePermissions('settings.write'), async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().optional(),
        countries: z.array(z.string()).min(1).optional(),
        rateCents: z.number().int().nonnegative().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);
    const existing = assertFound(
      await prisma.shippingZone.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
    );
    res.json(await prisma.shippingZone.update({ where: { id: existing.id }, data: body }));
  } catch (e) {
    next(e);
  }
});

adminExtraRouter.delete('/shipping-zones/:id', requirePermissions('settings.write'), async (req, res, next) => {
  try {
    const n = await prisma.shippingZone.deleteMany({ where: { id: req.params.id, tenantId: tid(req) } });
    if (!n.count) throw new AppError(404, 'Shipping zone not found');
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

adminExtraRouter.get('/tax-rules', async (req, res, next) => {
  try {
    res.json(await prisma.taxRule.findMany({ where: { tenantId: tid(req) } }));
  } catch (e) {
    next(e);
  }
});

adminExtraRouter.post('/tax-rules', requirePermissions('settings.write'), async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string(),
        country: z.string(),
        region: z.string().optional(),
        rateBps: z.number().int().nonnegative(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);
    res.status(201).json(await prisma.taxRule.create({ data: { tenantId: tid(req), ...body } }));
  } catch (e) {
    next(e);
  }
});

adminExtraRouter.patch('/tax-rules/:id', requirePermissions('settings.write'), async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().optional(),
        country: z.string().optional(),
        region: z.string().nullable().optional(),
        rateBps: z.number().int().nonnegative().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);
    const existing = assertFound(
      await prisma.taxRule.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
    );
    res.json(await prisma.taxRule.update({ where: { id: existing.id }, data: body }));
  } catch (e) {
    next(e);
  }
});

adminExtraRouter.delete('/tax-rules/:id', requirePermissions('settings.write'), async (req, res, next) => {
  try {
    const n = await prisma.taxRule.deleteMany({ where: { id: req.params.id, tenantId: tid(req) } });
    if (!n.count) throw new AppError(404, 'Tax rule not found');
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

adminExtraRouter.post(
  '/pages',
  requireFeatures('content.cms'),
  requirePermissions('content.write'),
  async (req, res, next) => {
    try {
      const body = z
        .object({
          title: z.string(),
          slug: z.string(),
          bodyHtml: z.string().optional(),
          status: z.enum(['draft', 'published']).default('draft'),
        })
        .parse(req.body);
      res.status(201).json(await prisma.contentPage.create({ data: { tenantId: tid(req), ...body } }));
    } catch (e) {
      next(e);
    }
  },
);

adminExtraRouter.put(
  '/pages/:id',
  requireFeatures('content.cms'),
  requirePermissions('content.write'),
  async (req, res, next) => {
    try {
      const body = z
        .object({
          title: z.string().optional(),
          slug: z.string().optional(),
          bodyHtml: z.string().optional(),
          status: z.enum(['draft', 'published']).optional(),
        })
        .parse(req.body);
      const existing = assertFound(
        await prisma.contentPage.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
      );
      res.json(await prisma.contentPage.update({ where: { id: existing.id }, data: body }));
    } catch (e) {
      next(e);
    }
  },
);

adminExtraRouter.delete(
  '/pages/:id',
  requireFeatures('content.cms'),
  requirePermissions('content.write'),
  async (req, res, next) => {
    try {
      const n = await prisma.contentPage.deleteMany({ where: { id: req.params.id, tenantId: tid(req) } });
      if (!n.count) throw new AppError(404, 'Page not found');
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  },
);

adminExtraRouter.get('/reviews', async (req, res, next) => {
  try {
    res.json(
      await prisma.productReview.findMany({
        where: { tenantId: tid(req) },
        include: { product: { select: { name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    );
  } catch (e) {
    next(e);
  }
});

adminExtraRouter.patch('/reviews/:id', async (req, res, next) => {
  try {
    const body = z.object({ isApproved: z.boolean() }).parse(req.body);
    const existing = assertFound(
      await prisma.productReview.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
    );
    res.json(await prisma.productReview.update({ where: { id: existing.id }, data: body }));
  } catch (e) {
    next(e);
  }
});

adminExtraRouter.delete('/reviews/:id', async (req, res, next) => {
  try {
    const n = await prisma.productReview.deleteMany({ where: { id: req.params.id, tenantId: tid(req) } });
    if (!n.count) throw new AppError(404, 'Review not found');
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

adminExtraRouter.get('/dashboard', async (req, res, next) => {
  try {
    const tenantId = tid(req);
    const [products, orders, customers, lowStock, revenue, recentOrders] = await Promise.all([
      prisma.product.count({ where: { tenantId } }),
      prisma.order.count({ where: { tenantId } }),
      prisma.customer.count({ where: { tenantId } }),
      prisma.inventoryItem.count({ where: { tenantId, quantity: { lte: 5 } } }),
      prisma.order.aggregate({
        where: { tenantId, status: { in: ['paid', 'fulfilled'] } },
        _sum: { totalCents: true },
      }),
      prisma.order.findMany({
        where: { tenantId },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);
    res.json({
      products,
      orders,
      customers,
      lowStock,
      revenueCents: revenue._sum.totalCents || 0,
      recentOrders,
    });
  } catch (e) {
    next(e);
  }
});

adminExtraRouter.get('/menus', async (req, res, next) => {
  try {
    res.json(
      await prisma.menu.findMany({
        where: { tenantId: tid(req) },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      }),
    );
  } catch (e) {
    next(e);
  }
});

adminExtraRouter.post('/menus/:id/items', requirePermissions('content.write'), async (req, res, next) => {
  try {
    const body = z
      .object({ label: z.string(), href: z.string(), sortOrder: z.number().int().optional() })
      .parse(req.body);
    const menu = assertFound(
      await prisma.menu.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
    );
    res.status(201).json(
      await prisma.menuItem.create({
        data: {
          tenantId: tid(req),
          menuId: menu.id,
          label: body.label,
          href: body.href,
          sortOrder: body.sortOrder || 0,
        },
      }),
    );
  } catch (e) {
    next(e);
  }
});

adminExtraRouter.patch('/menu-items/:id', requirePermissions('content.write'), async (req, res, next) => {
  try {
    const body = z
      .object({
        label: z.string().optional(),
        href: z.string().optional(),
        sortOrder: z.number().int().optional(),
      })
      .parse(req.body);
    const existing = assertFound(
      await prisma.menuItem.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
    );
    res.json(await prisma.menuItem.update({ where: { id: existing.id }, data: body }));
  } catch (e) {
    next(e);
  }
});

adminExtraRouter.delete('/menu-items/:id', requirePermissions('content.write'), async (req, res, next) => {
  try {
    const n = await prisma.menuItem.deleteMany({ where: { id: req.params.id, tenantId: tid(req) } });
    if (!n.count) throw new AppError(404, 'Menu item not found');
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

adminExtraRouter.get('/home-sections', async (req, res, next) => {
  try {
    res.json(
      await prisma.tenantPageSection.findUnique({
        where: { tenantId_pageKey: { tenantId: tid(req), pageKey: 'home' } },
      }),
    );
  } catch (e) {
    next(e);
  }
});

adminExtraRouter.get('/reports/summary', requireFeatures('reports.basic'), async (req, res, next) => {
  try {
    const tenantId = tid(req);
    const orders = await prisma.order.findMany({
      where: { tenantId, status: { in: ['paid', 'fulfilled'] } },
      select: { totalCents: true, createdAt: true, status: true },
    });
    const byDay: Record<string, number> = {};
    for (const o of orders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      byDay[day] = (byDay[day] || 0) + o.totalCents;
    }
    res.json({
      orderCount: orders.length,
      gmvCents: orders.reduce((s, o) => s + o.totalCents, 0),
      aovCents: orders.length ? Math.round(orders.reduce((s, o) => s + o.totalCents, 0) / orders.length) : 0,
      revenueByDay: Object.entries(byDay)
        .map(([date, cents]) => ({ date, cents }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (e) {
    next(e);
  }
});

adminExtraRouter.delete('/coupons/:id', requireFeatures('marketing.coupons'), async (req, res, next) => {
  try {
    const n = await prisma.coupon.deleteMany({ where: { id: req.params.id, tenantId: tid(req) } });
    if (!n.count) throw new AppError(404, 'Coupon not found');
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
