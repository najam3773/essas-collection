import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/db.js';
import { AppError } from '../lib/errors.js';

export async function loadTenantBootstrap(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.auth?.tenantId) return next(new AppError(401, 'Tenant auth required'));
    const tenantId = req.auth.tenantId;

    const [entitlements, rolePerms] = await Promise.all([
      prisma.tenantEntitlement.findMany({ where: { tenantId, enabled: true } }),
      req.auth.sub
        ? prisma.tenantUser.findUnique({
            where: { id: req.auth.sub },
            include: { role: { include: { permissions: true } } },
          })
        : null,
    ]);

    req.entitlements = entitlements.map((e) => e.featureKey);
    req.permissions =
      rolePerms?.role?.permissions.map((p) => p.permissionKey) ||
      (rolePerms ? ['*'] : []);
    req.tenantId = tenantId;
    next();
  } catch (err) {
    next(err);
  }
}
