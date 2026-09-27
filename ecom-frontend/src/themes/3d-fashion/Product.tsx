'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { money } from '@/lib/api';
import { useProductDetail, variantLabel } from '../shared/useProductDetail';
import { LookCard } from './LookCard';

const ProductStage = dynamic(() => import('./showroom/ProductStage'), {
  ssr: false,
  loading: () => <div className="vx-loading">Loading look…</div>,
});

export default function VirtualBoutiqueProduct() {
  const {
    tenant,
    slug,
    product,
    variantId,
    setVariantId,
    qty,
    setQty,
    message,
    rating,
    setRating,
    notifyEmail,
    setNotifyEmail,
    selected,
    displayPrice,
    displayOriginal,
    stock,
    attrKeys,
    addToCart,
    addWishlist,
    submitReview,
    notifyStock,
    recent,
  } = useProductDetail();

  if (!product) {
    return (
      <main className="vx-page">
        <div className="vx-loading" style={{ position: 'relative', minHeight: 320 }}>
          Loading look…
        </div>
      </main>
    );
  }

  const stageProduct = {
    id: product.id,
    name: product.name,
    slug,
    media: product.media,
    category: product.category,
    fromPriceCents: product.fromPriceCents,
    variants: product.variants,
  };

  return (
    <div className="vx-pdp">
      <div className="vx-pdp-stage">
        <div className="vx-canvas-wrap">
          <ProductStage product={stageProduct} />
        </div>
      </div>

      <div className="vx-pdp-info">
        <p className="vx-kicker">{product.vendor || product.category?.name || 'Look'}</p>
        <h1>{product.name}</h1>
        <p className="vx-price">
          {displayPrice != null ? money(displayPrice) : ''}
          {displayOriginal != null && (
            <span style={{ marginLeft: 10, opacity: 0.55, textDecoration: 'line-through' }}>
              {money(displayOriginal)}
            </span>
          )}
        </p>
        {product.description && <p style={{ color: 'var(--vx-muted)', lineHeight: 1.6 }}>{product.description}</p>}

        {attrKeys.map((key) => {
          const values = [...new Set(product.variants.map((v) => v.attributeValues?.[key]).filter(Boolean))];
          return (
            <div key={key}>
              <p className="vx-kicker">{key}</p>
              <div className="vx-swatches">
                {values.map((val) => {
                  const match = product.variants.find((v) => v.attributeValues?.[key] === val);
                  return (
                    <button
                      key={String(val)}
                      type="button"
                      className={match?.id === variantId ? 'on' : undefined}
                      onClick={() => match && setVariantId(match.id)}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {!attrKeys.length && (
          <div className="vx-swatches">
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                className={v.id === variantId ? 'on' : undefined}
                onClick={() => setVariantId(v.id)}
              >
                {variantLabel(v)}
              </button>
            ))}
          </div>
        )}

        <div className="vx-qty">
          <button type="button" onClick={() => setQty((n) => Math.max(1, n - 1))}>
            −
          </button>
          <strong>{qty}</strong>
          <button type="button" onClick={() => setQty((n) => n + 1)}>
            +
          </button>
        </div>

        <div className="vx-pdp-actions">
          {stock > 0 ? (
            <button type="button" className="vx-btn" onClick={addToCart}>
              Add to bag
            </button>
          ) : (
            <div style={{ display: 'grid', gap: 8, width: '100%' }}>
              <input
                className="vx-field"
                placeholder="Email for restock"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
              />
              <button type="button" className="vx-btn ghost" onClick={notifyStock}>
                Notify me
              </button>
            </div>
          )}
          <button type="button" className="vx-btn ghost" onClick={addWishlist}>
            Wishlist
          </button>
        </div>
        <p className="vx-msg">{message}</p>

        <details className="vx-acc" open>
          <summary>Details</summary>
          <p style={{ color: 'var(--vx-muted)' }}>SKU {selected?.sku || '—'}. Hang dry. Limited run.</p>
        </details>

        <section>
          <p className="vx-kicker">Reviews</p>
          <div className="vx-review-list">
            {product.reviews.map((r) => (
              <article key={r.id}>
                <strong>
                  {'★'.repeat(r.rating)}
                  {'☆'.repeat(5 - r.rating)}
                </strong>
                <div>{r.authorName}</div>
                {r.body && <p style={{ color: 'var(--vx-muted)' }}>{r.body}</p>}
              </article>
            ))}
            {!product.reviews.length && <p className="vx-empty">No reviews yet.</p>}
          </div>
          <form className="vx-review-form" onSubmit={submitReview}>
            <input className="vx-field" name="authorName" required placeholder="Your name" />
            <div className="vx-rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className={n <= rating ? 'on' : undefined} onClick={() => setRating(n)}>
                  ★
                </button>
              ))}
            </div>
            <input className="vx-field" name="title" placeholder="Title" />
            <textarea className="vx-field" name="body" rows={3} placeholder="How does it wear?" />
            <button type="submit" className="vx-btn">
              Submit review
            </button>
          </form>
        </section>
      </div>

      {product.related?.length > 0 && (
        <section style={{ gridColumn: '1 / -1' }}>
          <p className="vx-kicker">Style with</p>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', margin: '6px 0 16px' }}>Related looks</h2>
          <div className="vx-look-grid">
            {product.related.slice(0, 4).map((p) => (
              <LookCard key={p.id} tenant={tenant} product={p} />
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section style={{ gridColumn: '1 / -1' }}>
          <p className="vx-kicker">Recently viewed</p>
          <div className="vx-look-grid">
            {recent.slice(0, 4).map((p) => (
              <Link key={p.slug} href={`/product/${p.slug}`} className="vx-look">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="vx-look-media"
                    src={
                      p.image.includes('images.unsplash.com')
                        ? `${p.image.split('?')[0]}?auto=format&fit=crop&w=900&h=1200&q=80`
                        : p.image
                    }
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <div className="vx-look-media vx-look-media--empty" aria-hidden />
                )}
                <span className="vx-look-veil" aria-hidden />
                <div className="vx-look-copy">
                  <strong>{p.name}</strong>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="vx-sticky">
        <strong>{product.name}</strong>
        <button type="button" className="vx-btn" disabled={stock <= 0} onClick={addToCart}>
          {stock > 0 ? 'Add to bag' : 'Sold out'}
        </button>
      </div>
    </div>
  );
}
