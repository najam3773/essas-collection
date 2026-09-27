import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Extra = {
  name: string;
  slug: string;
  categorySlug: string;
  description: string;
  media: Array<{ url: string; alt?: string }>;
  variants: Array<{
    sku: string;
    priceCents: number;
    compareAtCents?: number;
    qty: number;
    attrs: Record<string, string>;
  }>;
  featured?: boolean;
  tags?: string[];
};

const PRODUCTS: Extra[] = [
  {
    name: 'Relaxed Chino',
    slug: 'relaxed-chino',
    categorySlug: 'bottoms',
    description: 'Breathable chino with a clean tapered fit for everyday city wear.',
    media: [
      { url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1200', alt: 'Front' },
      { url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200', alt: 'Fit' },
    ],
    variants: [
      { sku: 'UT-CHI-30', priceCents: 6900, qty: 28, attrs: { size: 'S', color: 'Sand' } },
      { sku: 'UT-CHI-32', priceCents: 6900, qty: 40, attrs: { size: 'M', color: 'Blue' } },
      { sku: 'UT-CHI-34', priceCents: 6900, qty: 24, attrs: { size: 'L', color: 'Olive' } },
    ],
    featured: true,
    tags: ['essentials', 'bottoms'],
  },
  {
    name: 'City Slip Dress',
    slug: 'city-slip-dress',
    categorySlug: 'dresses',
    description: 'Fluid slip silhouette that moves from day meetings to night plans.',
    media: [
      { url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=1200', alt: 'Front' },
      { url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200', alt: 'Lifestyle' },
    ],
    variants: [
      { sku: 'UT-DRS-S', priceCents: 8900, compareAtCents: 11000, qty: 22, attrs: { size: 'S', color: 'Black' } },
      { sku: 'UT-DRS-M', priceCents: 8900, compareAtCents: 11000, qty: 18, attrs: { size: 'M', color: 'Black' } },
      { sku: 'UT-DRS-L', priceCents: 8900, compareAtCents: 11000, qty: 12, attrs: { size: 'L', color: 'Champagne' } },
    ],
    featured: true,
    tags: ['dresses', 'new'],
  },
  {
    name: 'Overshirt Jacket',
    slug: 'overshirt-jacket',
    categorySlug: 'tops',
    description: 'Layerable washed-cotton overshirt with a broken-in feel.',
    media: [
      { url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1200', alt: 'Front' },
      { url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200', alt: 'Back' },
    ],
    variants: [
      { sku: 'UT-JKT-M', priceCents: 9900, qty: 20, attrs: { size: 'M', color: 'Stone' } },
      { sku: 'UT-JKT-L', priceCents: 9900, qty: 18, attrs: { size: 'L', color: 'White' } },
    ],
    featured: true,
    tags: ['outerwear', 'bestseller'],
  },
  {
    name: 'Boxy Crop Hoodie',
    slug: 'boxy-crop-hoodie',
    categorySlug: 'tops',
    description: 'Soft fleece hoodie with a modern boxy crop and ribbed cuffs.',
    media: [
      { url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1200', alt: 'Hoodie' },
      { url: 'https://images.unsplash.com/photo-1578587018452-892baccfd648?w=1200', alt: 'Detail' },
    ],
    variants: [
      { sku: 'UT-HD-S', priceCents: 7800, qty: 30, attrs: { size: 'S', color: 'Grey' } },
      { sku: 'UT-HD-M', priceCents: 7800, qty: 34, attrs: { size: 'M', color: 'Grey' } },
      { sku: 'UT-HD-L', priceCents: 7800, qty: 26, attrs: { size: 'L', color: 'Black' } },
    ],
    tags: ['tops', 'essentials'],
  },
  {
    name: 'Pleated Midi Skirt',
    slug: 'pleated-midi-skirt',
    categorySlug: 'bottoms',
    description: 'Light pleats with a flattering midi length and elastic waist.',
    media: [
      { url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=1200', alt: 'Skirt' },
      { url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=1200', alt: 'Styled' },
    ],
    variants: [
      { sku: 'UT-SKT-S', priceCents: 7400, qty: 20, attrs: { size: 'S', color: 'Ivory' } },
      { sku: 'UT-SKT-M', priceCents: 7400, qty: 24, attrs: { size: 'M', color: 'Ivory' } },
      { sku: 'UT-SKT-L', priceCents: 7400, qty: 16, attrs: { size: 'L', color: 'Black' } },
    ],
    tags: ['bottoms', 'new'],
  },
  {
    name: 'Linen Camp Shirt',
    slug: 'linen-camp-shirt',
    categorySlug: 'tops',
    description: 'Breathable linen camp collar shirt for warm-weather layers.',
    media: [
      { url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1200', alt: 'Shirt' },
      { url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200', alt: 'Texture' },
    ],
    variants: [
      { sku: 'UT-LN-M', priceCents: 8200, qty: 22, attrs: { size: 'M', color: 'White' } },
      { sku: 'UT-LN-L', priceCents: 8200, qty: 20, attrs: { size: 'L', color: 'Sage' } },
    ],
    tags: ['tops', 'summer'],
  },
  {
    name: 'Wide-Leg Trouser',
    slug: 'wide-leg-trouser',
    categorySlug: 'bottoms',
    description: 'Tailored wide-leg trouser with a soft drape and clean crease.',
    media: [
      { url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=1200', alt: 'Trouser' },
      { url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1200', alt: 'Detail' },
    ],
    variants: [
      { sku: 'UT-TR-30', priceCents: 9800, compareAtCents: 11800, qty: 18, attrs: { size: 'S', color: 'Charcoal' } },
      { sku: 'UT-TR-32', priceCents: 9800, compareAtCents: 11800, qty: 22, attrs: { size: 'M', color: 'Charcoal' } },
      { sku: 'UT-TR-34', priceCents: 9800, compareAtCents: 11800, qty: 14, attrs: { size: 'L', color: 'Black' } },
    ],
    featured: true,
    tags: ['bottoms', 'bestseller'],
  },
  {
    name: 'Knit Polo',
    slug: 'knit-polo',
    categorySlug: 'tops',
    description: 'Fine-gauge knit polo with a soft hand feel and neat collar.',
    media: [
      { url: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=1200', alt: 'Polo' },
      { url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200', alt: 'Detail' },
    ],
    variants: [
      { sku: 'UT-PO-M', priceCents: 6400, qty: 30, attrs: { size: 'M', color: 'Navy' } },
      { sku: 'UT-PO-L', priceCents: 6400, qty: 26, attrs: { size: 'L', color: 'Cream' } },
    ],
    tags: ['tops', 'essentials'],
  },
  {
    name: 'Wrap Midi Dress',
    slug: 'wrap-midi-dress',
    categorySlug: 'dresses',
    description: 'Flattering wrap midi with adjustable tie and soft stretch jersey.',
    media: [
      { url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=1200', alt: 'Dress' },
      { url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=1200', alt: 'Look' },
    ],
    variants: [
      { sku: 'UT-WRP-S', priceCents: 9400, qty: 16, attrs: { size: 'S', color: 'Wine' } },
      { sku: 'UT-WRP-M', priceCents: 9400, qty: 20, attrs: { size: 'M', color: 'Wine' } },
      { sku: 'UT-WRP-L', priceCents: 9400, qty: 14, attrs: { size: 'L', color: 'Forest' } },
    ],
    tags: ['dresses', 'new'],
  },
  {
    name: 'Denim Trucker',
    slug: 'denim-trucker',
    categorySlug: 'tops',
    description: 'Classic trucker jacket in mid-wash denim with metal hardware.',
    media: [
      { url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=1200', alt: 'Jacket' },
      { url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1200', alt: 'Detail' },
    ],
    variants: [
      { sku: 'UT-DN-M', priceCents: 11200, qty: 18, attrs: { size: 'M', color: 'Indigo' } },
      { sku: 'UT-DN-L', priceCents: 11200, qty: 16, attrs: { size: 'L', color: 'Indigo' } },
      { sku: 'UT-DN-XL', priceCents: 11200, qty: 10, attrs: { size: 'XL', color: 'Black' } },
    ],
    featured: true,
    tags: ['outerwear', 'bestseller'],
  },
  {
    name: 'Cargo Utility Pant',
    slug: 'cargo-utility-pant',
    categorySlug: 'bottoms',
    description: 'Utility cargo with roomy pockets and a tapered ankle.',
    media: [
      { url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=1200', alt: 'Cargo' },
      { url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1200', alt: 'Fit' },
    ],
    variants: [
      { sku: 'UT-CG-30', priceCents: 8600, qty: 24, attrs: { size: 'S', color: 'Khaki' } },
      { sku: 'UT-CG-32', priceCents: 8600, qty: 28, attrs: { size: 'M', color: 'Khaki' } },
      { sku: 'UT-CG-34', priceCents: 8600, qty: 20, attrs: { size: 'L', color: 'Black' } },
    ],
    tags: ['bottoms', 'essentials'],
  },
  {
    name: 'Ribbed Tank',
    slug: 'ribbed-tank',
    categorySlug: 'tops',
    description: 'Close-fit ribbed tank for layering or warm days.',
    media: [
      { url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1200', alt: 'Tank' },
      { url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200', alt: 'Fabric' },
    ],
    variants: [
      { sku: 'UT-TK-S', priceCents: 3200, qty: 40, attrs: { size: 'S', color: 'White' } },
      { sku: 'UT-TK-M', priceCents: 3200, qty: 44, attrs: { size: 'M', color: 'Black' } },
      { sku: 'UT-TK-L', priceCents: 3200, qty: 36, attrs: { size: 'L', color: 'White' } },
    ],
    tags: ['tops', 'basics'],
  },
];

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'urbanthread' } });
  if (!tenant) throw new Error('urbanthread tenant not found');

  const categories = await prisma.category.findMany({ where: { tenantId: tenant.id } });
  const bySlug = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

  let created = 0;
  let skipped = 0;

  for (const p of PRODUCTS) {
    const exists = await prisma.product.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug: p.slug } },
    });
    if (exists) {
      skipped += 1;
      continue;
    }

    await prisma.product.create({
      data: {
        tenantId: tenant.id,
        categoryId: bySlug[p.categorySlug] || null,
        name: p.name,
        slug: p.slug,
        description: p.description,
        status: 'active',
        featured: !!p.featured,
        tags: p.tags || ['essentials'],
        vendor: 'Urban Thread Studio',
        seoTitle: `${p.name} | Urban Thread`,
        seoDescription: p.description,
        media: p.media,
        variants: {
          create: p.variants.map((v) => ({
            tenantId: tenant.id,
            sku: v.sku,
            priceCents: v.priceCents,
            compareAtCents: v.compareAtCents,
            attributeValues: v.attrs,
            inventory: { create: { tenantId: tenant.id, quantity: v.qty } },
          })),
        },
      },
    });
    created += 1;
  }

  // Ensure Essential Tee stays featured
  await prisma.product.updateMany({
    where: { tenantId: tenant.id, slug: 'essential-tee' },
    data: { featured: true, tags: ['bestseller', 'essentials', 'tops'], vendor: 'Urban Thread Studio' },
  });

  const total = await prisma.product.count({ where: { tenantId: tenant.id } });
  console.log(JSON.stringify({ created, skipped, total }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
