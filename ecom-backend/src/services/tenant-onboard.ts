import { prisma } from '../lib/db.js';
import { hashPassword } from '../lib/auth.js';
import { syncTenantEntitlementsFromPlan } from './entitlements.js';
import { getThemePreset } from '../lib/theme-presets.js';
import { AppError } from '../lib/errors.js';

const INDUSTRY_TEMPLATES: Record<string, { categories: string[]; attributes: { name: string; key: string; type: string; options: string[] }[] }> = {
  fashion: {
    categories: ['Lawn', 'Khaddar', 'Linen', 'Viscose', 'Cotton', 'Chiffon', 'Silk', 'Organza'],
    attributes: [
      { name: 'Fabric', key: 'fabric', type: 'select', options: ['Lawn', 'Khaddar', 'Linen', 'Viscose', 'Cotton', 'Chiffon', 'Silk', 'Organza'] },
      { name: 'Piece Type', key: 'pieces', type: 'select', options: ['1 Piece', '2 Piece', '3 Piece', 'Dupatta'] },
      { name: 'Color', key: 'color', type: 'select', options: ['Ivory', 'Sage Green', 'Dusty Rose', 'Deep Maroon', 'Charcoal', 'Black'] },
      { name: 'Pattern', key: 'pattern', type: 'select', options: ['Printed', 'Embroidered', 'Solid', 'Woven'] },
      { name: 'Season', key: 'season', type: 'select', options: ['Summer', 'Winter', 'Autumn', 'All Season'] },
    ],
  },
  jewelry: {
    categories: ['Rings', 'Necklaces', 'Bracelets'],
    attributes: [
      { name: 'Metal', key: 'metal', type: 'select', options: ['Gold', 'Silver', 'Platinum'] },
      { name: 'Stone', key: 'stone', type: 'select', options: ['Diamond', 'Ruby', 'Sapphire', 'None'] },
      { name: 'Ring Size', key: 'ring_size', type: 'select', options: ['5', '6', '7', '8', '9'] },
    ],
  },
  electronics: {
    categories: ['Phones', 'Laptops', 'Accessories'],
    attributes: [
      { name: 'Storage', key: 'storage', type: 'select', options: ['128GB', '256GB', '512GB', '1TB'] },
      { name: 'RAM', key: 'ram', type: 'select', options: ['8GB', '16GB', '32GB'] },
      { name: 'Color', key: 'color', type: 'select', options: ['Black', 'Silver', 'Blue'] },
    ],
  },
};

const OWNER_PERMS = [
  'products.read', 'products.write', 'products.delete', 'categories.write',
  'orders.read', 'orders.write', 'orders.refund', 'customers.read', 'customers.write',
  'coupons.write', 'content.write', 'branding.write', 'staff.write', 'reports.view', 'settings.write',
];

export async function onboardTenant(input: {
  name: string;
  slug: string;
  subdomain: string;
  customDomain: string;
  planKey: string;
  industryTemplate?: string;
  ownerEmail: string;
  ownerName: string;
  ownerPassword: string;
  brandName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  themeKey?: string;
}) {
  const plan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { key: input.planKey } });
  const themeKey =
    input.themeKey || (input.industryTemplate === 'jewelry' ? 'luxury-minimal' : 'default');
  const theme = await prisma.theme.findUnique({ where: { themeKey } });
  const preset = getThemePreset(themeKey);

  const domainClash = await prisma.tenant.findFirst({ where: { customDomain: input.customDomain } });
  if (domainClash) {
    throw new AppError(409, `Store domain "${input.customDomain}" is already in use`);
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: input.name,
      slug: input.slug,
      subdomain: input.subdomain,
      customDomain: input.customDomain,
      planId: plan.id,
      industryTemplate: input.industryTemplate,
      status: 'active',
      subscription: {
        create: { planId: plan.id, status: 'active', currentPeriodStart: new Date() },
      },
    },
  });

  await syncTenantEntitlementsFromPlan(tenant.id, plan.id);

  const role = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      key: 'owner',
      name: 'Tenant Owner',
      isSystem: true,
      permissions: {
        create: OWNER_PERMS.map((permissionKey) => ({ permissionKey, scopeRule: 'tenant' })),
      },
    },
  });

  const owner = await prisma.tenantUser.create({
    data: {
      tenantId: tenant.id,
      email: input.ownerEmail,
      fullName: input.ownerName,
      passwordHash: await hashPassword(input.ownerPassword),
      roleId: role.id,
    },
  });

  await prisma.themeConfig.create({
    data: {
      tenantId: tenant.id,
      themeId: theme?.id,
      brandName: input.brandName || input.name,
      primaryColor: input.primaryColor || preset.colors.primary,
      secondaryColor: input.secondaryColor || preset.colors.secondary,
      backgroundColor: input.backgroundColor || preset.colors.background,
      fontHeading: preset.fonts.heading,
      fontBody: preset.fonts.body,
    },
  });

  await prisma.tenantPageSection.create({
    data: {
      tenantId: tenant.id,
      pageKey: 'home',
      sections: [
        {
          type: 'hero-banner',
          settings: {
            title: input.brandName || input.name,
            subtitle: 'Discover our collection',
            ctaLabel: 'Shop new arrivals',
            ctaHref: '/shop',
          },
        },
        { type: 'featured-products', settings: { limit: 8 } },
        { type: 'lookbook', settings: { title: 'Designed to be lived in', sideTitle: 'Crafted for everyday wear' } },
        { type: 'newsletter', settings: { title: 'Stay in the loop' } },
      ],
    },
  });

  const template = INDUSTRY_TEMPLATES[input.industryTemplate || ''] || INDUSTRY_TEMPLATES.fashion;
  for (const [i, name] of template.categories.entries()) {
    await prisma.category.create({
      data: {
        tenantId: tenant.id,
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        sortOrder: i,
      },
    });
  }
  for (const attr of template.attributes) {
    await prisma.attributeDefinition.create({
      data: {
        tenantId: tenant.id,
        name: attr.name,
        key: attr.key,
        type: attr.type,
        options: attr.options,
      },
    });
  }

  const menu = await prisma.menu.create({
    data: { tenantId: tenant.id, key: 'main', name: 'Main Menu' },
  });
  await prisma.menuItem.createMany({
    data: [
      { tenantId: tenant.id, menuId: menu.id, label: 'Shop', href: '/shop', sortOrder: 0 },
      { tenantId: tenant.id, menuId: menu.id, label: 'About', href: '/pages/about', sortOrder: 1 },
    ],
  });

  return { tenant, owner, role };
}
