import { prisma } from './db.js';
import { decorateProductPricing, type SaleRecord } from './sales.js';

export async function loadTenantSales(tenantId: string): Promise<SaleRecord[]> {
  return prisma.sale.findMany({
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

export { decorateProductPricing };
