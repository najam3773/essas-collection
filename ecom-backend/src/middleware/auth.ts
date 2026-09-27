import type { NextFunction, Request, Response } from 'express';
import { verifyToken, type AuthRealm, type TokenPayload } from '../lib/auth.js';
import { AppError } from '../lib/errors.js';

declare global {
  namespace Express {
    interface Request {
      auth?: TokenPayload;
      tenantId?: string;
      entitlements?: string[];
      permissions?: string[];
    }
  }
}

export function requireAuth(realm: AuthRealm) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return next(new AppError(401, 'Missing authorization token'));
    }
    try {
      const token = header.slice(7);
      const payload = verifyToken(token, realm);
      if (payload.realm !== realm) {
        return next(new AppError(401, 'Invalid auth realm'));
      }
      req.auth = payload;
      if (payload.tenantId) req.tenantId = payload.tenantId;
      next();
    } catch {
      next(new AppError(401, 'Invalid or expired token'));
    }
  };
}

export function optionalAuth(realm: AuthRealm) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next();
    try {
      const payload = verifyToken(header.slice(7), realm);
      if (payload.realm === realm) {
        req.auth = payload;
        if (payload.tenantId) req.tenantId = payload.tenantId;
      }
    } catch {
      // ignore invalid optional token
    }
    next();
  };
}

export function requirePermissions(...needed: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const perms = req.permissions || [];
    const ok = needed.every((p) => perms.includes(p) || perms.includes('*'));
    if (!ok) return next(new AppError(403, 'Insufficient permissions'));
    next();
  };
}

export function requireFeatures(..._features: string[]) {
  return (_req: Request, _res: Response, next: NextFunction) => {
    next();
  };
}
