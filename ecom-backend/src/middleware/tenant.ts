import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/db.js';
import { AppError } from '../lib/errors.js';
import { getStoreId } from '../lib/store.js';

/** Attach the single Essa's Collection store to every request that needs it. */
export async function resolveTenant(req: Request, _res: Response, next: NextFunction) {
  try {
    const id = await getStoreId();
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) return next(new AppError(500, 'Store not found'));
    if (tenant.status !== 'active') {
      return next(new AppError(403, 'Store is not available'));
    }
    req.tenantId = tenant.id;
    (req as Request & { tenant?: typeof tenant }).tenant = tenant;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireTenant(req: Request, _res: Response, next: NextFunction) {
  if (!req.tenantId) {
    return next(new AppError(400, 'Store context is not available'));
  }
  next();
}

export function assertTenantHostMatch(_req: Request, _res: Response, next: NextFunction) {
  next();
}
