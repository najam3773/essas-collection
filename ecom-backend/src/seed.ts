import { prisma } from './lib/db.js';
import { hashPassword } from './lib/auth.js';
import { onboardTenant } from './services/tenant-onboard.js';
import { applyEssaStorefront } from './seed-essa-catalog.js';

const FEATURES = [
  ['catalog.products', 'Products & variants', 'Catalog'],
  ['catalog.categories', 'Category management', 'Catalog'],
  ['catalog.attributes', 'Custom attributes', 'Catalog'],
  ['catalog.bulk_import', 'Bulk product import', 'Catalog'],
  ['inventory.tracking', 'Stock tracking', 'Inventory'],
  ['inventory.multi_warehouse', 'Multi-warehouse', 'Inventory'],
  ['orders.management', 'Order management', 'Orders'],
  ['orders.refunds', 'Refunds', 'Orders'],
  ['customers.crm', 'Customer management', 'Customers'],
  ['marketing.coupons', 'Discount coupons', 'Marketing'],
  ['marketing.abandoned_cart', 'Abandoned cart emails', 'Marketing'],
  ['content.cms', 'CMS pages', 'Content'],
  ['content.page_builder', 'Homepage builder', 'Content'],
  ['storefront.reviews', 'Product reviews', 'Storefront'],
  ['storefront.wishlist', 'Wishlist', 'Storefront'],
  ['reports.basic', 'Basic analytics', 'Reports'],
  ['reports.advanced', 'Advanced analytics', 'Reports'],
  ['integrations.api', 'REST API access', 'Integrations'],
  ['integrations.webhooks', 'Webhooks', 'Integrations'],
  ['branding.custom_domain', 'Custom domain', 'Branding'],
  ['branding.custom_css', 'Custom CSS', 'Branding'],
  ['themes.basic', '2 default themes', 'Themes'],
  ['themes.full_catalog', 'All published themes', 'Themes'],
  ['features.outfit_combiner', 'Outfit Combination Studio', 'Features'],
  ['features.virtual_checkout', 'Virtual Checkout', 'Features'],
] as const;

const PERMISSIONS = [
  ['products.read', 'View products', 'Catalog'],
  ['products.write', 'Create/edit products', 'Catalog'],
  ['products.delete', 'Delete products', 'Catalog'],
  ['categories.write', 'Manage categories', 'Catalog'],
  ['orders.read', 'View orders', 'Orders'],
  ['orders.write', 'Update orders', 'Orders'],
  ['orders.refund', 'Refund orders', 'Orders'],
  ['customers.read', 'View customers', 'Customers'],
  ['customers.write', 'Edit customers', 'Customers'],
  ['coupons.write', 'Manage coupons', 'Marketing'],
  ['content.write', 'Manage CMS', 'Content'],
  ['branding.write', 'Edit branding', 'Branding'],
  ['staff.write', 'Manage staff', 'Staff'],
  ['reports.view', 'View reports', 'Reports'],
  ['settings.write', 'Tenant settings', 'Settings'],
] as const;

async function ensureCatalog() {
  for (const [key, name, category] of FEATURES) {
    await prisma.feature.upsert({
      where: { key },
      create: { key, name, category, description: name },
      update: { name, category },
    });
  }
  for (const [key, name, category] of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, name, category },
      update: { name, category },
    });
  }

  const plans = [
    { key: 'starter', name: 'Starter', description: 'Subdomain, 2 themes, 100 products, 2 staff', priceMonthlyCents: 2900 },
    { key: 'professional', name: 'Professional', description: 'Custom domain, CMS, coupons, 10 staff', priceMonthlyCents: 9900 },
    { key: 'enterprise', name: 'Enterprise', description: 'Custom CSS, API, feature services, SLA', priceMonthlyCents: 29900 },
  ];
  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { key: p.key },
      create: p,
      update: p,
    });
  }

  const starter = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { key: 'starter' } });
  const pro = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { key: 'professional' } });
  const ent = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { key: 'enterprise' } });

  const starterKeys = [
    'catalog.products', 'catalog.categories', 'inventory.tracking',
    'orders.management', 'customers.crm', 'themes.basic', 'reports.basic',
  ];
  const proKeys = [
    ...starterKeys, 'catalog.attributes', 'orders.refunds', 'marketing.coupons',
    'content.cms', 'content.page_builder', 'themes.full_catalog',
    'branding.custom_domain', 'storefront.reviews', 'storefront.wishlist',
  ];

  async function setPlanFeatures(planId: string, keys: string[], productLimit: number | null = null) {
    for (const featureKey of keys) {
      await prisma.planFeature.upsert({
        where: { planId_featureKey: { planId, featureKey } },
        create: {
          planId,
          featureKey,
          enabled: true,
          limitValue: featureKey === 'catalog.products' ? productLimit : null,
        },
        update: {
          enabled: true,
          limitValue: featureKey === 'catalog.products' ? productLimit : null,
        },
      });
    }
  }
  await setPlanFeatures(starter.id, starterKeys, 100);
  await setPlanFeatures(pro.id, proKeys, 5000);
  await setPlanFeatures(ent.id, FEATURES.map((f) => f[0]), null);

  const themes = [
    {
      themeKey: 'default',
      name: 'Default Store',
      industryTags: ['general'],
      layouts: ['home', 'collection', 'product', 'cart', 'page'],
      sections: ['hero-banner', 'featured-products', 'newsletter'],
      settingsSchema: { hero_style: { type: 'select', options: ['full-bleed', 'split'] } },
      isPublished: true,
    },
    {
      themeKey: 'luxury-minimal',
      name: 'Luxury Minimal',
      industryTags: ['jewelry', 'beauty', 'fashion'],
      layouts: ['home', 'collection', 'product', 'cart', 'page'],
      sections: ['hero-split', 'image-with-text', 'testimonials', 'featured-collection'],
      settingsSchema: {
        hero_style: { type: 'select', options: ['full-bleed', 'split'] },
        product_card_style: { type: 'select', options: ['minimal', 'overlay'] },
      },
      isPublished: true,
      version: '1.2.0',
    },
    {
      themeKey: 'fashion-bold',
      name: 'Fashion Bold',
      industryTags: ['fashion', 'apparel'],
      layouts: ['home', 'collection', 'product', 'cart', 'page'],
      sections: ['hero-video', 'lookbook', 'featured-collection'],
      settingsSchema: {},
      isPublished: true,
    },
    {
      themeKey: '3d-fashion',
      name: '3D Fashion',
      industryTags: ['fashion', 'apparel', 'streetwear'],
      layouts: ['home', 'collection', 'product', 'cart', 'page'],
      sections: ['hero-3d-stage', 'lookbook-orbit', 'drop-wall', 'newsletter'],
      settingsSchema: {
        hero_style: { type: 'select', options: ['stage', 'orbit'] },
        product_card_style: { type: 'select', options: ['tilt', 'overlay'] },
      },
      isPublished: true,
      version: '1.0.0',
    },
    {
      themeKey: 'essa',
      name: "Essa's Collection",
      industryTags: ['fashion', 'unstitched', 'pakistan'],
      layouts: ['home', 'collection', 'product', 'cart', 'page'],
      sections: ['hero-banner', 'shop-by-fabric', 'shop-by-style', 'new-arrivals', 'featured-collection'],
      settingsSchema: {},
      isPublished: true,
      version: '1.0.0',
    },
  ];
  for (const t of themes) {
    await prisma.theme.upsert({
      where: { themeKey: t.themeKey },
      create: t,
      update: t,
    });
  }

  await prisma.featureService.upsert({
    where: { serviceKey: 'outfit-combiner' },
    create: {
      serviceKey: 'outfit-combiner',
      name: 'Outfit Combination Studio',
      entitlementKey: 'features.outfit_combiner',
      requiredCoreFeatures: ['catalog.products'],
      platformApiScopes: ['products.read', 'cart.write', 'tenant.read'],
      storefrontExtensions: [{ slot: 'product.detail.actions', bundle: '/widgets/outfit-combiner.js' }],
    },
    update: {},
  });
  await prisma.featureService.upsert({
    where: { serviceKey: 'virtual-checkout' },
    create: {
      serviceKey: 'virtual-checkout',
      name: 'Virtual Checkout',
      entitlementKey: 'features.virtual_checkout',
      requiredCoreFeatures: ['orders.management'],
      platformApiScopes: ['cart.read', 'orders.write'],
      storefrontExtensions: [{ slot: 'checkout.alternatives', bundle: '/widgets/virtual-checkout.js' }],
    },
    update: {},
  });

  const pwd = await hashPassword('Password123!');
  await prisma.platformUser.upsert({
    where: { email: 'admin@platform.com' },
    create: {
      email: 'admin@platform.com',
      passwordHash: pwd,
      fullName: 'Platform Super Admin',
      role: 'super_admin',
    },
    update: { passwordHash: pwd },
  });
}

async function ensureEssaStore() {
  const existing = await prisma.tenant.findUnique({ where: { slug: 'essas-collection' } });
  if (existing) {
    console.log("Essa's Collection store already exists — skipping create");
    return existing;
  }

  const fashion = await onboardTenant({
    name: "Essa's Collection",
    slug: 'essas-collection',
    subdomain: 'essas-collection',
    customDomain: 'essascollection.localhost',
    planKey: 'enterprise',
    industryTemplate: 'fashion',
    ownerEmail: 'owner@essascollection.com',
    ownerName: 'Essa',
    ownerPassword: 'Password123!',
    brandName: "Essa's Collection",
    primaryColor: '#4A1C28',
    secondaryColor: '#B08968',
    backgroundColor: '#F6F0E8',
    themeKey: 'essa',
  });

  await prisma.customer.upsert({
    where: { tenantId_email: { tenantId: fashion.tenant.id, email: 'shopper@example.com' } },
    create: {
      tenantId: fashion.tenant.id,
      email: 'shopper@example.com',
      fullName: 'Amina Shopper',
      passwordHash: await hashPassword('Password123!'),
    },
    update: {},
  });

  console.log("Created Essa's Collection store");
  return fashion.tenant;
}

async function enrichTenantCommerce(tenantSlug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) return;
  if (tenantSlug === 'essas-collection') {
    await applyEssaStorefront(tenant.id);
    return;
  }

  // Ensure wishlist/reviews entitlements for pro demo
  for (const featureKey of ['storefront.wishlist', 'storefront.reviews', 'marketing.coupons', 'content.cms', 'content.page_builder', 'inventory.tracking', 'reports.basic']) {
    await prisma.tenantEntitlement.upsert({
      where: { tenantId_featureKey: { tenantId: tenant.id, featureKey } },
      create: { tenantId: tenant.id, featureKey, enabled: true, source: 'override' },
      update: { enabled: true },
    }).catch(() => undefined);
  }

  const zoneCount = await prisma.shippingZone.count({ where: { tenantId: tenant.id } });
  if (!zoneCount) {
    await prisma.shippingZone.createMany({
      data: [
        { tenantId: tenant.id, name: 'US Standard', countries: ['US'], rateCents: 599 },
        { tenantId: tenant.id, name: 'Canada', countries: ['CA'], rateCents: 1299 },
        { tenantId: tenant.id, name: 'UK', countries: ['GB'], rateCents: 1499 },
      ],
    });
  }

  const taxCount = await prisma.taxRule.count({ where: { tenantId: tenant.id } });
  if (!taxCount) {
    await prisma.taxRule.create({
      data: { tenantId: tenant.id, name: 'US Sales Tax', country: 'US', rateBps: 825 },
    });
  }

  await prisma.coupon.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'WELCOME10' } },
    create: { tenantId: tenant.id, code: 'WELCOME10', type: 'percent', value: 10, maxUses: 1000 },
    update: { isActive: true },
  });
  await prisma.coupon.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'SAVE20' } },
    create: { tenantId: tenant.id, code: 'SAVE20', type: 'fixed', value: 2000, maxUses: 200 },
    update: { isActive: true },
  });

  for (const page of [
    {
      title: 'About us',
      slug: 'about',
      bodyHtml:
        '<p>We design and curate products with lasting materials and careful craft. This brand storefront is fully white-labeled on our multi-tenant commerce platform.</p>',
    },
    {
      title: 'Shipping & returns',
      slug: 'shipping',
      bodyHtml:
        '<p>Orders ship in 1–3 business days. Standard delivery takes 3–7 days. Returns accepted within 30 days for unused items.</p>',
    },
  ]) {
    await prisma.contentPage.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: page.slug } },
      create: { tenantId: tenant.id, ...page, status: 'published' },
      update: { ...page, status: 'published' },
    });
  }

  const productCount = await prisma.product.count({ where: { tenantId: tenant.id } });
  if (tenantSlug === 'luxjewels' && productCount < 6) {
    const bracelets = await prisma.category.findFirst({ where: { tenantId: tenant.id, slug: 'bracelets' } });
    const necklaces = await prisma.category.findFirst({ where: { tenantId: tenant.id, slug: 'necklaces' } });
    const extras = [
      {
        name: 'Noir Tennis Bracelet',
        slug: 'noir-tennis-bracelet',
        categoryId: bracelets?.id,
        description: 'Hand-set stones on a flexible bracelet silhouette.',
        media: [{ url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800' }],
        sku: 'LX-BRAC-01',
        priceCents: 89000,
        qty: 15,
        attrs: { metal: 'Gold', stone: 'Diamond' },
      },
      {
        name: 'Luna Hoop Earrings',
        slug: 'luna-hoop-earrings',
        categoryId: necklaces?.id,
        description: 'Polished hoops with a soft brushed finish.',
        media: [{ url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800' }],
        sku: 'LX-EAR-01',
        priceCents: 18900,
        qty: 28,
        attrs: { metal: 'Silver', stone: 'None' },
      },
      {
        name: 'Vera Chain Necklace',
        slug: 'vera-chain-necklace',
        categoryId: necklaces?.id,
        description: 'Layer-ready chain with a discreet clasp.',
        media: [{ url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800' }],
        sku: 'LX-NEC-02',
        priceCents: 42000,
        compareAtCents: 52000,
        qty: 20,
        attrs: { metal: 'Gold', stone: 'None' },
      },
      {
        name: 'Solitaire Studs',
        slug: 'solitaire-studs',
        categoryId: bracelets?.id,
        description: 'Everyday studs with brilliant cut stones.',
        media: [{ url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800' }],
        sku: 'LX-STUD-01',
        priceCents: 69000,
        qty: 18,
        attrs: { metal: 'Platinum', stone: 'Diamond' },
      },
    ];
    for (const p of extras) {
      const exists = await prisma.product.findUnique({
        where: { tenantId_slug: { tenantId: tenant.id, slug: p.slug } },
      });
      if (exists) continue;
      const created = await prisma.product.create({
        data: {
          tenantId: tenant.id,
          categoryId: p.categoryId,
          name: p.name,
          slug: p.slug,
          description: p.description,
          status: 'active',
          media: p.media,
          variants: {
            create: {
              tenantId: tenant.id,
              sku: p.sku,
              priceCents: p.priceCents,
              compareAtCents: p.compareAtCents,
              attributeValues: p.attrs,
              inventory: { create: { tenantId: tenant.id, quantity: p.qty } },
            },
          },
        },
      });
      await prisma.productReview.createMany({
        data: [
          {
            tenantId: tenant.id,
            productId: created.id,
            authorName: 'Maya R.',
            rating: 5,
            title: 'Stunning',
            body: 'Beautiful finish and arrived perfectly packed.',
          },
          {
            tenantId: tenant.id,
            productId: created.id,
            authorName: 'Jordan K.',
            rating: 4,
            title: 'Great quality',
            body: 'Exactly as pictured. Will buy again.',
          },
        ],
      });
    }
  }

  if (tenantSlug === 'essas-collection' || tenantSlug === 'urbanthread' || tenantSlug === 'dreamfitters') {
    const bottoms = await prisma.category.findFirst({ where: { tenantId: tenant.id, slug: 'bottoms' } });
    const dresses = await prisma.category.findFirst({ where: { tenantId: tenant.id, slug: 'dresses' } });
    const topsCat = await prisma.category.findFirst({ where: { tenantId: tenant.id, slug: 'tops' } });
    const extras = [
      {
        name: 'Relaxed Chino',
        slug: 'relaxed-chino',
        categoryId: bottoms?.id,
        description: 'Breathable chino with a clean tapered fit.',
        media: [{ url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800' }],
        sku: 'UT-CHI-32',
        priceCents: 6900,
        qty: 40,
        attrs: { size: 'M', color: 'Blue' },
      },
      {
        name: 'City Slip Dress',
        slug: 'city-slip-dress',
        categoryId: dresses?.id,
        description: 'Fluid slip silhouette for day-to-night.',
        media: [{ url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800' }],
        sku: 'UT-DRS-S',
        priceCents: 8900,
        compareAtCents: 11000,
        qty: 22,
        attrs: { size: 'S', color: 'Black' },
      },
      {
        name: 'Overshirt Jacket',
        slug: 'overshirt-jacket',
        categoryId: topsCat?.id || bottoms?.id,
        description: 'Layerable overshirt in washed cotton.',
        media: [{ url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800' }],
        sku: 'UT-JKT-L',
        priceCents: 9900,
        qty: 18,
        attrs: { size: 'L', color: 'White' },
      },
      {
        name: 'Boxy Crop Hoodie',
        slug: 'boxy-crop-hoodie',
        categoryId: topsCat?.id,
        description: 'Soft fleece hoodie with a modern boxy crop.',
        media: [{ url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800' }],
        sku: 'UT-HD-M',
        priceCents: 7800,
        qty: 34,
        attrs: { size: 'M', color: 'Grey' },
      },
      {
        name: 'Pleated Midi Skirt',
        slug: 'pleated-midi-skirt',
        categoryId: bottoms?.id,
        description: 'Light pleats with a flattering midi length.',
        media: [{ url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800' }],
        sku: 'UT-SKT-M',
        priceCents: 7400,
        qty: 24,
        attrs: { size: 'M', color: 'Ivory' },
      },
      {
        name: 'Linen Camp Shirt',
        slug: 'linen-camp-shirt',
        categoryId: topsCat?.id,
        description: 'Breathable linen camp collar shirt.',
        media: [{ url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800' }],
        sku: 'UT-LN-M',
        priceCents: 8200,
        qty: 22,
        attrs: { size: 'M', color: 'White' },
      },
      {
        name: 'Wide-Leg Trouser',
        slug: 'wide-leg-trouser',
        categoryId: bottoms?.id,
        description: 'Tailored wide-leg trouser with a soft drape.',
        media: [{ url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800' }],
        sku: 'UT-TR-32',
        priceCents: 9800,
        compareAtCents: 11800,
        qty: 22,
        attrs: { size: 'M', color: 'Charcoal' },
      },
      {
        name: 'Knit Polo',
        slug: 'knit-polo',
        categoryId: topsCat?.id,
        description: 'Fine-gauge knit polo with a neat collar.',
        media: [{ url: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=800' }],
        sku: 'UT-PO-M',
        priceCents: 6400,
        qty: 30,
        attrs: { size: 'M', color: 'Navy' },
      },
      {
        name: 'Wrap Midi Dress',
        slug: 'wrap-midi-dress',
        categoryId: dresses?.id,
        description: 'Flattering wrap midi with adjustable tie.',
        media: [{ url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800' }],
        sku: 'UT-WRP-M',
        priceCents: 9400,
        qty: 20,
        attrs: { size: 'M', color: 'Wine' },
      },
      {
        name: 'Denim Trucker',
        slug: 'denim-trucker',
        categoryId: topsCat?.id,
        description: 'Classic trucker jacket in mid-wash denim.',
        media: [{ url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800' }],
        sku: 'UT-DN-M',
        priceCents: 11200,
        qty: 18,
        attrs: { size: 'M', color: 'Indigo' },
      },
      {
        name: 'Cargo Utility Pant',
        slug: 'cargo-utility-pant',
        categoryId: bottoms?.id,
        description: 'Utility cargo with roomy pockets.',
        media: [{ url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800' }],
        sku: 'UT-CG-32',
        priceCents: 8600,
        qty: 28,
        attrs: { size: 'M', color: 'Khaki' },
      },
      {
        name: 'Ribbed Tank',
        slug: 'ribbed-tank',
        categoryId: topsCat?.id,
        description: 'Close-fit ribbed tank for layering.',
        media: [{ url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800' }],
        sku: 'UT-TK-M',
        priceCents: 3200,
        qty: 44,
        attrs: { size: 'M', color: 'Black' },
      },
    ];
    for (const p of extras) {
      const exists = await prisma.product.findUnique({
        where: { tenantId_slug: { tenantId: tenant.id, slug: p.slug } },
      });
      if (exists) continue;
      await prisma.product.create({
        data: {
          tenantId: tenant.id,
          categoryId: p.categoryId,
          name: p.name,
          slug: p.slug,
          description: p.description,
          status: 'active',
          media: p.media,
          variants: {
            create: {
              tenantId: tenant.id,
              sku: p.sku,
              priceCents: p.priceCents,
              compareAtCents: p.compareAtCents,
              attributeValues: p.attrs,
              inventory: { create: { tenantId: tenant.id, quantity: p.qty } },
            },
          },
        },
      });
    }
  }

  await prisma.storeSettings.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      announcementEnabled: true,
      announcementText:
        tenantSlug === 'luxjewels'
          ? 'Complimentary shipping over $75 · WELCOME10 for 10% off'
          : 'Free shipping over $75 · New season drops weekly',
      freeShippingThresholdCents: 7500,
      giftNotesEnabled: true,
      supportEmail: `hello@${tenantSlug}.com`,
    },
    update: {
      announcementEnabled: true,
      freeShippingThresholdCents: 7500,
    },
  });

  const ruleCount = await prisma.discountRule.count({ where: { tenantId: tenant.id } });
  if (!ruleCount) {
    await prisma.discountRule.create({
      data: {
        tenantId: tenant.id,
        name: 'Free shipping $75+',
        type: 'free_shipping',
        value: 0,
        minSubtotalCents: 7500,
      },
    });
  }

  // Multi-image galleries + SEO for ALL products (Shopify-style product media)
  const jewelryGalleries = [
    [
      { url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1200', alt: 'Front view' },
      { url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200', alt: 'On model' },
      { url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200', alt: 'Detail' },
      { url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200', alt: 'Lifestyle' },
    ],
    [
      { url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200', alt: 'Front' },
      { url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1200', alt: 'Side' },
      { url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1200', alt: 'Macro' },
      { url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200', alt: 'Styled' },
    ],
    [
      { url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200', alt: 'Hero' },
      { url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200', alt: 'Flat lay' },
      { url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1200', alt: 'Worn' },
      { url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200', alt: 'Box' },
    ],
  ];
  const fashionGalleries = [
    [
      { url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200', alt: 'Front' },
      { url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1200', alt: 'Back' },
      { url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1200', alt: 'Detail' },
      { url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=1200', alt: 'Look' },
    ],
    [
      { url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1200', alt: 'Hero' },
      { url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200', alt: 'Fit' },
      { url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1200', alt: 'Fabric' },
      { url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200', alt: 'Store' },
    ],
    [
      { url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=1200', alt: 'Front' },
      { url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200', alt: 'Lifestyle' },
      { url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200', alt: 'Texture' },
      { url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1200', alt: 'Detail' },
    ],
  ];

  const allProducts = await prisma.product.findMany({ where: { tenantId: tenant.id } });
  const galleries = tenantSlug === 'luxjewels' ? jewelryGalleries : fashionGalleries;
  for (const [i, p] of allProducts.entries()) {
    await prisma.product.update({
      where: { id: p.id },
      data: {
        featured: i < 3,
        tags:
          tenantSlug === 'luxjewels'
            ? ['bestseller', 'gift', 'jewelry', i % 2 ? 'gold' : 'silver']
            : ['bestseller', 'essentials', 'new'],
        vendor: tenantSlug === 'essas-collection' ? "Essa's Collection" : 'Atelier',
        seoTitle: `${p.name} | Essa's Collection`,
        seoDescription: p.description || `Shop ${p.name} online with free shipping over $75.`,
        media: galleries[i % galleries.length],
      },
    });
  }

  console.log(`Enriched commerce data for ${tenantSlug}`);
}

async function enableAllFeatures(tenantId: string) {
  for (const [featureKey] of FEATURES) {
    await prisma.tenantEntitlement.upsert({
      where: { tenantId_featureKey: { tenantId, featureKey } },
      create: { tenantId, featureKey, enabled: true, source: 'override' },
      update: { enabled: true },
    });
  }
}

async function main() {
  console.log("Seeding Essa's Collection...");
  await ensureCatalog();
  const store = await ensureEssaStore();
  await enableAllFeatures(store.id);
  await applyEssaStorefront(store.id);
  await prisma.customer.upsert({
    where: { tenantId_email: { tenantId: store.id, email: 'shopper@example.com' } },
    create: {
      tenantId: store.id,
      email: 'shopper@example.com',
      fullName: 'Amina Shopper',
      passwordHash: await hashPassword('Password123!'),
    },
    update: {},
  });
  console.log('Seed complete.');
  console.log('Store:   http://localhost:3000');
  console.log('Admin:   http://localhost:3000/admin');
  console.log('Staff:   owner@essascollection.com / Password123!');
  console.log('Shopper: shopper@example.com / Password123!');
  console.log('Coupon:  WELCOME10');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
