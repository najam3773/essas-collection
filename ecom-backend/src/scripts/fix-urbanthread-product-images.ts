import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/** Portrait-friendly Unsplash crops so boutique cards show the garment. */
const MEDIA: Record<string, Array<{ url: string; alt: string }>> = {
  'essential-tee': [
    { url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&h=1200&q=80', alt: 'Essential Tee' },
  ],
  'relaxed-chino': [
    { url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&h=1200&q=80', alt: 'Relaxed Chino' },
  ],
  'city-slip-dress': [
    { url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&h=1200&q=80', alt: 'City Slip Dress' },
  ],
  'overshirt-jacket': [
    { url: 'https://images.unsplash.com/photo-1591043013405-a2a5129c5502?auto=format&fit=crop&w=900&h=1200&q=80', alt: 'Overshirt Jacket' },
  ],
  'boxy-crop-hoodie': [
    { url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&h=1200&q=80', alt: 'Boxy Crop Hoodie' },
  ],
  'pleated-midi-skirt': [
    { url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=900&h=1200&q=80', alt: 'Pleated Midi Skirt' },
  ],
  'linen-camp-shirt': [
    { url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&h=1200&q=80', alt: 'Linen Camp Shirt' },
  ],
  'wide-leg-trouser': [
    { url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&h=1200&q=80', alt: 'Wide-Leg Trouser' },
  ],
  'knit-polo': [
    { url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&h=1200&q=80', alt: 'Knit Polo' },
  ],
  'wrap-midi-dress': [
    { url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&h=1200&q=80', alt: 'Wrap Midi Dress' },
  ],
  'denim-trucker': [
    { url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=900&h=1200&q=80', alt: 'Denim Trucker' },
  ],
  'cargo-utility-pant': [
    { url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&h=1200&q=80', alt: 'Cargo Utility Pant' },
  ],
  'ribbed-tank': [
    { url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&h=1200&q=80', alt: 'Ribbed Tank' },
  ],
};

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'urbanthread' } });
  if (!tenant) throw new Error('urbanthread not found');

  let updated = 0;
  for (const [slug, media] of Object.entries(MEDIA)) {
    const res = await prisma.product.updateMany({
      where: { tenantId: tenant.id, slug },
      data: { media: media as Prisma.InputJsonValue },
    });
    updated += res.count;
  }

  console.log(JSON.stringify({ updated }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
