import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    where: { OR: [{ slug: 'dreamfitters' }, { slug: 'urbanthread' }, { slug: 'store-dreamfitters' }] },
    select: {
      slug: true,
      name: true,
      themeConfig: { select: { brandName: true } },
      pageSections: { where: { pageKey: 'home' }, select: { sections: true } },
    },
  });
  for (const t of tenants) {
    const sections = (t.pageSections[0]?.sections as any[]) || [];
    const heroes = sections.filter((s) => String(s?.type || '').includes('hero'));
    console.log(
      JSON.stringify(
        {
          slug: t.slug,
          name: t.name,
          brandName: t.themeConfig?.brandName,
          heroTitles: heroes.map((h) => h.settings?.title || h.settings?.headline),
        },
        null,
        2,
      ),
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
