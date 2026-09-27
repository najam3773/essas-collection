const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const PRESET_BG = {
  default: '#fbf8f2',
  'luxury-minimal': '#f7f5f2',
  'fashion-bold': '#0a0a0a',
};

(async () => {
  const rows = await p.themeConfig.findMany({
    include: { theme: true, tenant: { select: { slug: true } } },
  });
  for (const r of rows) {
    const key = r.theme?.themeKey || 'default';
    const want = PRESET_BG[key] || PRESET_BG.default;
    const current = (r.backgroundColor || '').toLowerCase();
    // Only replace untouched schema default so custom backgrounds stay
    if (current === '#fbf8f2' && want.toLowerCase() !== '#fbf8f2') {
      await p.themeConfig.update({
        where: { id: r.id },
        data: { backgroundColor: want },
      });
      console.log(`Updated ${r.tenant.slug}: bg ${current} -> ${want} (${key})`);
    } else {
      console.log(`Skip ${r.tenant.slug}: bg ${current} (${key})`);
    }
  }
  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
