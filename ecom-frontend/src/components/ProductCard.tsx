'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { money } from '@/lib/api';
import { QuickView } from '@/components/QuickView';
import { getCompare, toggleCompare } from '@/lib/recently-viewed';
import { fabricFromProduct, pieceLabelFromProduct } from '@/lib/unstitched';

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  media?: Array<{ url: string }>;
  fromPriceCents?: number;
  originalPriceCents?: number;
  salePercent?: number;
  onSale?: boolean;
  variants?: Array<{
    priceCents: number;
    compareAtCents?: number | null;
    salePriceCents?: number;
    saleOriginalCents?: number;
    salePercent?: number;
  }>;
  avgRating?: number;
  reviewCount?: number;
  inStock?: boolean;
  featured?: boolean;
  tags?: string[];
  pieceType?: string | null;
  category?: { name: string; slug?: string } | null;
};

function stars(n = 0) {
  const full = Math.round(n || 0);
  return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(full);
}

export function ProductCard({ tenant, product }: { tenant: string; product: ProductCardData }) {
  const salePercent = product.salePercent || 0;
  const price = product.fromPriceCents ?? product.variants?.[0]?.salePriceCents ?? product.variants?.[0]?.priceCents ?? 0;
  const original =
    product.originalPriceCents && product.originalPriceCents > price
      ? product.originalPriceCents
      : product.variants?.[0]?.compareAtCents && product.variants[0].compareAtCents > price
        ? product.variants[0].compareAtCents
        : null;
  const onSale = !!(product.onSale || (salePercent > 0 && original && original > price) || (original && original > price));
  const imgs = (product.media || []).map((m) => m.url).filter(Boolean);
  const [hover, setHover] = useState(false);
  const [quick, setQuick] = useState(false);
  const [compared, setCompared] = useState(false);
  const img = hover && imgs[1] ? imgs[1] : imgs[0];

  useEffect(() => {
    setCompared(getCompare(tenant).includes(product.id));
  }, [tenant, product.id]);

  return (
    <>
      <article
        className="product-card reveal"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div className="quick-actions">
          <button className="btn sm gold" type="button" onClick={() => setQuick(true)}>Quick view</button>
          <button
            className="btn sm secondary"
            type="button"
            onClick={() => setCompared(toggleCompare(tenant, product.id).includes(product.id))}
          >
            {compared ? 'Compared' : 'Compare'}
          </button>
        </div>
        <Link href={`/product/${product.slug}`}>
          <div className="media-frame">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt={product.name} />
            ) : (
              <div className="product-media" />
            )}
            {product.inStock === false && <span className="chip">Sold out</span>}
            {onSale && (
              <span className="chip sale-chip">
                {salePercent > 0 ? `${salePercent}% off` : 'Sale'}
              </span>
            )}
            {imgs.length > 1 && (
              <span className="chip" style={{ left: 'auto', right: 12 }}>{imgs.length} photos</span>
            )}
          </div>
          <div className="muted" style={{ fontSize: '.78rem', marginTop: 12, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            {[pieceLabelFromProduct(product), fabricFromProduct(product) || product.category?.name].filter(Boolean).join(' · ')}
          </div>
          <div className="title">{product.name}</div>
          {(product.reviewCount || 0) > 0 && (
            <div className="stars">
              {stars(product.avgRating)} <span className="muted">({product.reviewCount})</span>
            </div>
          )}
          <div className="price-row">
            <span className={`price ${onSale ? 'sale-price' : ''}`}>{money(price)}</span>
            {onSale && original && original > price && <span className="compare">{money(original)}</span>}
            {salePercent > 0 && <span className="card-sale-label">{salePercent}% off</span>}
          </div>
        </Link>
      </article>
      {quick && <QuickView tenant={tenant} slug={product.slug} onClose={() => setQuick(false)} />}
    </>
  );
}
