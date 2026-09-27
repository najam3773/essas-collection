/** Product / category / store-wide percent sales with date ranges. */
export type SaleRecord = {
  id: string;
  name: string;
  percentOff: number;
  scope: string;
  productId?: string | null;
  categoryId?: string | null;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  isActive: boolean;
};

export type PricedVariant = {
  priceCents: number;
  compareAtCents?: number | null;
};

export function isSaleActive(sale: SaleRecord, now = new Date()) {
  if (!sale.isActive || sale.percentOff <= 0) return false;
  if (sale.startsAt && new Date(sale.startsAt) > now) return false;
  if (sale.endsAt && new Date(sale.endsAt) < now) return false;
  return true;
}

/** Prefer product sale, then category, then store-wide; highest % within that level. */
export function pickSaleForProduct(
  sales: SaleRecord[],
  product: { id: string; categoryId?: string | null },
  now = new Date(),
) {
  const active = sales.filter((s) => isSaleActive(s, now));
  const byPercent = (a: SaleRecord, b: SaleRecord) => b.percentOff - a.percentOff;

  const productSale = active
    .filter((s) => s.scope === 'product' && s.productId === product.id)
    .sort(byPercent)[0];
  if (productSale) return productSale;

  if (product.categoryId) {
    const categorySale = active
      .filter((s) => s.scope === 'category' && s.categoryId === product.categoryId)
      .sort(byPercent)[0];
    if (categorySale) return categorySale;
  }

  return active.filter((s) => s.scope === 'all').sort(byPercent)[0] || null;
}

export function applyPercentOff(priceCents: number, percentOff: number) {
  const pct = Math.max(0, Math.min(100, Math.round(percentOff)));
  if (pct <= 0) return priceCents;
  return Math.max(0, Math.round((priceCents * (100 - pct)) / 100));
}

export function priceWithSale(
  basePriceCents: number,
  sale: SaleRecord | null | undefined,
  compareAtCents?: number | null,
) {
  const originalCents =
    compareAtCents && compareAtCents > basePriceCents ? compareAtCents : basePriceCents;
  if (!sale || sale.percentOff <= 0) {
    return {
      priceCents: basePriceCents,
      originalCents: compareAtCents && compareAtCents > basePriceCents ? compareAtCents : basePriceCents,
      salePercent: 0,
      saleId: null as string | null,
      saleName: null as string | null,
      onSale: !!(compareAtCents && compareAtCents > basePriceCents),
    };
  }
  const priceCents = applyPercentOff(basePriceCents, sale.percentOff);
  return {
    priceCents,
    originalCents: Math.max(originalCents, basePriceCents),
    salePercent: sale.percentOff,
    saleId: sale.id,
    saleName: sale.name,
    onSale: priceCents < basePriceCents || priceCents < originalCents,
  };
}

export function decorateProductPricing<
  T extends {
    id: string;
    categoryId?: string | null;
    variants?: PricedVariant[];
    fromPriceCents?: number;
  },
>(product: T, sales: SaleRecord[]) {
  const sale = pickSaleForProduct(sales, product);
  const variants = product.variants || [];
  const baseFrom =
    product.fromPriceCents ??
    (variants.length ? Math.min(...variants.map((v) => v.priceCents)) : 0);
  const compareFrom = variants.find((v) => v.priceCents === baseFrom)?.compareAtCents
    ?? variants.find((v) => v.compareAtCents && v.compareAtCents > 0)?.compareAtCents
    ?? null;
  const priced = priceWithSale(baseFrom, sale, compareFrom);
  const pricedVariants = variants.map((v) => {
    const vp = priceWithSale(v.priceCents, sale, v.compareAtCents);
    return {
      ...v,
      salePriceCents: vp.priceCents,
      saleOriginalCents: vp.originalCents,
      salePercent: vp.salePercent,
    };
  });
  return {
    ...product,
    variants: pricedVariants,
    fromPriceCents: priced.priceCents,
    originalPriceCents: priced.originalCents,
    salePercent: priced.salePercent,
    saleName: priced.saleName,
    onSale: priced.onSale,
  };
}
