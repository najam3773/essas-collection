import { getPrisma } from './db';
import { decorateProductPricing, type SaleRecord } from './sales';

export async function loadTenantSales(tenantId: string): Promise<SaleRecord[]> {
  return getPrisma().sale.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true,
      name: true,
      percentOff: true,
      scope: true,
      productId: true,
      categoryId: true,
      startsAt: true,
      endsAt: true,
      isActive: true,
    },
  });
}

export async function saleUnitPriceCents(
  tenantId: string,
  product: { id: string; categoryId?: string | null },
  basePriceCents: number,
) {
  const sales = await loadTenantSales(tenantId);
  const priced = decorateProductPricing(
    { ...product, fromPriceCents: basePriceCents, variants: [{ priceCents: basePriceCents }] },
    sales,
  );
  return priced.fromPriceCents;
}

async function storeSettings(tenantId: string) {
  const settings = await getPrisma().storeSettings.findUnique({ where: { tenantId } });
  return (
    settings || {
      tenantId,
      announcementEnabled: false,
      announcementText: null,
      freeShippingThresholdCents: 7500,
      giftNotesEnabled: true,
      supportEmail: null,
      currency: 'PKR',
    }
  );
}

export async function computePricing(opts: {
  tenantId: string;
  subtotalCents: number;
  country: string;
  couponCode?: string;
}) {
  const prisma = getPrisma();
  const settings = await storeSettings(opts.tenantId);
  const zone = await prisma.shippingZone.findFirst({
    where: { tenantId: opts.tenantId, isActive: true, countries: { has: opts.country } },
  });
  let shipping = zone?.rateCents ?? 599;
  const taxRule = await prisma.taxRule.findFirst({
    where: { tenantId: opts.tenantId, isActive: true, country: opts.country },
  });
  const tax = Math.round((opts.subtotalCents * (taxRule?.rateBps || 825)) / 10000);

  let discount = 0;
  let couponCode: string | undefined;
  let autoRuleName: string | undefined;

  if (opts.couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { tenantId_code: { tenantId: opts.tenantId, code: opts.couponCode.toUpperCase() } },
    });
    if (coupon?.isActive && (coupon.maxUses == null || coupon.usedCount < coupon.maxUses)) {
      discount =
        coupon.type === 'percent'
          ? Math.round((opts.subtotalCents * coupon.value) / 100)
          : Math.min(coupon.value, opts.subtotalCents);
      couponCode = coupon.code;
    }
  }

  const rules = await prisma.discountRule.findMany({
    where: { tenantId: opts.tenantId, isActive: true },
    orderBy: { value: 'desc' },
  });
  const now = new Date();
  for (const rule of rules) {
    if (rule.startsAt && rule.startsAt > now) continue;
    if (rule.endsAt && rule.endsAt < now) continue;
    if (opts.subtotalCents < rule.minSubtotalCents) continue;
    if (rule.type === 'free_shipping') {
      shipping = 0;
      autoRuleName = rule.name;
    } else if (rule.type === 'percent_off_order') {
      const d = Math.round((opts.subtotalCents * rule.value) / 100);
      if (d > discount) {
        discount = d;
        autoRuleName = rule.name;
        couponCode = undefined;
      }
    } else if (rule.type === 'fixed_off_order') {
      const d = Math.min(rule.value, opts.subtotalCents);
      if (d > discount) {
        discount = d;
        autoRuleName = rule.name;
        couponCode = undefined;
      }
    }
  }

  if (
    settings.freeShippingThresholdCents != null &&
    opts.subtotalCents >= settings.freeShippingThresholdCents
  ) {
    shipping = 0;
    autoRuleName = autoRuleName || 'Free shipping threshold';
  }

  const total = Math.max(0, opts.subtotalCents - discount) + shipping + tax;
  return {
    subtotalCents: opts.subtotalCents,
    discountCents: discount,
    shippingCents: shipping,
    taxCents: tax,
    totalCents: total,
    couponCode,
    autoRuleName,
    freeShippingThresholdCents: settings.freeShippingThresholdCents,
    amountToFreeShipping: settings.freeShippingThresholdCents
      ? Math.max(0, settings.freeShippingThresholdCents - opts.subtotalCents)
      : null,
    giftNotesEnabled: settings.giftNotesEnabled,
  };
}
