import { z } from 'zod';
import { Prisma } from '../generated/prisma/client';
import { getPrisma } from './db';
import { AppError, assertFound } from './errors';
import { requireStoreId } from './store';
import { computePricing, saleUnitPriceCents } from './pricing';

const cartInclude = {
  items: { include: { variant: { include: { product: true } } } },
} as const;

async function insertId(query: Prisma.Sql) {
  const rows = await getPrisma().$queryRaw<Array<{ id: string }>>(query);
  const id = rows[0]?.id;
  if (!id) throw new AppError(500, 'Insert did not return an id');
  return id;
}

async function cartCurrency(tenantId: string) {
  const settings = await getPrisma().storeSettings.findUnique({ where: { tenantId } });
  return settings?.currency || 'PKR';
}

async function loadCart(id: string) {
  return getPrisma().cart.findUniqueOrThrow({
    where: { id },
    include: cartInclude,
  });
}

export async function getOrCreateCart(sessionToken?: string, customerId?: string) {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  if (customerId) {
    const existing = await prisma.cart.findFirst({
      where: { tenantId, customerId },
      include: cartInclude,
      orderBy: { updatedAt: 'desc' },
    });
    if (existing) return existing;
    const currency = await cartCurrency(tenantId);
    const id = await insertId(Prisma.sql`
      INSERT INTO carts (tenant_id, customer_id, currency)
      VALUES (${tenantId}::uuid, ${customerId}::uuid, ${currency})
      RETURNING id
    `);
    return loadCart(id);
  }
  const token = sessionToken || crypto.randomUUID();
  const existing = await prisma.cart.findFirst({
    where: { tenantId, sessionToken: token },
    include: cartInclude,
  });
  if (existing) return existing;
  const currency = await cartCurrency(tenantId);
  const id = await insertId(Prisma.sql`
    INSERT INTO carts (tenant_id, session_token, currency)
    VALUES (${tenantId}::uuid, ${token}, ${currency})
    RETURNING id
  `);
  return loadCart(id);
}

export async function getCart(sessionToken?: string, customerId?: string) {
  return getOrCreateCart(sessionToken, customerId);
}

const addItemBody = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
});

export async function addCartItem(body: unknown, sessionToken?: string) {
  const parsed = addItemBody.parse(body);
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const variant = assertFound(
    await prisma.productVariant.findFirst({
      where: { id: parsed.variantId, tenantId, isActive: true },
      include: { product: { select: { id: true, categoryId: true } } },
    }),
  );
  const unitPriceCents = await saleUnitPriceCents(
    tenantId,
    { id: variant.product.id, categoryId: variant.product.categoryId },
    variant.priceCents,
  );
  const cart = await getOrCreateCart(sessionToken);
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
  });
  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + parsed.quantity, unitPriceCents },
    });
  } else {
    await insertId(Prisma.sql`
      INSERT INTO cart_items (tenant_id, cart_id, variant_id, quantity, unit_price_cents)
      VALUES (${tenantId}::uuid, ${cart.id}::uuid, ${variant.id}::uuid, ${parsed.quantity}, ${unitPriceCents})
      RETURNING id
    `);
  }
  return loadCart(cart.id);
}

const patchItemBody = z.object({ quantity: z.number().int().nonnegative() });

export async function updateCartItem(id: string, body: unknown) {
  const parsed = patchItemBody.parse(body);
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const item = assertFound(await prisma.cartItem.findFirst({ where: { id, tenantId } }));
  if (parsed.quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: parsed.quantity } });
  }
  return prisma.cart.findUniqueOrThrow({
    where: { id: item.cartId },
    include: cartInclude,
  });
}

export async function cartUpsells(sessionToken?: string) {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const cart = await prisma.cart.findFirst({
    where: { tenantId, ...(sessionToken ? { sessionToken } : {}) },
    include: { items: true },
    orderBy: { updatedAt: 'desc' },
  });
  const productIds = cart?.items.length
    ? (
        await prisma.productVariant.findMany({
          where: { id: { in: cart.items.map((i) => i.variantId) } },
          select: { productId: true },
        })
      ).map((v) => v.productId)
    : [];
  let upsells = await prisma.product.findMany({
    where: {
      tenantId,
      status: 'active',
      featured: true,
      NOT: productIds.length ? { id: { in: productIds } } : undefined,
    },
    include: { variants: { where: { isActive: true }, take: 1 } },
    take: 4,
  });
  if (!upsells.length) {
    upsells = await prisma.product.findMany({
      where: {
        tenantId,
        status: 'active',
        NOT: productIds.length ? { id: { in: productIds } } : undefined,
      },
      include: { variants: { where: { isActive: true }, take: 1 } },
      take: 4,
    });
  }
  return upsells;
}

export async function recoverCart(token: string) {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  return assertFound(
    await prisma.cart.findFirst({
      where: { tenantId, recoveryToken: token },
      include: cartInclude,
    }),
  );
}

const quoteBody = z.object({
  cartId: z.string().uuid(),
  country: z.string().default('US'),
  region: z.string().optional(),
  couponCode: z.string().optional(),
});

export async function checkoutQuote(body: unknown) {
  const parsed = quoteBody.parse(body);
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const cart = assertFound(
    await prisma.cart.findFirst({
      where: { id: parsed.cartId, tenantId },
      include: { items: true },
    }),
  );
  const subtotal = cart.items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
  return computePricing({
    tenantId,
    subtotalCents: subtotal,
    country: parsed.country,
    couponCode: parsed.couponCode,
  });
}

const optionalBlank = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (typeof v === 'string' ? v.trim() : ''));

const storefrontAddress = z.object({
  line1: z.string().trim().min(1),
  line2: z.string().optional(),
  city: z.string().trim().min(1),
  state: z.string().optional(),
  postalCode: optionalBlank,
  country: optionalBlank.transform(() => 'Pakistan'),
});

const checkoutBody = z.object({
  cartId: z.string().uuid(),
  email: z.string().email().optional(),
  couponCode: z.string().optional(),
  giftNote: z.string().optional(),
  shippingAddress: storefrontAddress,
  mockPay: z.boolean().default(true),
});

export async function checkout(body: unknown, customerId?: string) {
  const parsed = checkoutBody.parse(body);
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const cart = assertFound(
    await prisma.cart.findFirst({
      where: { id: parsed.cartId, tenantId },
      include: { items: { include: { variant: { include: { product: true } } } } },
    }),
  );
  if (!cart.items.length) throw new AppError(400, 'Cart is empty');

  let resolvedCustomerId = customerId || cart.customerId || undefined;
  if (!resolvedCustomerId && parsed.email) {
    const existingCustomer = await prisma.customer.findUnique({
      where: { tenantId_email: { tenantId, email: parsed.email } },
    });
    if (existingCustomer) {
      resolvedCustomerId = existingCustomer.id;
    } else {
      resolvedCustomerId = await insertId(Prisma.sql`
        INSERT INTO customers (tenant_id, email, full_name)
        VALUES (${tenantId}::uuid, ${parsed.email}, ${parsed.email.split('@')[0]})
        RETURNING id
      `);
    }
  }

  const subtotal = cart.items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
  const pricing = await computePricing({
    tenantId,
    subtotalCents: subtotal,
    country: parsed.shippingAddress.country,
    couponCode: parsed.couponCode,
  });
  const {
    shippingCents: shipping,
    taxCents: tax,
    discountCents: discount,
    totalCents: total,
    couponCode,
  } = pricing;
  let couponId: string | undefined;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { tenantId_code: { tenantId, code: couponCode } },
    });
    couponId = coupon?.id;
  }

  for (const item of cart.items) {
    const inv = await prisma.inventoryItem.findFirst({
      where: { tenantId, variantId: item.variantId },
    });
    if (inv && inv.quantity < item.quantity) {
      throw new AppError(400, `Insufficient stock for ${item.variant.sku}`);
    }
  }

  const storeSettings = await prisma.storeSettings.findUnique({ where: { tenantId } });
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const currency = storeSettings?.currency || cart.currency || 'USD';
  const notes = pricing.autoRuleName ? `Promo: ${pricing.autoRuleName}` : null;
  const shippingJson = JSON.stringify(parsed.shippingAddress);
  const orderId = await insertId(Prisma.sql`
    INSERT INTO orders (
      tenant_id, customer_id, order_number, status, currency,
      subtotal_cents, shipping_cents, tax_cents, discount_cents, total_cents,
      coupon_code, gift_note, shipping_address, notes
    )
    VALUES (
      ${tenantId}::uuid, ${resolvedCustomerId ?? null}::uuid, ${orderNumber},
      ${parsed.mockPay ? 'paid' : 'pending'}, ${currency},
      ${subtotal}, ${shipping}, ${tax}, ${discount}, ${total},
      ${couponCode || null}, ${parsed.giftNote || null}, ${shippingJson}::jsonb, ${notes}
    )
    RETURNING id
  `);

  for (const i of cart.items) {
    const attrs = JSON.stringify(i.variant.attributeValues ?? {});
    await insertId(Prisma.sql`
      INSERT INTO order_lines (
        tenant_id, order_id, variant_id, product_name, sku, quantity, unit_price_cents, attribute_values
      )
      VALUES (
        ${tenantId}::uuid, ${orderId}::uuid, ${i.variantId}::uuid,
        ${i.variant.product.name}, ${i.variant.sku}, ${i.quantity}, ${i.unitPriceCents}, ${attrs}::jsonb
      )
      RETURNING id
    `);
  }

  const payMeta = JSON.stringify({ discountCents: discount, couponId, autoRule: pricing.autoRuleName });
  await insertId(Prisma.sql`
    INSERT INTO payments (tenant_id, order_id, provider, provider_ref, amount_cents, status, metadata)
    VALUES (
      ${tenantId}::uuid, ${orderId}::uuid, 'cod', ${`cod_${crypto.randomUUID()}`},
      ${total}, ${parsed.mockPay ? 'succeeded' : 'pending'}, ${payMeta}::jsonb
    )
    RETURNING id
  `);

  const created = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { lines: true, payments: true },
  });

  if (couponId) {
    await prisma.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    });
  }
  for (const item of cart.items) {
    const inv = await prisma.inventoryItem.findFirst({
      where: { tenantId, variantId: item.variantId },
    });
    if (inv) {
      await prisma.inventoryItem.update({
        where: { id: inv.id },
        data: { quantity: inv.quantity - item.quantity },
      });
    }
  }
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return { status: 201 as const, body: created };
}

const wishlistInclude = {
  items: {
    include: { product: { include: { variants: { where: { isActive: true }, take: 1 } } } },
    orderBy: { createdAt: 'desc' as const },
  },
};

export async function getWishlist(customerId: string) {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  let wishlist = await prisma.wishlist.findUnique({
    where: { tenantId_customerId: { tenantId, customerId } },
    include: wishlistInclude,
  });
  if (!wishlist) {
    const id = await insertId(Prisma.sql`
      INSERT INTO wishlists (tenant_id, customer_id)
      VALUES (${tenantId}::uuid, ${customerId}::uuid)
      RETURNING id
    `);
    wishlist = await prisma.wishlist.findUniqueOrThrow({
      where: { id },
      include: wishlistInclude,
    });
  }
  return wishlist;
}

export async function addWishlistItem(customerId: string, productId: string) {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const product = assertFound(await prisma.product.findFirst({ where: { id: productId, tenantId } }));
  let wishlist = await prisma.wishlist.findUnique({
    where: { tenantId_customerId: { tenantId, customerId } },
  });
  if (!wishlist) {
    const id = await insertId(Prisma.sql`
      INSERT INTO wishlists (tenant_id, customer_id)
      VALUES (${tenantId}::uuid, ${customerId}::uuid)
      RETURNING id
    `);
    wishlist = await prisma.wishlist.findUniqueOrThrow({ where: { id } });
  }
  const existing = await prisma.wishlistItem.findUnique({
    where: { wishlistId_productId: { wishlistId: wishlist.id, productId: product.id } },
  });
  if (!existing) {
    await insertId(Prisma.sql`
      INSERT INTO wishlist_items (tenant_id, wishlist_id, product_id)
      VALUES (${tenantId}::uuid, ${wishlist.id}::uuid, ${product.id}::uuid)
      RETURNING id
    `);
  }
  return { ok: true };
}

export async function removeWishlistItem(customerId: string, productId: string) {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const wishlist = await prisma.wishlist.findUnique({
    where: { tenantId_customerId: { tenantId, customerId } },
  });
  if (wishlist) {
    await prisma.wishlistItem.deleteMany({
      where: { wishlistId: wishlist.id, productId },
    });
  }
}

export async function getAccount(customerId: string) {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const customer = assertFound(
    await prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: {
        addresses: true,
        orders: { include: { lines: true }, orderBy: { createdAt: 'desc' }, take: 20 },
      },
    }),
  );
  const { passwordHash: _, ...safe } = customer;
  return safe;
}

const accountBody = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
});

export async function updateAccount(customerId: string, body: unknown) {
  const parsed = accountBody.parse(body);
  const updated = await getPrisma().customer.update({
    where: { id: customerId },
    data: parsed,
  });
  return { id: updated.id, email: updated.email, fullName: updated.fullName, phone: updated.phone };
}

const addressBody = storefrontAddress.extend({
  label: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function addAddress(customerId: string, body: unknown) {
  const parsed = addressBody.parse(body);
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  if (parsed.isDefault) {
    await prisma.customerAddress.updateMany({
      where: { customerId, tenantId },
      data: { isDefault: false },
    });
  }
  const createdId = await insertId(Prisma.sql`
    INSERT INTO customer_addresses (
      tenant_id, customer_id, label, line1, line2, city, state, postal_code, country, is_default
    )
    VALUES (
      ${tenantId}::uuid, ${customerId}::uuid, ${parsed.label || null}, ${parsed.line1},
      ${parsed.line2 || null}, ${parsed.city}, ${parsed.state || null}, ${parsed.postalCode},
      ${parsed.country}, ${parsed.isDefault ?? false}
    )
    RETURNING id
  `);
  const created = await prisma.customerAddress.findUniqueOrThrow({ where: { id: createdId } });
  return { status: 201 as const, body: created };
}

export async function listOrders(customerId: string) {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  return prisma.order.findMany({
    where: { tenantId, customerId },
    include: { lines: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function loyaltyMe(customerId: string) {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const customer = assertFound(
    await prisma.customer.findFirst({ where: { id: customerId, tenantId } }),
  );
  const settings = await prisma.loyaltySettings.findUnique({ where: { tenantId } });
  return {
    points: customer.loyaltyPoints,
    storeCreditCents: customer.storeCreditCents,
    referralCode: customer.referralCode,
    settings,
  };
}

const newsletterBody = z.object({ email: z.string().email() });

export async function subscribeNewsletter(body: unknown) {
  const parsed = newsletterBody.parse(body);
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { tenantId_email: { tenantId, email: parsed.email } },
  });
  if (!existing) {
    await insertId(Prisma.sql`
      INSERT INTO newsletter_subscribers (tenant_id, email)
      VALUES (${tenantId}::uuid, ${parsed.email})
      RETURNING id
    `);
  }
  return { ok: true };
}

const reviewBody = z.object({
  authorName: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  body: z.string().optional(),
});

export async function createReview(productId: string, body: unknown, customerId?: string) {
  const parsed = reviewBody.parse(body);
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const product = assertFound(await prisma.product.findFirst({ where: { id: productId, tenantId } }));
  const id = await insertId(Prisma.sql`
    INSERT INTO product_reviews (tenant_id, product_id, customer_id, author_name, rating, title, body)
    VALUES (
      ${tenantId}::uuid, ${product.id}::uuid, ${customerId ?? null}::uuid,
      ${parsed.authorName}, ${parsed.rating}, ${parsed.title || null}, ${parsed.body || null}
    )
    RETURNING id
  `);
  const review = await prisma.productReview.findUniqueOrThrow({ where: { id } });
  return { status: 201 as const, body: review };
}

const stockNotifyBody = z.object({ variantId: z.string().uuid(), email: z.string().email() });

export async function stockNotify(body: unknown) {
  const parsed = stockNotifyBody.parse(body);
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const variant = assertFound(
    await prisma.productVariant.findFirst({ where: { id: parsed.variantId, tenantId } }),
  );
  const existing = await prisma.stockNotification.findUnique({
    where: {
      tenantId_variantId_email: {
        tenantId,
        variantId: variant.id,
        email: parsed.email,
      },
    },
  });
  if (existing) {
    await prisma.stockNotification.update({
      where: { id: existing.id },
      data: { notified: false },
    });
  } else {
    await insertId(Prisma.sql`
      INSERT INTO stock_notifications (tenant_id, variant_id, email, notified)
      VALUES (${tenantId}::uuid, ${variant.id}::uuid, ${parsed.email}, false)
      RETURNING id
    `);
  }
  return { ok: true, message: 'We will email you when this item is back in stock.' };
}

export async function searchSuggest(q: string) {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const query = q.trim();
  if (query.length < 2) return { products: [], categories: [] };
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        tenantId,
        status: 'active',
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { tags: { has: query.toLowerCase() } },
          { vendor: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        media: true,
        variants: { where: { isActive: true }, take: 1, select: { priceCents: true } },
      },
      take: 8,
    }),
    prisma.category.findMany({
      where: { tenantId, isActive: true, name: { contains: query, mode: 'insensitive' } },
      take: 5,
    }),
  ]);
  return { products, categories };
}

export async function listPages() {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  return prisma.contentPage.findMany({
    where: { tenantId, status: 'published' },
    select: { id: true, title: true, slug: true },
  });
}

export async function pageBySlug(slug: string) {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  return assertFound(
    await prisma.contentPage.findFirst({
      where: { tenantId, slug, status: 'published' },
    }),
  );
}

const giftCardBody = z.object({ code: z.string().min(3) });

export async function lookupGiftCard(body: unknown) {
  const parsed = giftCardBody.parse(body);
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  const card = assertFound(
    await prisma.giftCard.findFirst({
      where: { tenantId, code: parsed.code.toUpperCase(), isActive: true },
    }),
  );
  return { code: card.code, balanceCents: card.balanceCents, currency: card.currency };
}

export async function fulfillmentOptions() {
  const prisma = getPrisma();
  const tenantId = await requireStoreId();
  return prisma.fulfillmentOption.findMany({ where: { tenantId, isActive: true } });
}
