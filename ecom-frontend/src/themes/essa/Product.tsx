'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { money } from '@/lib/api';
import { fabricFromProduct, includedPieces, pieceLabelFromProduct } from '@/lib/unstitched';
import { useProductDetail } from '../shared/useProductDetail';
import { EssaProductTile } from './ProductTile';

export default function EssaProduct() {
  const router = useRouter();
  const d = useProductDetail();
  const {
    product,
    qty,
    setQty,
    message,
    addedPulse,
    selected,
    displayPrice,
    displayOriginal,
    salePercent,
    stock,
    images,
    addToCart,
    addWishlist,
  } = d;
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [product?.id]);

  if (!product) {
    return (
      <main className="essa-pdp">
        <p>Loading piece…</p>
      </main>
    );
  }

  const attrs = selected?.attributeValues || {};
  const fabric = attrs.fabric || fabricFromProduct(product);
  const pieces = attrs.pieces || pieceLabelFromProduct(product);
  const color = attrs.color || '';
  const included = includedPieces(pieces);
  const desc = (product.description || '').split('\n\nFabric information:')[0];
  const fabricInfo = attrs.pattern
    ? `${fabric}${attrs.pattern ? ` · ${attrs.pattern}` : ''}${attrs.season ? ` · ${attrs.season}` : ''}`
    : (product.description || '').split('\n\nFabric information:')[1] || '';
  const gallery = images.length ? images : [{ url: '', alt: product.name }];
  const current = gallery[Math.min(active, gallery.length - 1)] || gallery[0];

  async function buyNow() {
    await addToCart();
    router.push('/cart');
  }

  return (
    <div className="essa-pdp">
      <nav className="essa-crumb">
        <Link href="/">Home</Link>
        <span>/</span>
        {product.category?.slug ? (
          <Link href={`/collections/${product.category.slug}`}>{product.category.name}</Link>
        ) : (
          <span>Shop</span>
        )}
        <span>/</span>
        <em>{product.name}</em>
      </nav>

      <div className="essa-pdp-stage">
        <div className="essa-gallery">
          <div className="essa-gallery-frame is-hero">
            {current?.url ? (
              <img src={current.url} alt={current.alt || product.name} width={900} height={1200} fetchPriority="high" decoding="async" />
            ) : null}
          </div>
          {gallery.length > 1 && (
            <div className="essa-thumbs" role="tablist" aria-label="Product images">
              {gallery.map((m, i) => (
                <button
                  key={`${m.url}-${i}`}
                  type="button"
                  className={i === active ? 'on' : ''}
                  onClick={() => setActive(i)}
                  aria-label={`View image ${i + 1}`}
                >
                  {m.url ? <img src={m.url} alt="" width={120} height={160} loading="lazy" decoding="async" /> : null}
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="essa-buy">
          <p className="essa-eyebrow">{product.vendor || 'Essa’s Collection'}</p>
          <h1>{product.name}</h1>
          <div className="essa-buy-price">
            <strong className={salePercent > 0 ? 'on-sale' : ''}>
              {displayPrice != null ? money(displayPrice) : ''}
            </strong>
            {displayOriginal != null && <s>{money(displayOriginal)}</s>}
          </div>

          <dl className="essa-specs">
            <div>
              <dt>Fabric</dt>
              <dd>{fabric || '—'}</dd>
            </div>
            <div>
              <dt>Piece Type</dt>
              <dd>{pieces || '—'}</dd>
            </div>
            <div>
              <dt>Color</dt>
              <dd>{color || '—'}</dd>
            </div>
            <div>
              <dt>Availability</dt>
              <dd className={stock > 0 ? 'in' : 'out'}>{stock > 0 ? 'In Stock' : 'Sold out'}</dd>
            </div>
          </dl>

          {desc && <p className="essa-buy-desc">{desc}</p>}

          <div className="essa-qty">
            <span>Quantity</span>
            <div>
              <button type="button" onClick={() => setQty((n) => Math.max(1, n - 1))}>
                −
              </button>
              <em>{qty}</em>
              <button type="button" onClick={() => setQty((n) => Math.min(Math.max(1, stock), n + 1))}>
                +
              </button>
            </div>
          </div>

          <div className="essa-buy-actions">
            <button type="button" className="essa-btn" disabled={stock < 1} onClick={addToCart}>
              {stock < 1 ? 'Sold out' : addedPulse ? 'Added' : 'Add to Cart'}
            </button>
            <button type="button" className="essa-btn-ghost" disabled={stock < 1} onClick={buyNow}>
              Buy Now
            </button>
            <button type="button" className="essa-btn-ghost" onClick={addWishlist}>
              Wishlist
            </button>
          </div>
          {message && <p className="success">{message}</p>}

          {included.length > 0 && (
            <section className="essa-panel">
              <h2>What’s Included</h2>
              <ul>
                {included.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {fabricInfo && (
            <section className="essa-panel">
              <h2>Fabric information</h2>
              <p>{fabricInfo}</p>
            </section>
          )}

          <section className="essa-panel">
            <h2>Delivery information</h2>
            <p>
              Packed in 1–2 working days. Complimentary delivery across Pakistan on orders over PKR 8,000.
              Exchanges accepted within 7 days on unused, uncut fabric.
            </p>
          </section>
        </aside>
      </div>

      {!!product.related.length && (
        <section className="essa-section">
          <div className="essa-section-head">
            <div>
              <p className="essa-eyebrow">Pair with</p>
              <h2>You may also like</h2>
            </div>
          </div>
          <div className="essa-product-grid">
            {product.related.map((p) => (
              <EssaProductTile key={p.id} tenant="" product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
