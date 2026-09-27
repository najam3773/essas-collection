'use client';

import Link from 'next/link';
import { money } from '@/lib/api';
import type { ProductCardData } from '@/components/ProductCard';

/** Overlay tile — full-bleed image with name/price stacked on top. */
export function FbProductTile({ tenant, product }: { tenant: string; product: ProductCardData }) {
  const imgs = (product.media || []).map((m) => m.url).filter(Boolean);
  const img = imgs[0] || '';
  const price = product.fromPriceCents ?? product.variants?.[0]?.salePriceCents ?? product.variants?.[0]?.priceCents ?? 0;
  const original =
    product.originalPriceCents && product.originalPriceCents > price
      ? product.originalPriceCents
      : product.variants?.[0]?.compareAtCents && product.variants[0].compareAtCents > price
        ? product.variants[0].compareAtCents
        : null;
  const onSale = !!(product.onSale || (original && original > price));

  return (
    <Link href={`/product/${product.slug}`} className="fb-tile">
      <div className="fb-tile-media" style={img ? { backgroundImage: `url(${img})` } : undefined}>
        {onSale && <span className="fb-tile-sale">SALE</span>}
        {product.inStock === false && <span className="fb-tile-sold">SOLD OUT</span>}
        <div className="fb-tile-copy">
          <span>{product.category?.name || 'DROP'}</span>
          <strong>{product.name}</strong>
          <em>
            {money(price)}
            {original && original > price ? <s>{money(original)}</s> : null}
          </em>
        </div>
      </div>
    </Link>
  );
}
