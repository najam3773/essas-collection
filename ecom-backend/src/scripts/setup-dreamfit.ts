/**
 * Onboard + enrich Dreamfit — boys clothing brand demo tenant.
 * Run: npx tsx src/scripts/setup-dreamfit.ts  (from the repo root)
 */
import { prisma } from '../lib/db.js';
import { hashPassword } from '../lib/auth.js';
import { onboardTenant } from '../services/tenant-onboard.js';

const SLUG = 'dreamfit';
const OWNER_EMAIL = 'owner@dreamfit.com';
const OWNER_PASSWORD = 'Password123!';
const CUSTOMER_EMAIL = 'shopper@dreamfit.com';

const IMG = {
  hero1: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad1?w=1600',
  hero2: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=1600',
  hero3: 'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=1600',
  hero4: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=1600',
  tee: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1200',
  hoodie: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1200',
  jeans: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=1200',
  shirt: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1200',
  polo: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=1200',
  shorts: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=1200',
  jacket: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1200',
  sneakers: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1200',
  lookbook: 'https://images.unsplash.com/photo-1621452773781-0f992fd1f5cb?w=1200',
  store: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
  flatlay: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea62?w=1200',
};

async function ensureTenant() {
  const existing = await prisma.tenant.findUnique({ where: { slug: SLUG } });
  if (existing) {
    console.log(`Tenant ${SLUG} already exists (${existing.id})`);
    return existing;
  }
  const result = await onboardTenant({
    name: 'Dreamfit',
    slug: SLUG,
    subdomain: SLUG,
    customDomain: `${SLUG}.localhost`,
    planKey: 'professional',
    industryTemplate: 'fashion',
    ownerEmail: OWNER_EMAIL,
    ownerName: 'Dreamfit Owner',
    ownerPassword: OWNER_PASSWORD,
    brandName: 'Dreamfit',
    primaryColor: '#1e3a5f',
    themeKey: 'fashion-bold',
  });
  console.log('Created tenant Dreamfit');
  return result.tenant ?? (await prisma.tenant.findUniqueOrThrow({ where: { slug: SLUG } }));
}

async function enrich(tenantId: string) {
  // Entitlements for full demo
  for (const featureKey of [
    'storefront.wishlist',
    'storefront.reviews',
    'marketing.coupons',
    'content.cms',
    'content.page_builder',
    'inventory.tracking',
    'reports.basic',
    'branding.custom_css',
  ]) {
    await prisma.tenantEntitlement.upsert({
      where: { tenantId_featureKey: { tenantId, featureKey } },
      create: { tenantId, featureKey, enabled: true, source: 'override' },
      update: { enabled: true },
    }).catch(() => undefined);
  }

  await prisma.themeConfig.upsert({
    where: { tenantId },
    create: {
      tenantId,
      brandName: 'Dreamfit',
      primaryColor: '#1e3a5f',
      secondaryColor: '#f4a261',
      fontHeading: 'Outfit',
      fontBody: 'Outfit',
      customCss: `
.store-root { --color-primary: #1e3a5f; --color-secondary: #0d1b2a; }
.announce { background: #1e3a5f !important; }
`,
    },
    update: {
      brandName: 'Dreamfit',
      primaryColor: '#1e3a5f',
      secondaryColor: '#f4a261',
      fontHeading: 'Outfit',
      fontBody: 'Outfit',
      logoUrl: IMG.flatlay,
    },
  });

  await prisma.storeSettings.upsert({
    where: { tenantId },
    create: {
      tenantId,
      announcementEnabled: true,
      announcementText: 'FREE SHIPPING OVER $50 · NEW DROP: BOYS SPRING EDIT · USE BOY10',
      freeShippingThresholdCents: 5000,
      giftNotesEnabled: true,
      supportEmail: 'hello@dreamfit.com',
      lowStockThreshold: 8,
    },
    update: {
      announcementEnabled: true,
      announcementText: 'FREE SHIPPING OVER $50 · NEW DROP: BOYS SPRING EDIT · USE BOY10',
      freeShippingThresholdCents: 5000,
      giftNotesEnabled: true,
      supportEmail: 'hello@dreamfit.com',
    },
  });

  // Categories — fashion template already made Tops/Bottoms/Dresses; add boys-specific
  const catsWanted = [
    { name: 'Tops', slug: 'tops' },
    { name: 'Bottoms', slug: 'bottoms' },
    { name: 'Outerwear', slug: 'outerwear' },
    { name: 'Shoes', slug: 'shoes' },
    { name: 'Sets', slug: 'sets' },
  ];
  const catMap: Record<string, string> = {};
  for (const c of catsWanted) {
    const row = await prisma.category.upsert({
      where: { tenantId_slug: { tenantId, slug: c.slug } },
      create: { tenantId, name: c.name, slug: c.slug, isActive: true },
      update: { name: c.name, isActive: true },
    });
    catMap[c.slug] = row.id;
  }

  // Hide "Dresses" for boys brand if present
  await prisma.category.updateMany({
    where: { tenantId, slug: 'dresses' },
    data: { isActive: false },
  });

  const products = [
    {
      name: 'Adventure Graphic Tee',
      slug: 'adventure-graphic-tee',
      categoryId: catMap.tops,
      description: 'Soft cotton tee with bold adventure print — built for playground energy and everyday wear.',
      media: [
        { url: IMG.tee, alt: 'Graphic tee front' },
        { url: IMG.hero1, alt: 'Boy wearing tee' },
        { url: IMG.flatlay, alt: 'Flat lay' },
      ],
      variants: [
        { sku: 'DF-TEE-S-NVY', priceCents: 2499, compareAtCents: 2999, attributeValues: { size: 'S', color: 'Navy' }, quantity: 40 },
        { sku: 'DF-TEE-M-NVY', priceCents: 2499, compareAtCents: 2999, attributeValues: { size: 'M', color: 'Navy' }, quantity: 55 },
        { sku: 'DF-TEE-L-NVY', priceCents: 2499, compareAtCents: 2999, attributeValues: { size: 'L', color: 'Navy' }, quantity: 35 },
      ],
      featured: true,
      tags: ['bestseller', 'tees'],
    },
    {
      name: 'Trailblazer Hoodie',
      slug: 'trailblazer-hoodie',
      categoryId: catMap.tops,
      description: 'Cozy midweight hoodie with kangaroo pocket. Perfect layer for cool mornings and weekend adventures.',
      media: [
        { url: IMG.hoodie, alt: 'Hoodie' },
        { url: IMG.hero2, alt: 'Styled hoodie' },
        { url: IMG.lookbook, alt: 'Lookbook' },
      ],
      variants: [
        { sku: 'DF-HOOD-S-GRY', priceCents: 4499, compareAtCents: 5200, attributeValues: { size: 'S', color: 'Heather Grey' }, quantity: 30 },
        { sku: 'DF-HOOD-M-GRY', priceCents: 4499, compareAtCents: 5200, attributeValues: { size: 'M', color: 'Heather Grey' }, quantity: 42 },
        { sku: 'DF-HOOD-L-GRY', priceCents: 4499, compareAtCents: 5200, attributeValues: { size: 'L', color: 'Heather Grey' }, quantity: 28 },
      ],
      featured: true,
      tags: ['outer', 'bestseller'],
    },
    {
      name: 'Scout Cargo Pants',
      slug: 'scout-cargo-pants',
      categoryId: catMap.bottoms,
      description: 'Durable cargo pants with roomy pockets and a flexible waist — ready for trails and classrooms.',
      media: [
        { url: IMG.jeans, alt: 'Cargo pants' },
        { url: IMG.hero3, alt: 'On the go' },
      ],
      variants: [
        { sku: 'DF-CARGO-S-KHK', priceCents: 3999, attributeValues: { size: 'S', color: 'Khaki' }, quantity: 25 },
        { sku: 'DF-CARGO-M-KHK', priceCents: 3999, attributeValues: { size: 'M', color: 'Khaki' }, quantity: 32 },
        { sku: 'DF-CARGO-L-KHK', priceCents: 3999, attributeValues: { size: 'L', color: 'Khaki' }, quantity: 20 },
      ],
      featured: true,
      tags: ['bottoms'],
    },
    {
      name: 'Weekend Oxford Shirt',
      slug: 'weekend-oxford-shirt',
      categoryId: catMap.tops,
      description: 'Crisp oxford shirt for family dinners, school photos, and smart-casual Fridays.',
      media: [
        { url: IMG.shirt, alt: 'Oxford shirt' },
        { url: IMG.polo, alt: 'Shirt detail' },
      ],
      variants: [
        { sku: 'DF-OXF-S-WHT', priceCents: 3499, attributeValues: { size: 'S', color: 'White' }, quantity: 22 },
        { sku: 'DF-OXF-M-WHT', priceCents: 3499, attributeValues: { size: 'M', color: 'White' }, quantity: 30 },
        { sku: 'DF-OXF-L-BLU', priceCents: 3499, attributeValues: { size: 'L', color: 'Sky Blue' }, quantity: 18 },
      ],
      featured: false,
      tags: ['smart'],
    },
    {
      name: 'Rally Polo',
      slug: 'rally-polo',
      categoryId: catMap.tops,
      description: 'Breathable pique polo with a sporty collar — sharp enough for school, easy enough for play.',
      media: [
        { url: IMG.polo, alt: 'Polo shirt' },
        { url: IMG.tee, alt: 'Polo lifestyle' },
      ],
      variants: [
        { sku: 'DF-POLO-S-NVY', priceCents: 2999, attributeValues: { size: 'S', color: 'Navy' }, quantity: 28 },
        { sku: 'DF-POLO-M-NVY', priceCents: 2999, attributeValues: { size: 'M', color: 'Navy' }, quantity: 36 },
        { sku: 'DF-POLO-L-RED', priceCents: 2999, attributeValues: { size: 'L', color: 'Red' }, quantity: 16 },
      ],
      featured: true,
      tags: ['bestseller', 'polos'],
    },
    {
      name: 'Sprint Shorts',
      slug: 'sprint-shorts',
      categoryId: catMap.bottoms,
      description: 'Lightweight shorts with stretch and a secure drawcord — made for recess and weekend runs.',
      media: [
        { url: IMG.shorts, alt: 'Boys shorts' },
        { url: IMG.hero4, alt: 'Active wear' },
      ],
      variants: [
        { sku: 'DF-SHRT-S-NVY', priceCents: 2299, attributeValues: { size: 'S', color: 'Navy' }, quantity: 40 },
        { sku: 'DF-SHRT-M-NVY', priceCents: 2299, attributeValues: { size: 'M', color: 'Navy' }, quantity: 45 },
        { sku: 'DF-SHRT-L-OLV', priceCents: 2299, attributeValues: { size: 'L', color: 'Olive' }, quantity: 24 },
      ],
      featured: false,
      tags: ['summer'],
    },
    {
      name: 'Storm Softshell Jacket',
      slug: 'storm-softshell-jacket',
      categoryId: catMap.outerwear,
      description: 'Water-resistant softshell with reflective details for rainy-day walks and after-school rides.',
      media: [
        { url: IMG.jacket, alt: 'Jacket' },
        { url: IMG.hoodie, alt: 'Layered look' },
      ],
      variants: [
        { sku: 'DF-JKT-S-NVY', priceCents: 5999, compareAtCents: 6900, attributeValues: { size: 'S', color: 'Navy' }, quantity: 15 },
        { sku: 'DF-JKT-M-NVY', priceCents: 5999, compareAtCents: 6900, attributeValues: { size: 'M', color: 'Navy' }, quantity: 20 },
        { sku: 'DF-JKT-L-NVY', priceCents: 5999, compareAtCents: 6900, attributeValues: { size: 'L', color: 'Navy' }, quantity: 12 },
      ],
      featured: true,
      tags: ['outerwear'],
    },
    {
      name: 'Kickstart Sneakers',
      slug: 'kickstart-sneakers',
      categoryId: catMap.shoes,
      description: 'Cushioned everyday sneakers with easy slip-on style and grippy soles for active boys.',
      media: [
        { url: IMG.sneakers, alt: 'Sneakers' },
        { url: IMG.hero1, alt: 'On feet' },
      ],
      variants: [
        { sku: 'DF-SNK-1-WHT', priceCents: 4999, attributeValues: { size: '1', color: 'White' }, quantity: 18 },
        { sku: 'DF-SNK-2-WHT', priceCents: 4999, attributeValues: { size: '2', color: 'White' }, quantity: 22 },
        { sku: 'DF-SNK-3-NVY', priceCents: 4999, attributeValues: { size: '3', color: 'Navy' }, quantity: 14 },
      ],
      featured: false,
      tags: ['shoes'],
    },
  ];

  for (const p of products) {
    const existing = await prisma.product.findUnique({
      where: { tenantId_slug: { tenantId, slug: p.slug } },
    });
    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: p.name,
          description: p.description,
          categoryId: p.categoryId,
          status: 'active',
          media: p.media,
          tags: p.tags,
          featured: p.featured,
          vendor: 'Dreamfit',
        },
      });
      continue;
    }
    await prisma.product.create({
      data: {
        tenantId,
        name: p.name,
        slug: p.slug,
        description: p.description,
        categoryId: p.categoryId,
        status: 'active',
        media: p.media,
        tags: p.tags,
        featured: p.featured,
        vendor: 'Dreamfit',
        seoTitle: `${p.name} | Dreamfit Boys`,
        seoDescription: p.description.slice(0, 140),
        variants: {
          create: p.variants.map((v) => ({
            tenantId,
            sku: v.sku,
            priceCents: v.priceCents,
            compareAtCents: 'compareAtCents' in v ? v.compareAtCents : null,
            attributeValues: v.attributeValues,
            isActive: true,
            inventory: {
              create: { tenantId, quantity: v.quantity, reserved: 0 },
            },
          })),
        },
      },
    });
  }
  console.log(`Products ready (${products.length})`);

  // Coupons
  await prisma.coupon.upsert({
    where: { tenantId_code: { tenantId, code: 'BOY10' } },
    create: { tenantId, code: 'BOY10', type: 'percent', value: 10, maxUses: 2000, isActive: true },
    update: { isActive: true, value: 10 },
  });
  await prisma.coupon.upsert({
    where: { tenantId_code: { tenantId, code: 'DREAM20' } },
    create: { tenantId, code: 'DREAM20', type: 'fixed', value: 2000, maxUses: 500, isActive: true },
    update: { isActive: true },
  });

  // Shipping / tax
  if (!(await prisma.shippingZone.count({ where: { tenantId } }))) {
    await prisma.shippingZone.createMany({
      data: [
        { tenantId, name: 'US Standard', countries: ['US'], rateCents: 499 },
        { tenantId, name: 'Canada', countries: ['CA'], rateCents: 999 },
        { tenantId, name: 'UK', countries: ['GB'], rateCents: 1299 },
      ],
    });
  }
  if (!(await prisma.taxRule.count({ where: { tenantId } }))) {
    await prisma.taxRule.create({
      data: { tenantId, name: 'US Sales Tax', country: 'US', rateBps: 750 },
    });
  }

  // CMS pages
  for (const page of [
    {
      title: 'About Dreamfit',
      slug: 'about',
      bodyHtml:
        '<p>Dreamfit designs durable, comfortable boys clothing for explorers ages 4–14. From playground to family dinner — built to move, made to last.</p>',
    },
    {
      title: 'Shipping & returns',
      slug: 'shipping',
      bodyHtml:
        '<p>Free shipping over $50. Orders ship in 1–2 business days. Easy 30-day returns on unused items with tags attached.</p>',
    },
  ]) {
    await prisma.contentPage.upsert({
      where: { tenantId_slug: { tenantId, slug: page.slug } },
      create: { tenantId, ...page, status: 'published' },
      update: { ...page, status: 'published' },
    });
  }

  // Home page sections — images come from product media if not set here
  await prisma.tenantPageSection.upsert({
    where: { tenantId_pageKey: { tenantId, pageKey: 'home' } },
    create: {
      tenantId,
      pageKey: 'home',
      sections: [
        {
          type: 'hero-banner',
          settings: {
            title: 'Dreamfit',
            subtitle: 'Boys clothing that keeps up — school, sports, and every adventure.',
            imageUrl: IMG.hero1,
            slides: [
              { imageUrl: IMG.hero1, title: 'Dreamfit', subtitle: 'Built for boys on the move.' },
              { imageUrl: IMG.hero2, title: 'Dreamfit', subtitle: 'Tees, cargos & kickaround kicks.' },
              { imageUrl: IMG.hero3, title: 'Dreamfit', subtitle: 'Layer up for cooler days.' },
              { imageUrl: IMG.lookbook, title: 'Dreamfit', subtitle: 'Weekend-ready looks.' },
            ],
            ctaLabel: 'Shop new arrivals',
            ctaHref: '/shop',
          },
        },
        { type: 'featured-products', settings: { limit: 8 } },
        {
          type: 'lookbook',
          settings: {
            title: 'Built for boys on the move',
            sideTitle: 'Durable fabric. Easy fits. Real adventures.',
            imageUrl: IMG.lookbook,
            sideImageUrl: IMG.hero4,
          },
        },
        { type: 'newsletter', settings: { title: 'Join the Dreamfit crew' } },
      ],
    },
    update: {
      sections: [
        {
          type: 'hero-banner',
          settings: {
            title: 'Dreamfit',
            subtitle: 'Boys clothing that keeps up — school, sports, and every adventure.',
            imageUrl: IMG.hero1,
            slides: [
              { imageUrl: IMG.hero1, title: 'Dreamfit', subtitle: 'Built for boys on the move.' },
              { imageUrl: IMG.hero2, title: 'Dreamfit', subtitle: 'Tees, cargos & kickaround kicks.' },
              { imageUrl: IMG.hero3, title: 'Dreamfit', subtitle: 'Layer up for cooler days.' },
              { imageUrl: IMG.lookbook, title: 'Dreamfit', subtitle: 'Weekend-ready looks.' },
            ],
            ctaLabel: 'Shop new arrivals',
            ctaHref: '/shop',
          },
        },
        { type: 'featured-products', settings: { limit: 8 } },
        {
          type: 'lookbook',
          settings: {
            title: 'Built for boys on the move',
            sideTitle: 'Durable fabric. Easy fits. Real adventures.',
            imageUrl: IMG.lookbook,
            sideImageUrl: IMG.hero4,
          },
        },
        { type: 'newsletter', settings: { title: 'Join the Dreamfit crew' } },
      ],
    },
  });

  // Paid commerce extras
  if (!(await prisma.giftCard.count({ where: { tenantId } }))) {
    const card = await prisma.giftCard.create({
      data: {
        tenantId,
        code: 'DF-GIFT100',
        initialCents: 10000,
        balanceCents: 10000,
        note: 'Welcome gift card',
        isActive: true,
      },
    });
    await prisma.giftCardTransaction.create({
      data: { tenantId, giftCardId: card.id, amountCents: 10000, type: 'issue', note: 'Issued' },
    });
  }

  await prisma.loyaltySettings.upsert({
    where: { tenantId },
    create: {
      tenantId,
      enabled: true,
      pointsPerDollar: 1,
      redeemRateCents: 1,
      minRedeemPoints: 100,
      welcomePoints: 50,
    },
    update: { enabled: true },
  });

  if (!(await prisma.fulfillmentOption.count({ where: { tenantId } }))) {
    await prisma.fulfillmentOption.createMany({
      data: [
        { tenantId, type: 'ship', name: 'Standard shipping', priceCents: 499, isActive: true },
        { tenantId, type: 'pickup', name: 'Store pickup', priceCents: 0, isActive: true },
        { tenantId, type: 'local_delivery', name: 'Local delivery', priceCents: 799, isActive: true },
      ],
    });
  }

  if (!(await prisma.storeCurrency.count({ where: { tenantId } }))) {
    await prisma.storeCurrency.createMany({
      data: [
        { tenantId, code: 'USD', name: 'US Dollar', rateToBase: 1, isActive: true, isDefault: true },
        { tenantId, code: 'CAD', name: 'Canadian Dollar', rateToBase: 1.35, isActive: true },
        { tenantId, code: 'GBP', name: 'British Pound', rateToBase: 0.79, isActive: true },
      ],
    });
  }

  if (!(await prisma.membershipTier.count({ where: { tenantId } }))) {
    await prisma.membershipTier.create({
      data: {
        tenantId,
        name: 'Dreamfit Club',
        priceCents: 999,
        billingPeriod: 'month',
        discountPercent: 10,
        perks: 'Early drops, Free shipping, Members-only tees',
        isActive: true,
      },
    });
  }

  if (!(await prisma.customerGroup.count({ where: { tenantId } }))) {
    await prisma.customerGroup.create({
      data: {
        tenantId,
        name: 'Wholesale Schools',
        discountPercent: 15,
        isB2b: true,
      },
    });
  }

  await prisma.emailAutomation.upsert({
    where: { tenantId_type: { tenantId, type: 'abandoned_cart' } },
    create: {
      tenantId,
      type: 'abandoned_cart',
      name: 'Abandoned cart recovery',
      subject: 'Your Dreamfit bag is waiting',
      bodyTemplate: 'Hey {{email}}, finish checkout: {{recovery_url}}',
      isActive: true,
    },
    update: { isActive: true },
  });

  // Demo customer
  const passwordHash = await hashPassword(OWNER_PASSWORD);
  await prisma.customer.upsert({
    where: { tenantId_email: { tenantId, email: CUSTOMER_EMAIL } },
    create: {
      tenantId,
      email: CUSTOMER_EMAIL,
      fullName: 'Dreamfit Shopper',
      passwordHash,
      loyaltyPoints: 250,
      storeCreditCents: 1500,
      referralCode: 'DF-REF-SHOP',
    },
    update: {
      passwordHash,
      loyaltyPoints: 250,
      storeCreditCents: 1500,
    },
  });

  console.log('Enrichment complete');
}

async function main() {
  const tenant = await ensureTenant();
  // onboardTenant return shape may vary
  const t = 'id' in tenant ? tenant : await prisma.tenant.findUniqueOrThrow({ where: { slug: SLUG } });
  await enrich(t.id);
  console.log('\nDreamfit ready');
  console.log(`Store:    http://${SLUG}.localhost:3000`);
  console.log(`Admin:    http://admin.${SLUG}.localhost:3000`);
  console.log(`Admin:    http://localhost:3000/admin/login  (slug ${SLUG})`);
  console.log(`Owner:    ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
  console.log(`Customer: ${CUSTOMER_EMAIL} / ${OWNER_PASSWORD}`);
  console.log('Gift card: DF-GIFT100 ($100)');
  console.log('Coupons:   BOY10 (10%), DREAM20 ($20)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
