import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError, assertFound } from '../lib/errors.js';
import { hashPassword } from '../lib/auth.js';
import { onboardTenant } from '../services/tenant-onboard.js';
import { syncTenantEntitlementsFromPlan } from '../services/entitlements.js';
import { getThemePreset } from '../lib/theme-presets.js';
import {
  invalidateCorsOriginCache,
  isValidStoreDomain,
  normalizeStoreDomain,
} from '../lib/domains.js';

export const platformRouter = Router();
platformRouter.use(requireAuth('platform'));

async function audit(actorId: string, action: string, entityType: string, entityId: string, metadata?: unknown) {
  await prisma.platformAuditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      metadata: (metadata as object) || {},
    },
  });
}

/* ─── Tenants ─── */
platformRouter.get('/tenants', async (_req, res, next) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: { plan: true, subscription: true, _count: { select: { products: true, users: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tenants);
  } catch (e) {
    next(e);
  }
});

platformRouter.get('/tenants/:id', async (req, res, next) => {
  try {
    const tenant = assertFound(
      await prisma.tenant.findUnique({
        where: { id: req.params.id },
        include: {
          plan: true,
          subscription: true,
          themeConfig: { include: { theme: true } },
          users: {
            where: { role: { key: 'owner' } },
            take: 1,
            include: { role: true },
            orderBy: { createdAt: 'asc' },
          },
          _count: { select: { products: true, users: true, orders: true, customers: true } },
        },
      }),
    );
    const owner =
      tenant.users[0] ||
      (await prisma.tenantUser.findFirst({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: 'asc' },
      }));
    const { users: _users, ...rest } = tenant;
    res.json({
      ...rest,
      owner: owner
        ? { id: owner.id, email: owner.email, fullName: owner.fullName }
        : null,
    });
  } catch (e) {
    next(e);
  }
});

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .transform((v) => v.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''))
  .refine((v) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v), {
    message: 'Use lowercase letters, numbers, and hyphens only',
  });

const domainSchema = z
  .string()
  .trim()
  .min(3)
  .transform((v) => normalizeStoreDomain(v))
  .refine((v) => isValidStoreDomain(v), {
    message: 'Enter a valid store domain (e.g. mystore.com or mystore.localhost)',
  });

platformRouter.post('/tenants', async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().trim().min(2),
        slug: slugSchema,
        subdomain: slugSchema.optional(),
        customDomain: domainSchema,
        planKey: z.enum(['starter', 'professional', 'enterprise']),
        industryTemplate: z.enum(['fashion', 'jewelry', 'electronics']).optional(),
        ownerEmail: z.string().trim().email(),
        ownerName: z.string().trim().min(2),
        ownerPassword: z.string().min(8),
        brandName: z.string().trim().optional().or(z.literal('')).transform((v) => v || undefined),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        backgroundColor: z.string().optional(),
        themeKey: z.string().optional(),
      })
      .transform((data) => ({
        ...data,
        subdomain: data.subdomain || data.slug,
      }))
      .parse(req.body);

    const result = await onboardTenant(body);
    invalidateCorsOriginCache();
    await audit(req.auth!.sub, 'tenant.create', 'tenant', result.tenant.id, {
      slug: body.slug,
      planKey: body.planKey,
      customDomain: body.customDomain,
    });
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
});

platformRouter.patch('/tenants/:id', async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(2).optional(),
        slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
        subdomain: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
        status: z.enum(['active', 'suspended', 'pending', 'deleted']).optional(),
        planKey: z.string().optional(),
        industryTemplate: z.enum(['fashion', 'jewelry', 'electronics']).nullable().optional(),
        customDomain: z
          .union([domainSchema, z.literal(''), z.null()])
          .optional()
          .transform((v) => (v === '' || v === null || v === undefined ? v : v)),
        brandName: z.string().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        backgroundColor: z.string().optional(),
        themeKey: z.string().optional(),
        ownerName: z.string().min(2).optional(),
        ownerEmail: z.string().email().optional(),
        ownerPassword: z.string().min(8).optional(),
      })
      .parse(req.body);

    const tenant = assertFound(await prisma.tenant.findUnique({ where: { id: req.params.id } }));
    let planId = tenant.planId;

    if (body.planKey) {
      const plan = assertFound(await prisma.subscriptionPlan.findUnique({ where: { key: body.planKey } }));
      planId = plan.id;
      await syncTenantEntitlementsFromPlan(tenant.id, plan.id);
      await prisma.tenantSubscription.upsert({
        where: { tenantId: tenant.id },
        create: { tenantId: tenant.id, planId: plan.id, status: 'active' },
        update: { planId: plan.id },
      });
    }

    // Match onboard: slug drives subdomain when subdomain omitted
    const nextSlug = body.slug;
    const nextSubdomain = body.subdomain ?? body.slug;

    if (nextSlug && nextSlug !== tenant.slug) {
      const clash = await prisma.tenant.findFirst({ where: { slug: nextSlug, NOT: { id: tenant.id } } });
      if (clash) throw new AppError(409, 'Slug already in use');
    }
    if (nextSubdomain && nextSubdomain !== tenant.subdomain) {
      const clash = await prisma.tenant.findFirst({
        where: { subdomain: nextSubdomain, NOT: { id: tenant.id } },
      });
      if (clash) throw new AppError(409, 'Subdomain already in use');
    }

    let nextDomain: string | null | undefined = undefined;
    if (body.customDomain !== undefined) {
      nextDomain = body.customDomain === '' || body.customDomain === null ? null : body.customDomain;
    }

    // Renaming slug should move local demo domain `old.localhost` → `new.localhost`
    const slugForDomain = nextSlug || tenant.slug;
    const oldLocalDomain = `${tenant.slug}.localhost`;
    const newLocalDomain = `${slugForDomain}.localhost`;
    if (nextSlug && nextSlug !== tenant.slug) {
      const currentDomain = tenant.customDomain;
      const shouldRetarget =
        !currentDomain ||
        currentDomain === oldLocalDomain ||
        currentDomain === `${tenant.subdomain}.localhost`;
      if (shouldRetarget && (nextDomain === undefined || nextDomain === oldLocalDomain || nextDomain === currentDomain)) {
        nextDomain = newLocalDomain;
      }
    }

    if (nextDomain) {
      const clash = await prisma.tenant.findFirst({
        where: { customDomain: nextDomain, NOT: { id: tenant.id } },
      });
      if (clash) throw new AppError(409, 'Store domain already in use');
    }

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        name: body.name,
        slug: nextSlug,
        subdomain: nextSubdomain,
        status: body.status,
        planId: planId || undefined,
        industryTemplate: body.industryTemplate === undefined ? undefined : body.industryTemplate,
        customDomain: nextDomain === undefined ? undefined : nextDomain,
      },
    });
    invalidateCorsOriginCache();

    const currentBranding = await prisma.themeConfig.findUnique({
      where: { tenantId: tenant.id },
      include: { theme: true },
    });

    const nameChanging = !!(body.name?.trim() && body.name.trim() !== tenant.name);
    const brandExplicit = body.brandName !== undefined;
    const shouldUpdateBrand = brandExplicit || nameChanging;

    let nextBrandName = (currentBranding?.brandName || tenant.name).trim();
    if (shouldUpdateBrand) {
      if (brandExplicit && body.brandName!.trim()) {
        nextBrandName = body.brandName!.trim();
      } else if (nameChanging) {
        nextBrandName = body.name!.trim();
      } else if (body.name?.trim()) {
        nextBrandName = body.name.trim();
      }
    }

    const brandChanged = shouldUpdateBrand && !!nextBrandName && nextBrandName !== currentBranding?.brandName;

    // Branding / theme — same fields as onboard; changing themeKey reapplies that pack's look
    if (
      shouldUpdateBrand ||
      body.primaryColor !== undefined ||
      body.secondaryColor !== undefined ||
      body.backgroundColor !== undefined ||
      body.themeKey !== undefined
    ) {
      let themeId: string | undefined;
      const themeChanged = !!(body.themeKey && body.themeKey !== currentBranding?.theme?.themeKey);
      const preset = body.themeKey ? getThemePreset(body.themeKey) : null;
      if (body.themeKey) {
        const theme = await prisma.theme.findUnique({ where: { themeKey: body.themeKey } });
        if (!theme) throw new AppError(400, `Unknown theme: ${body.themeKey}`);
        themeId = theme.id;
      }
      await prisma.themeConfig.upsert({
        where: { tenantId: tenant.id },
        create: {
          tenantId: tenant.id,
          brandName: nextBrandName,
          primaryColor: body.primaryColor || preset?.colors.primary || '#0f766e',
          secondaryColor: body.secondaryColor || preset?.colors.secondary || '#134e4a',
          backgroundColor: body.backgroundColor || preset?.colors.background || '#fbf8f2',
          fontHeading: preset?.fonts.heading || 'Cormorant Garamond',
          fontBody: preset?.fonts.body || 'Outfit',
          themeId,
        },
        update: {
          ...(shouldUpdateBrand ? { brandName: nextBrandName } : {}),
          ...(themeChanged && preset
            ? {
                primaryColor: body.primaryColor || preset.colors.primary,
                secondaryColor: body.secondaryColor || preset.colors.secondary,
                backgroundColor: body.backgroundColor || preset.colors.background,
                fontHeading: preset.fonts.heading,
                fontBody: preset.fonts.body,
              }
            : {
                ...(body.primaryColor !== undefined ? { primaryColor: body.primaryColor } : {}),
                ...(body.secondaryColor !== undefined ? { secondaryColor: body.secondaryColor } : {}),
                ...(body.backgroundColor !== undefined ? { backgroundColor: body.backgroundColor } : {}),
              }),
          ...(themeId ? { themeId } : {}),
        },
      });

      if (brandChanged) {
        const { syncTenantBrandName } = await import('../lib/sync-brand-name.js');
        await syncTenantBrandName(tenant.id, nextBrandName, [
          currentBranding?.brandName,
          tenant.name,
          body.name,
        ]);
      }
    }

    // Owner account — same fields as onboard (password optional on update)
    if (body.ownerName || body.ownerEmail || body.ownerPassword) {
      const owner =
        (await prisma.tenantUser.findFirst({
          where: { tenantId: tenant.id, role: { key: 'owner' } },
          orderBy: { createdAt: 'asc' },
        })) ||
        (await prisma.tenantUser.findFirst({
          where: { tenantId: tenant.id },
          orderBy: { createdAt: 'asc' },
        }));
      if (!owner) throw new AppError(400, 'No owner account found for this tenant');
      if (body.ownerEmail && body.ownerEmail.toLowerCase() !== owner.email.toLowerCase()) {
        const clash = await prisma.tenantUser.findFirst({
          where: { tenantId: tenant.id, email: body.ownerEmail, NOT: { id: owner.id } },
        });
        if (clash) throw new AppError(409, 'Owner email already in use on this tenant');
      }
      await prisma.tenantUser.update({
        where: { id: owner.id },
        data: {
          ...(body.ownerName ? { fullName: body.ownerName } : {}),
          ...(body.ownerEmail ? { email: body.ownerEmail } : {}),
          ...(body.ownerPassword ? { passwordHash: await hashPassword(body.ownerPassword) } : {}),
        },
      });
    }

    const updated = await prisma.tenant.findUniqueOrThrow({
      where: { id: tenant.id },
      include: {
        plan: true,
        subscription: true,
        themeConfig: { include: { theme: true } },
        _count: { select: { products: true, users: true, orders: true, customers: true } },
      },
    });
    const ownerUser =
      (await prisma.tenantUser.findFirst({
        where: { tenantId: tenant.id, role: { key: 'owner' } },
        orderBy: { createdAt: 'asc' },
      })) ||
      (await prisma.tenantUser.findFirst({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: 'asc' },
      }));

    await audit(req.auth!.sub, 'tenant.update', 'tenant', tenant.id, {
      ...body,
      ownerPassword: body.ownerPassword ? '[set]' : undefined,
    });
    res.json({
      ...updated,
      owner: ownerUser
        ? { id: ownerUser.id, email: ownerUser.email, fullName: ownerUser.fullName }
        : null,
    });
  } catch (e) {
    next(e);
  }
});

platformRouter.delete('/tenants/:id', async (req, res, next) => {
  try {
    const tenant = assertFound(await prisma.tenant.findUnique({ where: { id: req.params.id } }));
    const hard = String(req.query.hard || '') === '1' || req.body?.hard === true;

    if (hard) {
      await prisma.tenant.delete({ where: { id: tenant.id } });
      invalidateCorsOriginCache();
      await audit(req.auth!.sub, 'tenant.delete.hard', 'tenant', tenant.id, { slug: tenant.slug });
      res.status(204).end();
      return;
    }

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: { status: 'deleted' },
      include: { plan: true },
    });
    invalidateCorsOriginCache();
    await audit(req.auth!.sub, 'tenant.delete.soft', 'tenant', tenant.id, { slug: tenant.slug });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

platformRouter.get('/tenants/:id/entitlements', async (req, res, next) => {
  try {
    const entitlements = await prisma.tenantEntitlement.findMany({
      where: { tenantId: req.params.id },
      include: { feature: true },
      orderBy: { featureKey: 'asc' },
    });
    const limits = await prisma.tenantFeatureLimit.findMany({ where: { tenantId: req.params.id } });
    res.json({ entitlements, limits });
  } catch (e) {
    next(e);
  }
});

platformRouter.put('/tenants/:id/entitlements', async (req, res, next) => {
  try {
    const body = z
      .object({
        features: z.array(z.object({ featureKey: z.string(), enabled: z.boolean() })),
        limits: z.array(z.object({ limitKey: z.string(), value: z.number().int() })).optional(),
      })
      .parse(req.body);

    for (const f of body.features) {
      await prisma.tenantEntitlement.upsert({
        where: { tenantId_featureKey: { tenantId: req.params.id, featureKey: f.featureKey } },
        create: {
          tenantId: req.params.id,
          featureKey: f.featureKey,
          enabled: f.enabled,
          source: 'override',
        },
        update: { enabled: f.enabled, source: 'override' },
      });
    }
    if (body.limits) {
      for (const l of body.limits) {
        await prisma.tenantFeatureLimit.upsert({
          where: { tenantId_limitKey: { tenantId: req.params.id, limitKey: l.limitKey } },
          create: { tenantId: req.params.id, limitKey: l.limitKey, value: l.value },
          update: { value: l.value },
        });
      }
    }
    await audit(req.auth!.sub, 'entitlements.update', 'tenant', req.params.id, body);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

platformRouter.post('/tenants/:id/reset-entitlements', async (req, res, next) => {
  try {
    const tenant = assertFound(await prisma.tenant.findUnique({ where: { id: req.params.id } }));
    if (!tenant.planId) throw new AppError(400, 'Tenant has no plan');
    await prisma.tenantEntitlement.deleteMany({ where: { tenantId: tenant.id } });
    await syncTenantEntitlementsFromPlan(tenant.id, tenant.planId);
    await audit(req.auth!.sub, 'entitlements.reset', 'tenant', tenant.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* ─── Plans ─── */
platformRouter.get('/plans', async (_req, res, next) => {
  try {
    res.json(await prisma.subscriptionPlan.findMany({ include: { planFeatures: true }, orderBy: { priceMonthlyCents: 'asc' } }));
  } catch (e) {
    next(e);
  }
});

platformRouter.post('/plans', async (req, res, next) => {
  try {
    const body = z
      .object({
        key: z.string().min(2).regex(/^[a-z0-9_-]+$/),
        name: z.string().min(2),
        description: z.string().optional(),
        priceMonthlyCents: z.number().int().nonnegative().default(0),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);
    const plan = await prisma.subscriptionPlan.create({ data: body });
    await audit(req.auth!.sub, 'plan.create', 'plan', plan.id, body);
    res.status(201).json(plan);
  } catch (e) {
    next(e);
  }
});

platformRouter.patch('/plans/:id', async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(2).optional(),
        description: z.string().nullable().optional(),
        priceMonthlyCents: z.number().int().nonnegative().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);
    const existing = assertFound(await prisma.subscriptionPlan.findUnique({ where: { id: req.params.id } }));
    const updated = await prisma.subscriptionPlan.update({
      where: { id: existing.id },
      data: body,
      include: { planFeatures: true },
    });
    await audit(req.auth!.sub, 'plan.update', 'plan', existing.id, body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

platformRouter.put('/plans/:id/features', async (req, res, next) => {
  try {
    const body = z
      .object({
        features: z.array(
          z.object({
            featureKey: z.string(),
            enabled: z.boolean().default(true),
            limitValue: z.number().int().nullable().optional(),
          }),
        ),
      })
      .parse(req.body);
    const plan = assertFound(await prisma.subscriptionPlan.findUnique({ where: { id: req.params.id } }));
    await prisma.planFeature.deleteMany({ where: { planId: plan.id } });
    if (body.features.length) {
      await prisma.planFeature.createMany({
        data: body.features.map((f) => ({
          planId: plan.id,
          featureKey: f.featureKey,
          enabled: f.enabled,
          limitValue: f.limitValue ?? null,
        })),
      });
    }
    const updated = await prisma.subscriptionPlan.findUnique({
      where: { id: plan.id },
      include: { planFeatures: true },
    });
    await audit(req.auth!.sub, 'plan.features.update', 'plan', plan.id, body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

platformRouter.delete('/plans/:id', async (req, res, next) => {
  try {
    const plan = assertFound(await prisma.subscriptionPlan.findUnique({ where: { id: req.params.id } }));
    const inUse = await prisma.tenant.count({ where: { planId: plan.id } });
    if (inUse > 0) throw new AppError(400, `Plan is assigned to ${inUse} tenant(s); reassign them first`);
    await prisma.subscriptionPlan.delete({ where: { id: plan.id } });
    await audit(req.auth!.sub, 'plan.delete', 'plan', plan.id, { key: plan.key });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

/* ─── Features ─── */
platformRouter.get('/features', async (_req, res, next) => {
  try {
    res.json(await prisma.feature.findMany({ orderBy: [{ category: 'asc' }, { key: 'asc' }] }));
  } catch (e) {
    next(e);
  }
});

platformRouter.post('/features', async (req, res, next) => {
  try {
    const body = z
      .object({
        key: z.string().min(2).regex(/^[a-z0-9._-]+$/),
        name: z.string().min(2),
        category: z.string().min(2),
        description: z.string().optional(),
      })
      .parse(req.body);
    const feature = await prisma.feature.create({ data: body });
    await audit(req.auth!.sub, 'feature.create', 'feature', feature.id, body);
    res.status(201).json(feature);
  } catch (e) {
    next(e);
  }
});

platformRouter.patch('/features/:id', async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(2).optional(),
        category: z.string().min(2).optional(),
        description: z.string().nullable().optional(),
      })
      .parse(req.body);
    const existing = assertFound(await prisma.feature.findUnique({ where: { id: req.params.id } }));
    const updated = await prisma.feature.update({ where: { id: existing.id }, data: body });
    await audit(req.auth!.sub, 'feature.update', 'feature', existing.id, body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

platformRouter.delete('/features/:id', async (req, res, next) => {
  try {
    const feature = assertFound(await prisma.feature.findUnique({ where: { id: req.params.id } }));
    await prisma.feature.delete({ where: { id: feature.id } });
    await audit(req.auth!.sub, 'feature.delete', 'feature', feature.id, { key: feature.key });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

/* ─── Themes ─── */
platformRouter.get('/themes', async (_req, res, next) => {
  try {
    res.json(await prisma.theme.findMany({ orderBy: { name: 'asc' } }));
  } catch (e) {
    next(e);
  }
});

platformRouter.post('/themes', async (req, res, next) => {
  try {
    const body = z
      .object({
        themeKey: z.string().min(2).regex(/^[a-z0-9-]+$/),
        name: z.string().min(2),
        version: z.string().optional(),
        industryTags: z.array(z.string()).optional(),
        previewUrl: z.string().optional(),
        isPublished: z.boolean().optional(),
      })
      .parse(req.body);
    const theme = await prisma.theme.create({
      data: {
        themeKey: body.themeKey,
        name: body.name,
        version: body.version || '1.0.0',
        industryTags: body.industryTags || [],
        previewUrl: body.previewUrl,
        isPublished: body.isPublished ?? false,
      },
    });
    await audit(req.auth!.sub, 'theme.create', 'theme', theme.id, body);
    res.status(201).json(theme);
  } catch (e) {
    next(e);
  }
});

platformRouter.patch('/themes/:id', async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(2).optional(),
        version: z.string().optional(),
        industryTags: z.array(z.string()).optional(),
        previewUrl: z.string().nullable().optional(),
        isPublished: z.boolean().optional(),
      })
      .parse(req.body);
    const existing = assertFound(await prisma.theme.findUnique({ where: { id: req.params.id } }));
    const updated = await prisma.theme.update({ where: { id: existing.id }, data: body });
    await audit(req.auth!.sub, 'theme.update', 'theme', existing.id, body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

platformRouter.delete('/themes/:id', async (req, res, next) => {
  try {
    const theme = assertFound(await prisma.theme.findUnique({ where: { id: req.params.id } }));
    const inUse = await prisma.themeConfig.count({ where: { themeId: theme.id } });
    if (inUse > 0) throw new AppError(400, `Theme is used by ${inUse} store(s); unassign first`);
    await prisma.theme.delete({ where: { id: theme.id } });
    await audit(req.auth!.sub, 'theme.delete', 'theme', theme.id, { themeKey: theme.themeKey });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

/* ─── Feature services ─── */
platformRouter.get('/feature-services', async (_req, res, next) => {
  try {
    res.json(await prisma.featureService.findMany({ orderBy: { name: 'asc' } }));
  } catch (e) {
    next(e);
  }
});

platformRouter.post('/feature-services', async (req, res, next) => {
  try {
    const body = z
      .object({
        serviceKey: z.string().min(2).regex(/^[a-z0-9._-]+$/),
        name: z.string().min(2),
        entitlementKey: z.string().min(2),
        baseUrl: z.string().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);
    const row = await prisma.featureService.create({ data: body });
    await audit(req.auth!.sub, 'feature_service.create', 'feature_service', row.id, body);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
});

platformRouter.patch('/feature-services/:id', async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(2).optional(),
        entitlementKey: z.string().min(2).optional(),
        baseUrl: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);
    const existing = assertFound(await prisma.featureService.findUnique({ where: { id: req.params.id } }));
    const updated = await prisma.featureService.update({ where: { id: existing.id }, data: body });
    await audit(req.auth!.sub, 'feature_service.update', 'feature_service', existing.id, body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

platformRouter.delete('/feature-services/:id', async (req, res, next) => {
  try {
    const row = assertFound(await prisma.featureService.findUnique({ where: { id: req.params.id } }));
    await prisma.featureService.delete({ where: { id: row.id } });
    await audit(req.auth!.sub, 'feature_service.delete', 'feature_service', row.id, { serviceKey: row.serviceKey });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

/* ─── Analytics / audit / health ─── */
platformRouter.get('/analytics', async (_req, res, next) => {
  try {
    const [tenants, active, products, orders] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: 'active' } }),
      prisma.product.count(),
      prisma.order.count(),
    ]);
    const gmv = await prisma.order.aggregate({
      _sum: { totalCents: true },
      where: { status: { in: ['paid', 'fulfilled'] } },
    });
    res.json({
      tenants,
      activeTenants: active,
      products,
      orders,
      gmvCents: gmv._sum.totalCents || 0,
    });
  } catch (e) {
    next(e);
  }
});

platformRouter.get('/audit-logs', async (_req, res, next) => {
  try {
    res.json(
      await prisma.platformAuditLog.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { email: true, fullName: true } } },
      }),
    );
  } catch (e) {
    next(e);
  }
});

platformRouter.get('/health', async (_req, res, next) => {
  try {
    const [tenants, products, orders, webhooks, integrations] = await Promise.all([
      prisma.tenant.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.webhook.count(),
      prisma.integration.count(),
    ]);
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      ok: true,
      db: true,
      tenants,
      products,
      orders,
      webhooks,
      integrations,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    next(e);
  }
});
