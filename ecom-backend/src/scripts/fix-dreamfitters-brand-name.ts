import { syncTenantBrandName } from '../lib/sync-brand-name.js';
import { prisma } from '../lib/db.js';

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'dreamfitters' } });
  if (!tenant) throw new Error('dreamfitters not found');
  const branding = await prisma.themeConfig.findUnique({ where: { tenantId: tenant.id } });
  await syncTenantBrandName(tenant.id, tenant.name, [branding?.brandName, 'Urban Thread', 'UrbanThread']);
  const after = await prisma.themeConfig.findUnique({ where: { tenantId: tenant.id } });
  console.log(JSON.stringify({ slug: tenant.slug, name: tenant.name, brandName: after?.brandName }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
