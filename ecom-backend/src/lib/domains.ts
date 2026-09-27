import { prisma } from './db.js';
import { config } from '../config.js';

/** Strip protocol/path/port and normalize hostname. Rejects admin. prefix. */
export function normalizeStoreDomain(input: string): string {
  let v = input.trim().toLowerCase();
  v = v.replace(/^https?:\/\//, '');
  v = v.split('/')[0] || '';
  v = v.split(':')[0] || '';
  v = v.replace(/^\.+|\.+$/g, '');
  if (v.startsWith('admin.')) {
    v = v.slice('admin.'.length);
  }
  if (v.startsWith('www.')) {
    v = v.slice('www.'.length);
  }
  return v;
}

export function isValidStoreDomain(domain: string): boolean {
  if (!domain || domain.length < 3) return false;
  if (domain === 'localhost' || domain === '127.0.0.1') return false;
  // allow *.localhost for local multi-tenant hosts
  if (domain.endsWith('.localhost')) {
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.localhost$/.test(domain);
  }
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain);
}

/** admin.shop.com → shop.com; shop.com → shop.com */
export function apexFromHost(host: string): string {
  const h = host.split(':')[0].toLowerCase();
  if (h.startsWith('admin.')) return h.slice('admin.'.length);
  if (h.startsWith('www.')) return h.slice('www.'.length);
  return h;
}

/** `dreamfitters.localhost` → `dreamfitters`; real domains → null */
export function localTenantLabelFromHost(host: string): string | null {
  const apex = apexFromHost(host);
  if (!apex.endsWith('.localhost')) return null;
  const label = apex.slice(0, -'.localhost'.length);
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label) ? label : null;
}

/** Prefer matching customDomain; fall back to slug/subdomain for `*.localhost`. */
export function tenantHostWhere(host: string) {
  const apex = apexFromHost(host);
  const label = localTenantLabelFromHost(host);
  return {
    status: 'active' as const,
    OR: [
      { customDomain: apex },
      { customDomain: host.split(':')[0].toLowerCase() },
      ...(label
        ? [{ slug: label }, { subdomain: label }]
        : apex.includes('.')
          ? []
          : [{ subdomain: apex }]),
    ],
  };
}

export function isAdminHost(host: string): boolean {
  return host.split(':')[0].toLowerCase().startsWith('admin.');
}

export function isPlatformHost(host: string): boolean {
  const h = host.split(':')[0].toLowerCase();
  const platform = config.platformDomain.toLowerCase();
  return h === platform || h === 'localhost' || h === '127.0.0.1';
}

export function storePublicUrl(customDomain: string | null | undefined, slug: string, path = '/'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (customDomain) {
    const protocol = customDomain.endsWith('.localhost') ? 'http' : 'https';
    const port = customDomain.endsWith('.localhost') ? ':3000' : '';
    return `${protocol}://${customDomain}${port}${p === '/' ? '' : p}`;
  }
  const base = config.webUrl.replace(/\/+$/, '');
  return `${base}/store/${slug}${p === '/' ? '' : p}`;
}

export function adminPublicUrl(customDomain: string | null | undefined, path = '/admin'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (customDomain) {
    const protocol = customDomain.endsWith('.localhost') ? 'http' : 'https';
    const port = customDomain.endsWith('.localhost') ? ':3000' : '';
    return `${protocol}://admin.${customDomain}${port}${p}`;
  }
  const base = config.webUrl.replace(/\/+$/, '');
  return `${base}${p}`;
}

type CorsCache = { expires: number; domains: Set<string> };
let corsCache: CorsCache | null = null;
const CORS_TTL_MS = 30_000;

export function invalidateCorsOriginCache() {
  corsCache = null;
}

export async function isCorsOriginAllowed(origin: string): Promise<boolean> {
  const cleaned = origin.replace(/\/+$/, '');
  if (config.corsOrigins.includes(cleaned)) return true;

  let hostname: string;
  try {
    hostname = new URL(cleaned).hostname.toLowerCase();
  } catch {
    return false;
  }

  const now = Date.now();
  if (!corsCache || corsCache.expires < now) {
    const tenants = await prisma.tenant.findMany({
      where: { customDomain: { not: null }, status: { not: 'deleted' } },
      select: { customDomain: true },
    });
    corsCache = {
      expires: now + CORS_TTL_MS,
      domains: new Set(tenants.map((t) => t.customDomain!).filter(Boolean)),
    };
  }

  const apex = apexFromHost(hostname);
  return corsCache.domains.has(apex);
}
