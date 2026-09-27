import { prisma } from './lib/db.js';
import {
  FABRIC_CATEGORIES,
  UNSTITCHED_PRODUCTS,
  colorSlug,
  pieceTypeMeta,
  productTags,
} from './lib/unstitched-catalog.js';
import { pieceTypeToEnum } from './lib/piece-type.js';

const ESSA_BRAND = {
  brandName: "Essa's Collection",
  primaryColor: '#4A1C28',
  secondaryColor: '#B08968',
  backgroundColor: '#F6F0E8',
  fontHeading: 'Cormorant Garamond',
  fontBody: 'Outfit',
};

const CONTENT_PAGES = [
  {
    title: 'About us',
    slug: 'about',
    bodyHtml:
      '<p>Essa’s Collection is a Pakistani women’s unstitched clothing house — lawn, khaddar, linen, viscose and carefully chosen occasion fabrics, cut as 1, 2 and 3 piece ensembles and standalone dupattas.</p><p>We curate prints, embroideries and cloth that feel considered rather than seasonal noise. Every piece is sold unstitched, so you can tailor it to your own silhouette and occasion.</p>',
  },
  {
    title: 'Contact Us',
    slug: 'contact',
    bodyHtml:
      '<p>For order questions, fabric advice or delivery updates, write to <strong>hello@essascollection.com</strong>.</p><p>Customer care hours: Monday–Saturday, 10:00–18:00 PKT.</p>',
  },
  {
    title: 'Shipping & Delivery',
    slug: 'shipping',
    bodyHtml:
      '<p>Orders are packed within 1–2 working days from Lahore. Standard delivery across Pakistan takes 2–5 working days depending on your city.</p><p>Complimentary delivery on orders over PKR 8,000. Major cities typically arrive sooner.</p>',
  },
  {
    title: 'Returns & Exchange',
    slug: 'returns',
    bodyHtml:
      '<p>Unstitched pieces may be exchanged within 7 days if the fabric is unused, uncut and in original packing. Please keep tags attached.</p><p>Custom-stitched garments and used fabric cannot be returned. Write to us before sending anything back.</p>',
  },
  {
    title: 'Size & Fabric Guide',
    slug: 'fabric-guide',
    bodyHtml:
      '<p><strong>Lawn</strong> — light, printed or embroidered, for spring and summer.<br/><strong>Khaddar</strong> — textured and warm for winter.<br/><strong>Linen</strong> — premium autumn/winter drape.<br/><strong>Viscose</strong> — soft everyday and semi-formal wear.<br/><strong>Cotton</strong> — comfortable daily cloth.<br/><strong>Chiffon, silk and organza</strong> — dupattas and dressier collections.</p><p>All garments are unstitched. Share your measurements with your tailor; we do not sell ready-to-wear sizes.</p>',
  },
  {
    title: 'FAQs',
    slug: 'faqs',
    bodyHtml:
      '<p><strong>Is everything unstitched?</strong> Yes. Essa’s Collection sells women’s unstitched clothing only.</p><p><strong>What is included in a 3 piece?</strong> Shirt, trouser and dupatta, unless the product says otherwise.</p><p><strong>Do you ship outside Pakistan?</strong> This storefront is set up for Pakistan delivery. Contact us for special requests.</p>',
  },
];

export async function applyEssaStorefront(tenantId: string) {
  const theme = await prisma.theme.findUnique({ where: { themeKey: 'essa' } });
  await prisma.themeConfig.updateMany({
    where: { tenantId },
    data: {
      ...ESSA_BRAND,
      ...(theme ? { themeId: theme.id } : {}),
    },
  });

  await prisma.tenantPageSection.deleteMany({ where: { tenantId, pageKey: 'home' } });
  await prisma.tenantPageSection.create({
    data: {
      tenantId,
      pageKey: 'home',
      sections: [
        {
          type: 'hero-banner',
          settings: {
            title: 'Timeless Unstitched Elegance',
            subtitle: 'Curated fabrics, graceful prints and effortless Pakistani style.',
            ctaLabel: 'Shop New Arrivals',
            ctaHref: '/collections/new-arrivals',
          },
        },
        { type: 'featured-products', settings: { limit: 8 } },
        { type: 'lookbook', settings: { title: 'The Lawn Edit', sideTitle: 'Women’s unstitched clothing' } },
        { type: 'newsletter', settings: { title: 'The collection list' } },
      ],
    },
  });

  const fabricIds = new Map<string, string>();
  for (const [i, cat] of FABRIC_CATEGORIES.entries()) {
    const row = await prisma.category.upsert({
      where: { tenantId_slug: { tenantId, slug: cat.slug } },
      create: {
        tenantId,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        sortOrder: i,
        isActive: true,
      },
      update: {
        name: cat.name,
        description: cat.description,
        sortOrder: i,
        isActive: true,
      },
    });
    fabricIds.set(cat.slug, row.id);
  }

  await prisma.category.updateMany({
    where: {
      tenantId,
      slug: { notIn: FABRIC_CATEGORIES.map((c) => c.slug) },
    },
    data: { isActive: false },
  });

  const attributes = [
    { name: 'Fabric', key: 'fabric', type: 'select', options: FABRIC_CATEGORIES.map((c) => c.name) },
    { name: 'Piece Type', key: 'pieces', type: 'select', options: ['1 Piece', '2 Piece', '3 Piece', 'Dupatta'] },
    {
      name: 'Color',
      key: 'color',
      type: 'select',
      options: [...new Set(UNSTITCHED_PRODUCTS.map((p) => p.color))],
    },
    {
      name: 'Pattern',
      key: 'pattern',
      type: 'select',
      options: [...new Set(UNSTITCHED_PRODUCTS.map((p) => p.pattern))],
    },
    { name: 'Embroidery', key: 'embroidery', type: 'text', options: [] },
    { name: 'Season', key: 'season', type: 'select', options: ['Summer', 'Winter', 'Autumn', 'All Season'] },
    { name: 'Collection', key: 'collection', type: 'text', options: [] },
  ];
  for (const attr of attributes) {
    await prisma.attributeDefinition.upsert({
      where: { tenantId_key: { tenantId, key: attr.key } },
      create: { tenantId, ...attr },
      update: { name: attr.name, options: attr.options },
    });
  }

  const keepSlugs = UNSTITCHED_PRODUCTS.map((p) => p.slug);
  const stale = await prisma.product.findMany({
    where: { tenantId, slug: { notIn: keepSlugs } },
    include: { variants: { include: { orderLines: true } } },
  });
  for (const product of stale) {
    const hasOrders = product.variants.some((v) => v.orderLines.length > 0);
    if (hasOrders) {
      await prisma.product.update({ where: { id: product.id }, data: { status: 'archived' } });
      continue;
    }
    await prisma.wishlistItem.deleteMany({ where: { productId: product.id } });
    await prisma.productReview.deleteMany({ where: { productId: product.id } });
    await prisma.cartItem.deleteMany({ where: { variant: { productId: product.id } } });
    try {
      await prisma.product.delete({ where: { id: product.id } });
    } catch {
      await prisma.product.update({ where: { id: product.id }, data: { status: 'archived' } });
    }
  }

  for (const item of UNSTITCHED_PRODUCTS) {
    const piece = pieceTypeMeta(item.pieceType);
    const categoryId = fabricIds.get(item.fabric);
    const tags = productTags(item);
    const media = item.images.map((url, i) => ({
      url,
      alt: i === 0 ? item.name : `${item.name} ${i + 1}`,
    }));
    const attrs = {
      fabric: item.fabric.replace(/^\w/, (c) => c.toUpperCase()),
      pieces: piece.label,
      color: item.color,
      pattern: item.pattern,
      embroidery: item.embroidery,
      season: item.season,
      collection: item.collection,
    };
    const description = `${item.description}\n\nFabric information: ${item.fabricInfo}`;
    const sku = `ES-${item.slug.slice(0, 18).toUpperCase().replace(/[^A-Z0-9]/g, '')}`.slice(0, 24);

    const existing = await prisma.product.findUnique({
      where: { tenantId_slug: { tenantId, slug: item.slug } },
      include: { variants: { include: { inventory: true } } },
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          categoryId,
          name: item.name,
          description,
          status: 'active',
          media,
          tags,
          vendor: item.collection,
          featured: !!item.featured,
          pieceType: pieceTypeToEnum(item.pieceType),
          seoTitle: `${item.name} | Essa's Collection`,
          seoDescription: item.description,
        },
      });
      const variant = existing.variants[0];
      if (variant) {
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: {
            priceCents: item.priceCents,
            compareAtCents: item.compareAtCents ?? null,
            attributeValues: attrs,
            isActive: true,
          },
        });
        if (variant.inventory[0]) {
          await prisma.inventoryItem.update({
            where: { id: variant.inventory[0].id },
            data: { quantity: item.stock },
          });
        } else {
          await prisma.inventoryItem.create({
            data: { tenantId, variantId: variant.id, quantity: item.stock },
          });
        }
      }
      continue;
    }

    await prisma.product.create({
      data: {
        tenantId,
        categoryId,
        name: item.name,
        slug: item.slug,
        description,
        status: 'active',
        media,
        tags,
        vendor: item.collection,
        featured: !!item.featured,
        pieceType: pieceTypeToEnum(item.pieceType),
        seoTitle: `${item.name} | Essa's Collection`,
        seoDescription: item.description,
        variants: {
          create: {
            tenantId,
            sku: `${sku}-${colorSlug(item.color).slice(0, 6).toUpperCase()}`,
            priceCents: item.priceCents,
            compareAtCents: item.compareAtCents,
            attributeValues: attrs,
            inventory: { create: { tenantId, quantity: item.stock } },
          },
        },
      },
    });
  }

  await prisma.storeSettings.upsert({
    where: { tenantId },
    create: {
      tenantId,
      announcementEnabled: true,
      announcementText: 'Complimentary delivery across Pakistan on orders over PKR 8,000 — WELCOME10 for 10% off',
      freeShippingThresholdCents: 800000,
      giftNotesEnabled: true,
      supportEmail: 'hello@essascollection.com',
      currency: 'PKR',
    },
    update: {
      announcementEnabled: true,
      announcementText: 'Complimentary delivery across Pakistan on orders over PKR 8,000 — WELCOME10 for 10% off',
      freeShippingThresholdCents: 800000,
      supportEmail: 'hello@essascollection.com',
      currency: 'PKR',
    },
  });

  await prisma.shippingZone.deleteMany({ where: { tenantId } });
  await prisma.shippingZone.createMany({
    data: [
      { tenantId, name: 'Pakistan Standard', countries: ['PK'], rateCents: 25000 },
      { tenantId, name: 'Karachi · Lahore · Islamabad', countries: ['PK'], rateCents: 15000 },
    ],
  });

  await prisma.taxRule.deleteMany({ where: { tenantId } });

  await prisma.coupon.upsert({
    where: { tenantId_code: { tenantId, code: 'WELCOME10' } },
    create: { tenantId, code: 'WELCOME10', type: 'percent', value: 10, maxUses: 1000 },
    update: { isActive: true },
  });
  await prisma.coupon.upsert({
    where: { tenantId_code: { tenantId, code: 'SAVE20' } },
    create: { tenantId, code: 'SAVE20', type: 'fixed', value: 50000, maxUses: 200 },
    update: { isActive: true, value: 50000 },
  });

  await prisma.discountRule.deleteMany({ where: { tenantId, type: 'free_shipping' } });
  await prisma.discountRule.create({
    data: {
      tenantId,
      name: 'Free shipping PKR 8,000+',
      type: 'free_shipping',
      value: 0,
      minSubtotalCents: 800000,
    },
  });

  for (const page of CONTENT_PAGES) {
    await prisma.contentPage.upsert({
      where: { tenantId_slug: { tenantId, slug: page.slug } },
      create: { tenantId, ...page, status: 'published' },
      update: { ...page, status: 'published' },
    });
  }

  let menu = await prisma.menu.findFirst({ where: { tenantId, key: 'main' } });
  if (!menu) {
    menu = await prisma.menu.create({ data: { tenantId, key: 'main', name: 'Main Menu' } });
  }
  await prisma.menuItem.deleteMany({ where: { menuId: menu.id } });
  await prisma.menuItem.createMany({
    data: [
      { tenantId, menuId: menu.id, label: 'Home', href: '/', sortOrder: 0 },
      { tenantId, menuId: menu.id, label: 'New Arrivals', href: '/collections/new-arrivals', sortOrder: 1 },
      { tenantId, menuId: menu.id, label: 'Lawn', href: '/collections/lawn', sortOrder: 2 },
      { tenantId, menuId: menu.id, label: 'Khaddar', href: '/collections/khaddar', sortOrder: 3 },
      { tenantId, menuId: menu.id, label: 'Linen', href: '/collections/linen', sortOrder: 4 },
      { tenantId, menuId: menu.id, label: 'Viscose', href: '/collections/viscose', sortOrder: 5 },
      { tenantId, menuId: menu.id, label: '2 Piece', href: '/collections/2-piece', sortOrder: 6 },
      { tenantId, menuId: menu.id, label: '3 Piece', href: '/collections/3-piece', sortOrder: 7 },
      { tenantId, menuId: menu.id, label: 'Dupattas', href: '/collections/dupattas', sortOrder: 8 },
    ],
  });

  await prisma.product.updateMany({
    where: { tenantId, tags: { has: '1-piece' } },
    data: { pieceType: 'ONE_PIECE' },
  });
  await prisma.product.updateMany({
    where: { tenantId, tags: { has: '2-piece' } },
    data: { pieceType: 'TWO_PIECE' },
  });
  await prisma.product.updateMany({
    where: { tenantId, tags: { has: '3-piece' } },
    data: { pieceType: 'THREE_PIECE' },
  });
  await prisma.product.updateMany({
    where: {
      tenantId,
      OR: [{ tags: { has: 'dupatta' } }, { tags: { has: 'dupattas' } }],
      NOT: {
        OR: [{ tags: { has: '1-piece' } }, { tags: { has: '2-piece' } }, { tags: { has: '3-piece' } }],
      },
    },
    data: { pieceType: 'DUPATTA' },
  });

  console.log("Applied Essa's Collection unstitched catalog and branding");
}
