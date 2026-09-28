import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(frontendRoot, '..');
const workersOrigin = (process.env.WORKERS_API_ORIGIN || 'http://localhost:3001').replace(/\/+$/, '');
const expressOrigin = (process.env.EXPRESS_API_ORIGIN || 'http://127.0.0.1:4000').replace(/\/+$/, '');

function loadEnvFile(filePath: string, override = false) {
  if (!existsSync(filePath)) return;
  let text = readFileSync(filePath, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (process.env[key] && !override) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(path.join(frontendRoot, '.dev.vars'), true);
loadEnvFile(path.join(repoRoot, 'ecom-backend', '.env'));

const staffEmail = process.env.VERIFY_STAFF_EMAIL || 'owner@essascollection.com';
const staffPassword = process.env.VERIFY_STAFF_PASSWORD || 'Password123!';
const customerEmail = process.env.VERIFY_CUSTOMER_EMAIL || 'shopper@example.com';
const customerPassword = process.env.VERIFY_CUSTOMER_PASSWORD || 'Password123!';

type Check = { name: string; ok: boolean; detail: string };

const checks: Check[] = [];

function record(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'OK' : 'FAIL'} ${name} ${detail}`);
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers || {}) } });
  const runtime = res.headers.get('x-df-api');
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { res, runtime, json };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

const workersHealth = await fetchJson(`${workersOrigin}/api/health`);
record(
  'workers GET /api/health',
  workersHealth.res.ok && workersHealth.runtime === 'workers',
  `status=${workersHealth.res.status} x-df-api=${workersHealth.runtime || 'missing'}`,
);

const expressHealth = await fetchJson(`${expressOrigin}/health`);
record(
  'express GET /health (fallback)',
  expressHealth.res.ok && expressHealth.runtime !== 'workers',
  `status=${expressHealth.res.status} x-df-api=${expressHealth.runtime || 'none'}`,
);

const staff = await fetchJson(`${workersOrigin}/api/auth/staff/login`, {
  method: 'POST',
  body: JSON.stringify({ email: staffEmail, password: staffPassword }),
});
const staffToken =
  isObj(staff.json) && typeof staff.json.token === 'string' ? staff.json.token : '';
record(
  'workers POST /api/auth/staff/login',
  staff.res.ok && staff.runtime === 'workers' && staffToken.length > 20,
  `status=${staff.res.status} x-df-api=${staff.runtime || 'missing'} token=${staffToken ? 'present' : 'missing'}`,
);

const customer = await fetchJson(`${workersOrigin}/api/auth/customer/login`, {
  method: 'POST',
  body: JSON.stringify({ email: customerEmail, password: customerPassword }),
});
const customerToken =
  isObj(customer.json) && typeof customer.json.token === 'string' ? customer.json.token : '';
record(
  'workers POST /api/auth/customer/login',
  customer.res.ok && customer.runtime === 'workers' && customerToken.length > 20,
  `status=${customer.res.status} x-df-api=${customer.runtime || 'missing'} token=${customerToken ? 'present' : 'missing'}`,
);

const catalog = await fetchJson(`${workersOrigin}/api/storefront/catalog?limit=12&sort=newest`);
const catalogItems = isObj(catalog.json) && Array.isArray(catalog.json.items) ? catalog.json.items : [];
record(
  'workers GET /api/storefront/catalog',
  catalog.res.ok && catalog.runtime === 'workers' && catalogItems.length > 0,
  `status=${catalog.res.status} x-df-api=${catalog.runtime || 'missing'} items=${catalogItems.length}`,
);

const filtered = await fetchJson(`${workersOrigin}/api/storefront/catalog?category=linen&pieces=3-piece&limit=12`);
const filteredItems = isObj(filtered.json) && Array.isArray(filtered.json.items) ? filtered.json.items : [];
record(
  'workers catalog filters (linen + 3-piece)',
  filtered.res.ok && filtered.runtime === 'workers',
  `status=${filtered.res.status} x-df-api=${filtered.runtime || 'missing'} items=${filteredItems.length}`,
);

const first = catalogItems[0] as { slug?: string } | undefined;
const slug = first?.slug || 'noor-e-sabz-linen-3-piece';
const detail = await fetchJson(`${workersOrigin}/api/storefront/products/${slug}/detail`);
record(
  'workers GET /api/storefront/products/:slug/detail',
  detail.res.ok && detail.runtime === 'workers' && isObj(detail.json) && detail.json.slug === slug,
  `status=${detail.res.status} x-df-api=${detail.runtime || 'missing'} slug=${slug}`,
);

const collection = await fetchJson(`${workersOrigin}/api/storefront/collections/linen`);
const collectionProducts =
  isObj(collection.json) && Array.isArray(collection.json.products) ? collection.json.products : [];
record(
  'workers GET /api/storefront/collections/linen',
  collection.res.ok && collection.runtime === 'workers' && collectionProducts.length > 0,
  `status=${collection.res.status} x-df-api=${collection.runtime || 'missing'} products=${collectionProducts.length}`,
);

const failed = checks.filter((c) => !c.ok);
if (failed.length) {
  console.error(`Workers API checks failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`Workers API checks passed: ${checks.length}/${checks.length}`);
