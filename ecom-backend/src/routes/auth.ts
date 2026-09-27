import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { AppError, assertFound } from '../lib/errors.js';
import { signToken, verifyPassword } from '../lib/auth.js';
import { getStore, getStoreId } from '../lib/store.js';
import { getEffectiveEntitlements } from '../services/entitlements.js';
import { requireAuth } from '../middleware/auth.js';
import { loadTenantBootstrap } from '../middleware/bootstrap.js';

export const authRouter = Router();

async function staffLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const body = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    const store = await getStore();
    const user = assertFound(
      await prisma.tenantUser.findUnique({
        where: { tenantId_email: { tenantId: store.id, email: body.email } },
        include: { role: { include: { permissions: true } } },
      }),
      'Invalid credentials',
    );
    if (!user.isActive || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new AppError(401, 'Invalid credentials');
    }
    const token = signToken({
      sub: user.id,
      realm: 'tenant',
      email: user.email,
      tenantId: store.id,
      role: user.role?.key,
    });
    const effective = await getEffectiveEntitlements(store.id);
    const productCount = await prisma.product.count({ where: { tenantId: store.id } });
    res.json({
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
    });
  } catch (e) {
    next(e);
  }
}

async function staffBootstrap(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: req.tenantId! },
      include: { plan: true, themeConfig: { include: { theme: true } } },
    });
    const effective = await getEffectiveEntitlements(tenant.id);
    const productCount = await prisma.product.count({ where: { tenantId: tenant.id } });
    res.json({
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan?.key },
      themeConfig: tenant.themeConfig,
      entitlements: effective.entitlements,
      limits: { ...effective.limits, current_products: productCount },
      screens: effective.screens,
      permissions: req.permissions,
    });
  } catch (e) {
    next(e);
  }
}

authRouter.post('/login', staffLogin);
authRouter.post('/staff/login', staffLogin);
authRouter.post('/tenant/login', staffLogin);

authRouter.post('/customer/login', async (req, res, next) => {
  try {
    const body = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    const storeId = await getStoreId();
    const customer = assertFound(
      await prisma.customer.findUnique({
        where: { tenantId_email: { tenantId: storeId, email: body.email } },
      }),
      'Invalid credentials',
    );
    if (!customer.passwordHash || !(await verifyPassword(body.password, customer.passwordHash))) {
      throw new AppError(401, 'Invalid credentials');
    }
    const store = await getStore();
    const token = signToken({
      sub: customer.id,
      realm: 'customer',
      email: customer.email,
      tenantId: storeId,
    });
    res.json({
      token,
      customer: { id: customer.id, email: customer.email, fullName: customer.fullName },
      tenant: { id: store.id, slug: store.slug, name: store.name },
    });
  } catch (e) {
    next(e);
  }
});

authRouter.get('/staff/bootstrap', requireAuth('tenant'), loadTenantBootstrap, staffBootstrap);
authRouter.get('/tenant/bootstrap', requireAuth('tenant'), loadTenantBootstrap, staffBootstrap);
