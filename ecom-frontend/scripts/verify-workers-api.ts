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

const session = crypto.randomUUID();
const cartHeaders = { 'x-cart-session': session };

const emptyCart = await fetchJson(`${workersOrigin}/api/storefront/cart`, { headers: cartHeaders });
const emptyItems = isObj(emptyCart.json) && Array.isArray(emptyCart.json.items) ? emptyCart.json.items : [];
record(
  'workers GET /api/storefront/cart (empty)',
  emptyCart.res.ok && emptyCart.runtime === 'workers' && emptyItems.length === 0,
  `status=${emptyCart.res.status} x-df-api=${emptyCart.runtime || 'missing'} items=${emptyItems.length}`,
);

const detailForCart = isObj(detail.json) ? detail.json : {};
const variants = Array.isArray(detailForCart.variants) ? detailForCart.variants : [];
const variantId = isObj(variants[0]) && typeof variants[0].id === 'string' ? variants[0].id : '';

const added = await fetchJson(`${workersOrigin}/api/storefront/cart/items`, {
  method: 'POST',
  headers: cartHeaders,
  body: JSON.stringify({ variantId, quantity: 1 }),
});
const addedItems = isObj(added.json) && Array.isArray(added.json.items) ? added.json.items : [];
const addedItem = addedItems[0] as { id?: string; quantity?: number } | undefined;
record(
  'workers POST /api/storefront/cart/items',
  added.res.ok && added.runtime === 'workers' && addedItems.length === 1 && addedItem?.quantity === 1,
  `status=${added.res.status} x-df-api=${added.runtime || 'missing'} items=${addedItems.length}`,
);

const counted = await fetchJson(`${workersOrigin}/api/storefront/cart`, { headers: cartHeaders });
const countedItems = isObj(counted.json) && Array.isArray(counted.json.items) ? counted.json.items : [];
record(
  'workers cart count after add',
  counted.res.ok && counted.runtime === 'workers' && countedItems.length === 1,
  `status=${counted.res.status} x-df-api=${counted.runtime || 'missing'} items=${countedItems.length}`,
);

const cartId = isObj(counted.json) && typeof counted.json.id === 'string' ? counted.json.id : '';
const itemId = addedItem?.id || (countedItems[0] as { id?: string } | undefined)?.id || '';

const updated = await fetchJson(`${workersOrigin}/api/storefront/cart/items/${itemId}`, {
  method: 'PATCH',
  headers: cartHeaders,
  body: JSON.stringify({ quantity: 2 }),
});
const updatedItems = isObj(updated.json) && Array.isArray(updated.json.items) ? updated.json.items : [];
record(
  'workers PATCH /api/storefront/cart/items/:id quantity=2',
  updated.res.ok &&
    updated.runtime === 'workers' &&
    isObj(updatedItems[0]) &&
    (updatedItems[0] as { quantity?: number }).quantity === 2,
  `status=${updated.res.status} x-df-api=${updated.runtime || 'missing'} qty=${isObj(updatedItems[0]) ? updatedItems[0].quantity : 'n/a'}`,
);

const quote = await fetchJson(`${workersOrigin}/api/storefront/checkout/quote`, {
  method: 'POST',
  body: JSON.stringify({ cartId, country: 'PK' }),
});
record(
  'workers POST /api/storefront/checkout/quote',
  quote.res.ok && quote.runtime === 'workers' && isObj(quote.json) && typeof quote.json.totalCents === 'number',
  `status=${quote.res.status} x-df-api=${quote.runtime || 'missing'} total=${isObj(quote.json) ? quote.json.totalCents : 'n/a'}`,
);

const emptyCheckout = await fetchJson(`${workersOrigin}/api/storefront/checkout`, {
  method: 'POST',
  body: JSON.stringify({
    cartId: '00000000-0000-4000-8000-000000000000',
    email: 'shopper@example.com',
    mockPay: true,
    shippingAddress: { line1: 'x', city: 'Lahore', postalCode: '54000', country: 'PK' },
  }),
});
record(
  'workers POST /api/storefront/checkout (invalid cart, no order)',
  emptyCheckout.runtime === 'workers' && emptyCheckout.res.status >= 400,
  `status=${emptyCheckout.res.status} x-df-api=${emptyCheckout.runtime || 'missing'}`,
);

const removed = await fetchJson(`${workersOrigin}/api/storefront/cart/items/${itemId}`, {
  method: 'PATCH',
  headers: cartHeaders,
  body: JSON.stringify({ quantity: 0 }),
});
const removedItems = isObj(removed.json) && Array.isArray(removed.json.items) ? removed.json.items : [];
record(
  'workers PATCH cart item quantity=0 (remove)',
  removed.res.ok && removed.runtime === 'workers' && removedItems.length === 0,
  `status=${removed.res.status} x-df-api=${removed.runtime || 'missing'} items=${removedItems.length}`,
);

const readd = await fetchJson(`${workersOrigin}/api/storefront/cart/items`, {
  method: 'POST',
  headers: cartHeaders,
  body: JSON.stringify({ variantId, quantity: 1 }),
});
const readdItems = isObj(readd.json) && Array.isArray(readd.json.items) ? readd.json.items : [];
const readdId = (readdItems[0] as { id?: string } | undefined)?.id;
if (readdId) {
  await fetchJson(`${workersOrigin}/api/storefront/cart/items/${readdId}`, {
    method: 'PATCH',
    headers: cartHeaders,
    body: JSON.stringify({ quantity: 0 }),
  });
}
const cleared = await fetchJson(`${workersOrigin}/api/storefront/cart`, { headers: cartHeaders });
const clearedItems = isObj(cleared.json) && Array.isArray(cleared.json.items) ? cleared.json.items : [];
const sameCart =
  isObj(cleared.json) && typeof cleared.json.id === 'string' && cleared.json.id === cartId;
record(
  'workers clear cart + same session',
  cleared.res.ok && cleared.runtime === 'workers' && clearedItems.length === 0 && sameCart,
  `status=${cleared.res.status} x-df-api=${cleared.runtime || 'missing'} sameCart=${sameCart} items=${clearedItems.length}`,
);

const upsells = await fetchJson(`${workersOrigin}/api/storefront/cart/upsells`, { headers: cartHeaders });
record(
  'workers GET /api/storefront/cart/upsells',
  upsells.res.ok && upsells.runtime === 'workers' && Array.isArray(upsells.json),
  `status=${upsells.res.status} x-df-api=${upsells.runtime || 'missing'}`,
);

const authHeaders = { authorization: `Bearer ${customerToken}` };
const wishlist = await fetchJson(`${workersOrigin}/api/storefront/wishlist`, { headers: authHeaders });
record(
  'workers GET /api/storefront/wishlist',
  wishlist.res.ok && wishlist.runtime === 'workers' && isObj(wishlist.json),
  `status=${wishlist.res.status} x-df-api=${wishlist.runtime || 'missing'}`,
);

const productId = typeof detailForCart.id === 'string' ? detailForCart.id : '';
const wishAdd = await fetchJson(`${workersOrigin}/api/storefront/wishlist/${productId}`, {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify({}),
});
record(
  'workers POST /api/storefront/wishlist/:productId',
  wishAdd.res.ok && wishAdd.runtime === 'workers',
  `status=${wishAdd.res.status} x-df-api=${wishAdd.runtime || 'missing'}`,
);
const wishDel = await fetchJson(`${workersOrigin}/api/storefront/wishlist/${productId}`, {
  method: 'DELETE',
  headers: authHeaders,
});
record(
  'workers DELETE /api/storefront/wishlist/:productId',
  wishDel.runtime === 'workers' && (wishDel.res.status === 204 || wishDel.res.ok),
  `status=${wishDel.res.status} x-df-api=${wishDel.runtime || 'missing'}`,
);

const account = await fetchJson(`${workersOrigin}/api/storefront/account`, { headers: authHeaders });
record(
  'workers GET /api/storefront/account',
  account.res.ok && account.runtime === 'workers' && isObj(account.json) && typeof account.json.email === 'string',
  `status=${account.res.status} x-df-api=${account.runtime || 'missing'}`,
);

const profileBody = {
  fullName: isObj(account.json) && typeof account.json.fullName === 'string' ? account.json.fullName : undefined,
  phone: isObj(account.json) && typeof account.json.phone === 'string' ? account.json.phone : undefined,
};
const profilePut = await fetchJson(`${workersOrigin}/api/storefront/account`, {
  method: 'PUT',
  headers: authHeaders,
  body: JSON.stringify(profileBody),
});
record(
  'workers PUT /api/storefront/account (same values)',
  profilePut.res.ok && profilePut.runtime === 'workers',
  `status=${profilePut.res.status} x-df-api=${profilePut.runtime || 'missing'}`,
);

const orders = await fetchJson(`${workersOrigin}/api/storefront/orders`, { headers: authHeaders });
record(
  'workers GET /api/storefront/orders',
  orders.res.ok && orders.runtime === 'workers' && Array.isArray(orders.json),
  `status=${orders.res.status} x-df-api=${orders.runtime || 'missing'}`,
);

const loyalty = await fetchJson(`${workersOrigin}/api/storefront/loyalty/me`, { headers: authHeaders });
record(
  'workers GET /api/storefront/loyalty/me',
  loyalty.res.ok && loyalty.runtime === 'workers',
  `status=${loyalty.res.status} x-df-api=${loyalty.runtime || 'missing'}`,
);

const newsletterBad = await fetchJson(`${workersOrigin}/api/storefront/newsletter`, {
  method: 'POST',
  body: JSON.stringify({ email: 'not-an-email' }),
});
record(
  'workers POST /api/storefront/newsletter (invalid, no write)',
  newsletterBad.runtime === 'workers' && newsletterBad.res.status === 400,
  `status=${newsletterBad.res.status} x-df-api=${newsletterBad.runtime || 'missing'}`,
);

const reviewBad = await fetchJson(`${workersOrigin}/api/storefront/products/${productId}/reviews`, {
  method: 'POST',
  body: JSON.stringify({}),
});
record(
  'workers POST /api/storefront/products/:id/reviews (invalid, no write)',
  reviewBad.runtime === 'workers' && reviewBad.res.status === 400,
  `status=${reviewBad.res.status} x-df-api=${reviewBad.runtime || 'missing'}`,
);

const suggest = await fetchJson(`${workersOrigin}/api/storefront/search/suggest?q=linen`);
record(
  'workers GET /api/storefront/search/suggest',
  suggest.res.ok && suggest.runtime === 'workers' && isObj(suggest.json),
  `status=${suggest.res.status} x-df-api=${suggest.runtime || 'missing'}`,
);

const pages = await fetchJson(`${workersOrigin}/api/storefront/pages`);
record(
  'workers GET /api/storefront/pages',
  pages.res.ok && pages.runtime === 'workers' && Array.isArray(pages.json),
  `status=${pages.res.status} x-df-api=${pages.runtime || 'missing'}`,
);

const fulfill = await fetchJson(`${workersOrigin}/api/storefront/fulfillment-options`);
record(
  'workers GET /api/storefront/fulfillment-options',
  fulfill.res.ok && fulfill.runtime === 'workers' && Array.isArray(fulfill.json),
  `status=${fulfill.res.status} x-df-api=${fulfill.runtime || 'missing'}`,
);

const giftBad = await fetchJson(`${workersOrigin}/api/storefront/gift-cards/lookup`, {
  method: 'POST',
  body: JSON.stringify({ code: 'NOPE' }),
});
record(
  'workers POST /api/storefront/gift-cards/lookup (unknown)',
  giftBad.runtime === 'workers' && giftBad.res.status >= 400,
  `status=${giftBad.res.status} x-df-api=${giftBad.runtime || 'missing'}`,
);

const failed = checks.filter((c) => !c.ok);
if (failed.length) {
  console.error(`Workers API checks failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`Workers API checks passed: ${checks.length}/${checks.length}`);
