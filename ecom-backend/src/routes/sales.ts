import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth, requirePermissions } from '../middleware/auth.js';
import { loadTenantBootstrap } from '../middleware/bootstrap.js';
import { AppError, assertFound } from '../lib/errors.js';

export const salesRouter = Router();
salesRouter.use(requireAuth('tenant'), loadTenantBootstrap);

function tid(req: { tenantId?: string }) {
  return req.tenantId!;
}

const saleBody = z.object({
  name: z.string().min(1),
  percentOff: z.number().int().min(1).max(90),
  scope: z.enum(['product', 'category', 'all']),
  productId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

function normalizeSaleInput(body: z.infer<typeof saleBody>) {
  if (body.scope === 'product' && !body.productId) {
    throw new AppError(400, 'Product is required for product sales');
  }
  if (body.scope === 'category' && !body.categoryId) {
    throw new AppError(400, 'Category is required for category sales');
  }
  const parseDate = (v?: string | null) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  return {
    name: body.name,
    percentOff: body.percentOff,
    scope: body.scope,
    productId: body.scope === 'product' ? body.productId || null : null,
    categoryId: body.scope === 'category' ? body.categoryId || null : null,
    startsAt: parseDate(body.startsAt),
    endsAt: parseDate(body.endsAt),
    isActive: body.isActive ?? true,
  };
}

salesRouter.get('/sales', async (req, res, next) => {
  try {
    res.json(
      await prisma.sale.findMany({
        where: { tenantId: tid(req) },
        include: {
          product: { select: { id: true, name: true, slug: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    );
  } catch (e) {
    next(e);
  }
});

salesRouter.post('/sales', requirePermissions('products.write'), async (req, res, next) => {
  try {
    const body = saleBody.parse(req.body);
    const data = normalizeSaleInput(body);
    if (data.productId) {
      assertFound(await prisma.product.findFirst({ where: { id: data.productId, tenantId: tid(req) } }));
    }
    if (data.categoryId) {
      assertFound(await prisma.category.findFirst({ where: { id: data.categoryId, tenantId: tid(req) } }));
    }
    res.status(201).json(
      await prisma.sale.create({
        data: { tenantId: tid(req), ...data },
        include: {
          product: { select: { id: true, name: true, slug: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
    );
  } catch (e) {
    next(e);
  }
});

salesRouter.patch('/sales/:id', requirePermissions('products.write'), async (req, res, next) => {
  try {
    const existing = assertFound(
      await prisma.sale.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
    );
    const body = saleBody.partial().parse(req.body);
    const merged = {
      name: body.name ?? existing.name,
      percentOff: body.percentOff ?? existing.percentOff,
      scope: (body.scope ?? existing.scope) as 'product' | 'category' | 'all',
      productId: body.productId !== undefined ? body.productId : existing.productId,
      categoryId: body.categoryId !== undefined ? body.categoryId : existing.categoryId,
      startsAt:
        body.startsAt === undefined
          ? existing.startsAt?.toISOString() ?? null
          : body.startsAt,
      endsAt:
        body.endsAt === undefined ? existing.endsAt?.toISOString() ?? null : body.endsAt,
      isActive: body.isActive ?? existing.isActive,
    };
    const data = normalizeSaleInput(merged);
    res.json(
      await prisma.sale.update({
        where: { id: existing.id },
        data: { ...data, updatedAt: new Date() },
        include: {
          product: { select: { id: true, name: true, slug: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
    );
  } catch (e) {
    next(e);
  }
});

salesRouter.delete('/sales/:id', requirePermissions('products.write'), async (req, res, next) => {
  try {
    const n = await prisma.sale.deleteMany({ where: { id: req.params.id, tenantId: tid(req) } });
    if (!n.count) throw new AppError(404, 'Sale not found');
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
