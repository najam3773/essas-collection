'use client';

import Link from 'next/link';
import { money } from '@/lib/api';
import type { ProductCardData } from '@/components/ProductCard';

function priceOf(p: ProductCardData) {
  return p.fromPriceCents ?? p.variants?.[0]?.salePriceCents ?? p.variants?.[0]?.priceCents ?? null;
}

/** Prefer a portrait crop so tall look cards show the garment, not a fabric close-up. */
function framedUrl(url: string) {
  if (!url) return '';
  if (!url.includes('images.unsplash.com')) return url;
  const base = url.split('?')[0];
  return `${base}?auto=format&fit=crop&w=900&h=1200&q=80`;
}

export function LookCard({ tenant, product }: { tenant: string; product: ProductCardData }) {
  const img = framedUrl(product.media?.[0]?.url || '');
  const price = priceOf(product);

  return (
    <Link href={`/product/${product.slug}`} className="vx-look">
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="vx-look-media" src={img} alt="" loading="lazy" />
      ) : (
        <div className="vx-look-media vx-look-media--empty" aria-hidden />
      )}
      <span className="vx-look-veil" aria-hidden />
      <div className="vx-look-copy">
        <span>{product.category?.name || 'Look'}</span>
        <strong>{product.name}</strong>
        {price != null && <em>{money(price)}</em>}
      </div>
    </Link>
  );
}
