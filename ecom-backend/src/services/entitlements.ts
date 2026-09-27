import { prisma } from '../lib/db.js';

export async function syncTenantEntitlementsFromPlan(tenantId: string, planId: string) {
  const planFeatures = await prisma.planFeature.findMany({ where: { planId } });

  for (const pf of planFeatures) {
    await prisma.tenantEntitlement.upsert({
      where: { tenantId_featureKey: { tenantId, featureKey: pf.featureKey } },
      create: {
        tenantId,
        featureKey: pf.featureKey,
        enabled: pf.enabled,
        source: 'plan',
      },
      update: {
        enabled: pf.enabled,
        source: 'plan',
      },
    });

    if (pf.limitValue != null) {
      await prisma.tenantFeatureLimit.upsert({
        where: { tenantId_limitKey: { tenantId, limitKey: pf.featureKey } },
        create: { tenantId, limitKey: pf.featureKey, value: pf.limitValue },
        update: { value: pf.limitValue },
      });
    }
  }
}

export async function getEffectiveEntitlements(tenantId: string) {
  const [ents, limits, screens] = await Promise.all([
    prisma.tenantEntitlement.findMany({ where: { tenantId, enabled: true } }),
    prisma.tenantFeatureLimit.findMany({ where: { tenantId } }),
    prisma.tenantScreenOverride.findMany({ where: { tenantId } }),
  ]);
  return {
    entitlements: ents.map((e) => e.featureKey),
    limits: Object.fromEntries(limits.map((l) => [l.limitKey, l.value])),
    screens: screens.filter((s) => s.enabled).map((s) => s.screenKey),
  };
}
