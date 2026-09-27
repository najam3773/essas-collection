import { Prisma } from '@prisma/client';
import { prisma } from '../lib/db.js';

type Section = {
  type?: string;
  settings?: Record<string, unknown>;
  [key: string]: unknown;
};

function isHero(section: Section) {
  return String(section?.type || '')
    .toLowerCase()
    .includes('hero');
}

/** Keep CMS hero titles in sync when the live brand name changes. */
export async function syncTenantBrandName(
  tenantId: string,
  nextBrandName: string,
  previousNames: Array<string | null | undefined> = [],
) {
  const brand = nextBrandName.trim();
  if (!brand) return;

  const prev = new Set(
    previousNames
      .map((n) => (n || '').trim())
      .filter((n) => n.length > 0 && n.toLowerCase() !== brand.toLowerCase()),
  );

  await prisma.themeConfig.upsert({
    where: { tenantId },
    create: {
      tenantId,
      brandName: brand,
      primaryColor: '#0f766e',
      secondaryColor: '#134e4a',
      backgroundColor: '#fbf8f2',
      fontHeading: 'Cormorant Garamond',
      fontBody: 'Outfit',
    },
    update: { brandName: brand },
  });

  const pages = await prisma.tenantPageSection.findMany({ where: { tenantId } });
  for (const page of pages) {
    const sections = (Array.isArray(page.sections) ? page.sections : []) as Section[];
    let changed = false;
    const next = sections.map((section) => {
      if (!isHero(section)) return section;
      const settings = { ...(section.settings || {}) };
      const title = typeof settings.title === 'string' ? settings.title.trim() : '';
      const headline = typeof settings.headline === 'string' ? settings.headline.trim() : '';

      // Always refresh empty hero titles, or titles that still show a previous brand name.
      if (!title || prev.has(title)) {
        settings.title = brand;
        changed = true;
      }
      if (!headline || prev.has(headline)) {
        settings.headline = brand;
        changed = true;
      }
      return changed ? { ...section, settings } : section;
    });

    if (changed) {
      await prisma.tenantPageSection.update({
        where: { id: page.id },
        data: { sections: next as Prisma.InputJsonValue },
      });
    }
  }
}
