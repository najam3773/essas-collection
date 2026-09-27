import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const configs = await p.themeConfig.findMany({ include: { tenant: true, theme: true } });
  const rows = configs.filter((c) => c.theme?.themeKey === '3d-fashion');
  console.log(
    'before',
    rows.map((c) => ({ slug: c.tenant.slug, p: c.primaryColor, bg: c.backgroundColor })),
  );
  for (const c of rows) {
    await p.themeConfig.update({
      where: { id: c.id },
      data: {
        primaryColor: '#c9894a',
        secondaryColor: '#e8a87c',
        backgroundColor: '#f6ebe3',
        fontHeading: 'Cormorant Garamond',
        fontBody: 'Outfit',
      },
    });
  }
  console.log('updated', rows.length);
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
