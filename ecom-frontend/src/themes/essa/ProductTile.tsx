'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, money } from '@/lib/api';
import { getCustomerToken } from '@/lib/store-auth';
import { fabricFromProduct, pieceLabelFromProduct } from '@/lib/unstitched';
import type { ProductCardData } from '@/components/ProductCard';

type TileProduct = ProductCardData & { tags?: string[] };

export function EssaProductTile({
  tenant,
  product,
}: {
  tenant: string;
  product: TileProduct;
}) {
  const img = product.media?.[0]?.url || '';
  const price = product.fromPriceCents ?? product.variants?.[0]?.salePriceCents ?? product.variants?.[0]?.priceCents ?? 0;
  const original =
    product.originalPriceCents && product.originalPriceCents > price
      ? product.originalPriceCents
      : product.variants?.[0]?.compareAtCents && product.variants[0].compareAtCents > price
        ? product.variants[0].compareAtCents
        : null;
  const pieces = pieceLabelFromProduct(product);
  const fabric = fabricFromProduct(product);
  const [saved, setSaved] = useState(false);
  const onSale = !!(original && original > price);

  async function wish(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const token = getCustomerToken(tenant);
    if (!token) {
      window.location.href = '/login';
      return;
    }
    await api(`/storefront/wishlist/${product.id}`, { token, method: 'POST', body: {} });
    setSaved(true);
  }

  return (
    <article className="essa-tile">
      <Link href={`/product/${product.slug}`} className="essa-tile-link">
        <div className="essa-tile-media">
          {img ? (
            <img src={img} alt={product.name} width={600} height={800} loading="lazy" decoding="async" />
          ) : null}
          {onSale ? <span className="essa-tile-sale">Sale</span> : null}
          <button type="button" className={`essa-heart${saved ? ' on' : ''}`} aria-label="Add to wishlist" onClick={wish}>
            {saved ? '♥' : '♡'}
          </button>
        </div>
        <div className="essa-tile-meta">
          <h3>{product.name}</h3>
          <p>{[pieces, fabric].filter(Boolean).join(' · ') || 'Unstitched'}</p>
          <div className="essa-tile-price">
            <strong>{money(price)}</strong>
            {onSale && original ? <s>{money(original)}</s> : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
