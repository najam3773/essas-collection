import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { storefrontRouter } from './routes/storefront.js';
import { storefrontExtraRouter } from './routes/storefront-extra.js';
import { adminExtraRouter } from './routes/admin-extra.js';
import { storefrontAdvancedRouter, adminAdvancedRouter } from './routes/advanced.js';
import { storefrontPaidRouter, adminPaidRouter } from './routes/paid.js';
import { salesRouter } from './routes/sales.js';
import { statusRouter } from './routes/status.js';
import { errorHandler } from './middleware/error.js';
import { UPLOADS_DIR, ensureUploadsDir } from './lib/uploads.js';
import { config } from './config.js';
import { prisma } from './lib/db.js';

export function createApp() {
  const app = express();
  ensureUploadsDir();
  app.use(helmet());
  // Same-origin via Next rewrites is the normal path (no CORS). Allow WEB_URL
  // only for local tools that still hit Express directly.
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        const allowed = [config.webUrl.replace(/\/+$/, '')];
        cb(null, allowed.includes(origin.replace(/\/+$/, '')));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true, service: 'essas-collection', db: 'up', api: 'up' });
    } catch {
      res.status(503).json({ ok: false, service: 'essas-collection', db: 'down' });
    }
  });
  app.use(
    '/uploads',
    (_req, res, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      next();
    },
    express.static(UPLOADS_DIR, { index: false, maxAge: '7d' }),
  );
  app.use(statusRouter);

  app.use('/auth', authRouter);
  app.use('/admin', adminRouter);
  app.use('/admin', adminExtraRouter);
  app.use('/admin', adminAdvancedRouter);
  app.use('/admin', adminPaidRouter);
  app.use('/admin', salesRouter);
  app.use('/storefront', storefrontRouter);
  app.use('/storefront', storefrontExtraRouter);
  app.use('/storefront', storefrontAdvancedRouter);
  app.use('/storefront', storefrontPaidRouter);

  app.use(errorHandler);
  return app;
}
