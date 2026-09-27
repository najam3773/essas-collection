import 'dotenv/config';

const isProd = (process.env.NODE_ENV || 'development') === 'production';

export const config = {
  port: Number(process.env.API_PORT || 4000),
  listenHost: process.env.API_HOST || (isProd ? '127.0.0.1' : '0.0.0.0'),
  databaseUrl: process.env.DATABASE_URL!,
  webUrl: process.env.WEB_URL || 'http://localhost:3000',
  jwt: {
    platform: process.env.JWT_SECRET || 'dev-jwt-secret',
    tenant:
      process.env.JWT_STAFF_SECRET ||
      process.env.STAFF_JWT_SECRET ||
      process.env.JWT_TENANT_SECRET ||
      process.env.JWT_SECRET ||
      'dev-jwt-secret',
    customer:
      process.env.JWT_CUSTOMER_SECRET ||
      process.env.CUSTOMER_JWT_SECRET ||
      process.env.JWT_SECRET ||
      'dev-jwt-secret',
  },
  stripeSecret: process.env.STRIPE_SECRET_KEY || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  /** Unused SaaS leftover — kept so older helpers still type-check. */
  platformDomain: 'localhost',
  corsOrigins: [] as string[],
  /** Empty = store relative /uploads/... URLs (same origin). */
  publicApiUrl: (process.env.API_URL || process.env.PUBLIC_API_URL || '').replace(/\/+$/, ''),
};
