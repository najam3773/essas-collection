import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth, requireFeatures, requirePermissions } from '../middleware/auth.js';
import { loadTenantBootstrap } from '../middleware/bootstrap.js';
import { AppError, assertFound } from '../lib/errors.js';
import { hashPassword } from '../lib/auth.js';
import { imageUpload } from '../lib/uploads.js';
import { productImageStorage } from '../lib/product-image-storage.js';
import { parsePieceTypeKey, pieceTypeTags, pieceTypeToEnum } from '../lib/piece-type.js';

export const adminRouter = Router();
adminRouter.use(requireAuth('tenant'), loadTenantBootstrap);

function tid(req: { tenantId?: string }) {
  return req.tenantId!;
}

adminRouter.post(
  '/uploads',
  requireFeatures('catalog.products'),
  requirePermissions('products.write'),
  imageUpload.array('files', 12),
  async (req, res, next) => {
    try {
      const files = (Array.isArray(req.files) ? req.files : []) as Express.Multer.File[];
      if (!files.length) throw new AppError(400, 'No images uploaded');
      const tenantId = tid(req);
      res.status(201).json({
        files: await productImageStorage.save(files, tenantId),
      });
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.get('/products', requireFeatures('catalog.products'), async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { tenantId: tid(req) },
      include: { variants: { include: { inventory: true } }, category: true },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(products);
  } catch (e) {
    next(e);
  }
});

adminRouter.post(
  '/products',
  requireFeatures('catalog.products'),
  requirePermissions('products.write'),
  async (req, res, next) => {
    try {
      const body = z
        .object({
          name: z.string().min(1),
          slug: z.string().min(1),
          description: z.string().optional(),
          categoryId: z.string().uuid().optional(),
          status: z.enum(['draft', 'active', 'archived']).default('draft'),
          media: z.array(z.any()).optional(),
          tags: z.array(z.string()).optional(),
          vendor: z.string().optional().nullable(),
          featured: z.boolean().optional(),
          pieceType: z.string().optional(),
          variants: z
            .array(
              z.object({
                sku: z.string(),
                priceCents: z.number().int().positive(),
                compareAtCents: z.number().int().optional(),
                attributeValues: z.record(z.string()).optional(),
                quantity: z.number().int().nonnegative().default(0),
              }),
            )
            .min(1),
        })
        .parse(req.body);

      const limit = await prisma.tenantFeatureLimit.findUnique({
        where: { tenantId_limitKey: { tenantId: tid(req), limitKey: 'catalog.products' } },
      });
      if (limit) {
        const count = await prisma.product.count({ where: { tenantId: tid(req) } });
        if (count >= limit.value) throw new AppError(403, 'Product limit reached for plan');
      }

      const pieceKey = parsePieceTypeKey(body.pieceType);
      if (body.pieceType && !pieceKey) throw new AppError(400, 'Piece Type must be 1 Piece, 2 Piece, 3 Piece, or Dupatta');
      if (!pieceKey) throw new AppError(400, 'Piece Type is required');

      let slug = body.slug;
      const slugClash = await prisma.product.findUnique({
        where: { tenantId_slug: { tenantId: tid(req), slug } },
      });
      if (slugClash) slug = `${slug}-${Date.now().toString(36)}`;

      const tags = [...new Set([
        ...(body.tags || []).map((t) => t.toLowerCase().trim()).filter(Boolean),
        ...pieceTypeTags(pieceKey),
      ])];

      const product = await prisma.product.create({
        data: {
          tenantId: tid(req),
          name: body.name,
          slug,
          description: body.description,
          categoryId: body.categoryId,
          status: body.status,
          pieceType: pieceTypeToEnum(pieceKey),
          media: body.media || [],
          tags,
          vendor: body.vendor || undefined,
          featured: body.featured || false,
          variants: {
            create: body.variants.map((v) => ({
              tenantId: tid(req),
              sku: v.sku,
              priceCents: v.priceCents,
              compareAtCents: v.compareAtCents,
              attributeValues: v.attributeValues || {},
              inventory: {
                create: {
                  tenantId: tid(req),
                  quantity: v.quantity,
                },
              },
            })),
          },
        },
        include: { variants: { include: { inventory: true } } },
      });
      res.status(201).json(product);
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.patch(
  '/products/:id',
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
          pieceType: z.string().optional(),
        })
        .parse(req.body);
      const existing = assertFound(
        await prisma.product.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
      );
      const pieceKey = body.pieceType ? parsePieceTypeKey(body.pieceType) : null;
      if (body.pieceType && !pieceKey) throw new AppError(400, 'Piece Type must be 1 Piece, 2 Piece, 3 Piece, or Dupatta');
      const { pieceType: _ignored, ...rest } = body;
      res.json(
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            ...rest,
            ...(pieceKey ? { pieceType: pieceTypeToEnum(pieceKey) } : {}),
          },
          include: { variants: true },
        }),
      );
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.delete(
  '/products/:id',
  requireFeatures('catalog.products'),
  requirePermissions('products.delete'),
  async (req, res, next) => {
    try {
      const existing = assertFound(
        await prisma.product.findFirst({
          where: { id: req.params.id, tenantId: tid(req) },
          include: { variants: { include: { orderLines: { take: 1 } } } },
        }),
      );
      const hasOrders = existing.variants.some((v) => v.orderLines.length > 0);
      if (hasOrders) {
        throw new AppError(
          409,
          'This product has existing orders, so it cannot be deleted. Archive it from the product editor instead.',
        );
      }
      await prisma.$transaction([
        prisma.cartItem.deleteMany({ where: { variant: { productId: existing.id } } }),
        prisma.wishlistItem.deleteMany({ where: { productId: existing.id } }),
        prisma.productReview.deleteMany({ where: { productId: existing.id } }),
        prisma.stockNotification.deleteMany({ where: { variant: { productId: existing.id } } }),
        prisma.product.delete({ where: { id: existing.id } }),
      ]);
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.get('/categories', requireFeatures('catalog.categories'), async (req, res, next) => {
  try {
    res.json(await prisma.category.findMany({ where: { tenantId: tid(req) }, orderBy: { sortOrder: 'asc' } }));
  } catch (e) {
    next(e);
  }
});

adminRouter.post(
  '/categories',
  requireFeatures('catalog.categories'),
  requirePermissions('categories.write'),
  async (req, res, next) => {
    try {
      const body = z.object({
        name: z.string(),
        slug: z.string(),
        parentId: z.string().uuid().optional(),
        description: z.string().optional(),
      }).parse(req.body);
      res.status(201).json(
        await prisma.category.create({
          data: {
            tenantId: tid(req),
            name: body.name,
            slug: body.slug,
            parentId: body.parentId,
            description: body.description,
          },
        }),
      );
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.patch(
  '/categories/:id',
  requireFeatures('catalog.categories'),
  requirePermissions('categories.write'),
  async (req, res, next) => {
    try {
      const body = z
        .object({
          name: z.string().optional(),
          slug: z.string().optional(),
          parentId: z.string().uuid().nullable().optional(),
          description: z.string().nullable().optional(),
          sortOrder: z.number().int().optional(),
          isActive: z.boolean().optional(),
        })
        .parse(req.body);
      const existing = assertFound(
        await prisma.category.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
      );
      res.json(await prisma.category.update({ where: { id: existing.id }, data: body }));
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.delete(
  '/categories/:id',
  requireFeatures('catalog.categories'),
  requirePermissions('categories.write'),
  async (req, res, next) => {
    try {
      const existing = assertFound(
        await prisma.category.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
      );
      await prisma.product.updateMany({
        where: { tenantId: tid(req), categoryId: existing.id },
        data: { categoryId: null },
      });
      await prisma.category.delete({ where: { id: existing.id } });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.get('/orders', requireFeatures('orders.management'), async (req, res, next) => {
  try {
    res.json(
      await prisma.order.findMany({
        where: { tenantId: tid(req) },
        include: { lines: true, customer: true, payments: true },
        orderBy: { createdAt: 'desc' },
      }),
    );
  } catch (e) {
    next(e);
  }
});

adminRouter.patch(
  '/orders/:id',
  requireFeatures('orders.management'),
  requirePermissions('orders.write'),
  async (req, res, next) => {
    try {
      const body = z
        .object({ status: z.enum(['pending', 'paid', 'fulfilled', 'cancelled', 'refunded']) })
        .parse(req.body);
      if (body.status === 'refunded') {
        if (!req.entitlements?.includes('orders.refunds')) {
          throw new AppError(403, 'Refunds not entitled');
        }
        if (!(req.permissions || []).includes('orders.refund') && !(req.permissions || []).includes('*')) {
          throw new AppError(403, 'Missing refund permission');
        }
      }
      const existing = assertFound(
        await prisma.order.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
      );
      res.json(
        await prisma.order.update({
          where: { id: existing.id },
          data: { status: body.status },
          include: { lines: true, customer: true, payments: true },
        }),
      );
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.get('/customers', requireFeatures('customers.crm'), async (req, res, next) => {
  try {
    res.json(await prisma.customer.findMany({ where: { tenantId: tid(req) }, orderBy: { createdAt: 'desc' } }));
  } catch (e) {
    next(e);
  }
});

adminRouter.get('/branding', async (req, res, next) => {
  try {
    res.json(
      await prisma.themeConfig.findUnique({
        where: { tenantId: tid(req) },
        include: { theme: true },
      }),
    );
  } catch (e) {
    next(e);
  }
});

adminRouter.put(
  '/branding',
  requirePermissions('branding.write'),
  async (req, res, next) => {
    try {
      const body = z
        .object({
          brandName: z.string().optional(),
          logoUrl: z.string().optional(),
          faviconUrl: z.string().optional(),
          primaryColor: z.string().optional(),
          secondaryColor: z.string().optional(),
          backgroundColor: z.string().optional(),
          fontHeading: z.string().optional(),
          fontBody: z.string().optional(),
          customCss: z.string().optional(),
          themeId: z.string().uuid().optional(),
          themeSettings: z.record(z.any()).optional(),
        })
        .parse(req.body);

      if (body.customCss && !req.entitlements?.includes('branding.custom_css')) {
        throw new AppError(403, 'Custom CSS not entitled');
      }

      const tenantId = tid(req);
      const current = await prisma.themeConfig.findUnique({ where: { tenantId } });
      const updated = await prisma.themeConfig.update({
        where: { tenantId },
        data: body,
        include: { theme: true },
      });

      if (body.brandName && body.brandName.trim() && body.brandName.trim() !== current?.brandName) {
        const { syncTenantBrandName } = await import('../lib/sync-brand-name.js');
        await syncTenantBrandName(tenantId, body.brandName, [current?.brandName]);
      }

      res.json(updated);
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.get('/staff', requirePermissions('staff.write'), async (req, res, next) => {
  try {
    res.json(
      await prisma.tenantUser.findMany({
        where: { tenantId: tid(req) },
        include: { role: true },
        orderBy: { createdAt: 'asc' },
      }),
    );
  } catch (e) {
    next(e);
  }
});

adminRouter.post('/staff', requirePermissions('staff.write'), async (req, res, next) => {
  try {
    const body = z
      .object({
        email: z.string().email(),
        fullName: z.string(),
        password: z.string().min(8),
        roleId: z.string().uuid(),
      })
      .parse(req.body);
    res.status(201).json(
      await prisma.tenantUser.create({
        data: {
          tenantId: tid(req),
          email: body.email,
          fullName: body.fullName,
          passwordHash: await hashPassword(body.password),
          roleId: body.roleId,
        },
      }),
    );
  } catch (e) {
    next(e);
  }
});

adminRouter.patch('/staff/:id', requirePermissions('staff.write'), async (req, res, next) => {
  try {
    const body = z
      .object({
        fullName: z.string().optional(),
        roleId: z.string().uuid().nullable().optional(),
        isActive: z.boolean().optional(),
        password: z.string().min(8).optional(),
      })
      .parse(req.body);
    const existing = assertFound(
      await prisma.tenantUser.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
    );
    const { password, ...rest } = body;
    res.json(
      await prisma.tenantUser.update({
        where: { id: existing.id },
        data: {
          ...rest,
          ...(password ? { passwordHash: await hashPassword(password) } : {}),
        },
        include: { role: true },
      }),
    );
  } catch (e) {
    next(e);
  }
});

adminRouter.delete('/staff/:id', requirePermissions('staff.write'), async (req, res, next) => {
  try {
    if (req.auth?.sub === req.params.id) {
      throw new AppError(400, 'Cannot delete your own staff account');
    }
    const n = await prisma.tenantUser.deleteMany({ where: { id: req.params.id, tenantId: tid(req) } });
    if (!n.count) throw new AppError(404, 'Staff not found');
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

adminRouter.get('/roles', async (req, res, next) => {
  try {
    res.json(
      await prisma.role.findMany({
        where: { tenantId: tid(req) },
        include: { permissions: true },
      }),
    );
  } catch (e) {
    next(e);
  }
});

adminRouter.get('/coupons', requireFeatures('marketing.coupons'), async (req, res, next) => {
  try {
    res.json(await prisma.coupon.findMany({ where: { tenantId: tid(req) } }));
  } catch (e) {
    next(e);
  }
});

adminRouter.post(
  '/coupons',
  requireFeatures('marketing.coupons'),
  requirePermissions('coupons.write'),
  async (req, res, next) => {
    try {
      const body = z
        .object({
          code: z.string(),
          type: z.enum(['percent', 'fixed']),
          value: z.number().int().positive(),
          maxUses: z.number().int().optional(),
        })
        .parse(req.body);
      res.status(201).json(
        await prisma.coupon.create({
          data: { tenantId: tid(req), ...body },
        }),
      );
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.patch(
  '/coupons/:id',
  requireFeatures('marketing.coupons'),
  requirePermissions('coupons.write'),
  async (req, res, next) => {
    try {
      const body = z
        .object({
          code: z.string().optional(),
          type: z.enum(['percent', 'fixed']).optional(),
          value: z.number().int().positive().optional(),
          maxUses: z.number().int().nullable().optional(),
          isActive: z.boolean().optional(),
        })
        .parse(req.body);
      const existing = assertFound(
        await prisma.coupon.findFirst({ where: { id: req.params.id, tenantId: tid(req) } }),
      );
      res.json(
        await prisma.coupon.update({
          where: { id: existing.id },
          data: {
            ...body,
            ...(body.code ? { code: body.code.toUpperCase() } : {}),
          },
        }),
      );
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.get('/pages', requireFeatures('content.cms'), async (req, res, next) => {
  try {
    res.json(await prisma.contentPage.findMany({ where: { tenantId: tid(req) } }));
  } catch (e) {
    next(e);
  }
});

adminRouter.put('/home-sections', requireFeatures('content.page_builder'), async (req, res, next) => {
  try {
    const body = z.object({ sections: z.array(z.any()) }).parse(req.body);
    res.json(
      await prisma.tenantPageSection.upsert({
        where: { tenantId_pageKey: { tenantId: tid(req), pageKey: 'home' } },
        create: { tenantId: tid(req), pageKey: 'home', sections: body.sections },
        update: { sections: body.sections },
      }),
    );
  } catch (e) {
    next(e);
  }
});

adminRouter.get('/attributes', requireFeatures('catalog.attributes'), async (req, res, next) => {
  try {
    res.json(await prisma.attributeDefinition.findMany({ where: { tenantId: tid(req) } }));
  } catch (e) {
    next(e);
  }
});
