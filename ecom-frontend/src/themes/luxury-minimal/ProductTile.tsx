'use client';

import Link from 'next/link';
import { money } from '@/lib/api';
import type { ProductCardData } from '@/components/ProductCard';

/** Editorial tile — image above, hairline rules, no quick-view chrome. */
export function LuxProductTile({ tenant, product }: { tenant: string; product: ProductCardData }) {
  const img = product.media?.[0]?.url || '';
  const price = product.fromPriceCents ?? product.variants?.[0]?.salePriceCents ?? product.variants?.[0]?.priceCents ?? 0;
  const original =
    product.originalPriceCents && product.originalPriceCents > price
      ? product.originalPriceCents
      : product.variants?.[0]?.compareAtCents && product.variants[0].compareAtCents > price
        ? product.variants[0].compareAtCents
        : null;

  return (
    <Link href={`/product/${product.slug}`} className="lux-tile">
      <div className="lux-tile-media" style={img ? { backgroundImage: `url(${img})` } : undefined}>
        {product.onSale || (original && original > price) ? <span className="lux-tile-tag">Sale</span> : null}
      </div>
      <div className="lux-tile-meta">
        <span className="lux-tile-cat">{product.category?.name || 'Collection'}</span>
        <strong className="lux-tile-name">{product.name}</strong>
        <span className="lux-tile-price">
          {money(price)}
          {original && original > price ? <s>{money(original)}</s> : null}
        </span>
      </div>
    </Link>
  );
}
