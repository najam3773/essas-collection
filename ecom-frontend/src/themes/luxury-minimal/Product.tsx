'use client';

import Link from 'next/link';
import { money } from '@/lib/api';
import { useProductDetail, variantLabel } from '../shared/useProductDetail';
import { LuxProductTile } from './ProductTile';

/** Vertical editorial PDP — stacked gallery, calm buy panel, journal-style reviews. */
export default function LuxuryProduct() {
  const d = useProductDetail();
  const {
    tenant,
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
    sizeGuide,
    setSizeGuide,
    recent,
    addedPulse,
    selected,
    displayPrice,
    displayOriginal,
    salePercent,
    stock,
    images,
    attrKeys,
    addToCart,
    addWishlist,
    submitReview,
    notifyStock,
    share,
  } = d;

  if (!product) {
    return (
      <main className="lux-pdp lux-pdp-loading">
        <p>Loading piece…</p>
      </main>
    );
  }

  return (
    <div className="lux-pdp">
      <nav className="lux-crumb">
        <Link href={'/'}>Home</Link>
        <span>/</span>
        {product.category?.slug ? (
          <Link href={`/collections/${product.category.slug}`}>{product.category.name}</Link>
        ) : (
          <span>{product.category?.name || 'Shop'}</span>
        )}
        <span>/</span>
        <em>{product.name}</em>
      </nav>

      <div className="lux-pdp-stage">
        <div className="lux-gallery">
          {(images.length ? images : [{ url: '' }]).map((m, i) => (
            <div
              key={`${m.url}-${i}`}
              className={`lux-gallery-frame${i === 0 ? ' is-hero' : ''}`}
              style={m.url ? { backgroundImage: `url(${m.url})` } : undefined}
            />
          ))}
        </div>

        <aside className="lux-buy">
          <p className="lux-eyebrow">{product.vendor || product.category?.name || 'Collection'}</p>
          <h1>{product.name}</h1>
          <div className="lux-buy-meta">
            <span>
              {'★'.repeat(Math.round(product.avgRating || 0))}
              {'☆'.repeat(5 - Math.round(product.avgRating || 0))}{' '}
              {product.reviewCount ? `${product.avgRating.toFixed(1)} · ${product.reviewCount}` : 'New'}
            </span>
            <span className={stock > 0 ? 'lux-stock' : 'lux-stock out'}>
              {stock > 0 ? `In stock · ${stock}` : 'Sold out'}
            </span>
          </div>

          <div className="lux-buy-price">
            <strong className={salePercent > 0 ? 'on-sale' : ''}>
              {displayPrice != null ? money(displayPrice) : ''}
            </strong>
            {displayOriginal != null && <s>{money(displayOriginal)}</s>}
            {salePercent > 0 && <span className="lux-sale-tag">{salePercent}% off</span>}
          </div>

          {product.description && <p className="lux-buy-desc">{product.description}</p>}

          {!!product.tags?.length && (
            <div className="lux-tags">
              {product.tags.map((t) => (
                <Link key={t} href={`/shop?q=${encodeURIComponent(t)}`}>
                  #{t}
                </Link>
              ))}
            </div>
          )}

          <div className="lux-options">
            <div className="lux-options-head">
              <span>{attrKeys.length ? attrKeys.join(' / ') : 'Select option'}</span>
              <button type="button" onClick={() => setSizeGuide(true)}>
                Size guide
              </button>
            </div>
            <div className="lux-swatches">
              {product.variants.map((v) => {
                const vStock = v.inventory?.[0]?.quantity ?? 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={variantId === v.id ? 'on' : ''}
                    disabled={vStock < 1 && variantId !== v.id}
                    onClick={() => {
                      setVariantId(v.id);
                      setQty(1);
                    }}
                  >
                    {variantLabel(v)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lux-qty">
            <span>Quantity</span>
            <div>
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                −
              </button>
              <em>{qty}</em>
              <button type="button" onClick={() => setQty((q) => Math.min(Math.max(1, stock), q + 1))}>
                +
              </button>
            </div>
          </div>

          <div className="lux-buy-actions">
            <button type="button" className="lux-btn" disabled={stock < 1} onClick={addToCart}>
              {stock < 1 ? 'Sold out' : addedPulse ? 'Added ✓' : 'Add to bag'}
            </button>
            <button type="button" className="lux-btn-outline" onClick={addWishlist}>
              Wishlist
            </button>
          </div>

          {stock < 1 && (
            <div className="lux-notify">
              <strong>Notify when available</strong>
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                />
                <button type="button" onClick={notifyStock}>
                  Notify
                </button>
              </div>
            </div>
          )}
          {message && <p className="success">{message}</p>}

          <ul className="lux-promises">
            <li>
              <strong>Complimentary shipping</strong> over $75
            </li>
            <li>
              <strong>Easy returns</strong> within 30 days
            </li>
            <li>
              <strong>Secure checkout</strong> encrypted
            </li>
            <li>
              <strong>Gallery</strong> {images.length} studio photos
            </li>
          </ul>

          <details className="lux-acc" open>
            <summary>Details</summary>
            {!!Object.keys(selected?.attributeValues || {}).length ? (
              <table>
                <tbody>
                  {Object.entries(selected!.attributeValues).map(([k, v]) => (
                    <tr key={k}>
                      <td>{k}</td>
                      <td>{v}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>SKU</td>
                    <td>{selected?.sku}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p>{product.description || 'Crafted with considered materials and lasting finish.'}</p>
            )}
          </details>
          <details className="lux-acc">
            <summary>Shipping & returns</summary>
            <p>
              Ships in 1–2 business days. Complimentary tracked shipping over $75. Returns within 30 days —
              unused, original packaging.
            </p>
          </details>
          <details className="lux-acc">
            <summary>Care</summary>
            <p>Store dry. Avoid harsh chemicals and prolonged water. Wipe gently with a soft cloth after wear.</p>
          </details>

          <div className="lux-share">
            <span>Share</span>
            <button type="button" onClick={() => share('copy')}>
              Copy
            </button>
            <button type="button" onClick={() => share('x')}>
              X
            </button>
            <button type="button" onClick={() => share('facebook')}>
              Facebook
            </button>
          </div>
        </aside>
      </div>

      <section className="lux-section lux-reviews">
        <div className="lux-section-head">
          <div>
            <p className="lux-eyebrow">Community</p>
            <h2>Reviews</h2>
          </div>
        </div>
        <div className="lux-reviews-grid">
          <div className="lux-review-list">
            {product.reviews.map((r) => (
              <article key={r.id}>
                <header>
                  <strong>{r.authorName}</strong>
                  <span>
                    {'★'.repeat(r.rating)}
                    {'☆'.repeat(5 - r.rating)}
                  </span>
                </header>
                {r.title && <h3>{r.title}</h3>}
                <p>{r.body}</p>
              </article>
            ))}
            {!product.reviews.length && <p className="muted">No reviews yet — be the first.</p>}
          </div>
          <form className="lux-review-form" onSubmit={submitReview}>
            <p className="lux-eyebrow">Write</p>
            <h3>Share your experience</h3>
            <label>
              Name
              <input name="authorName" required />
            </label>
            <div className="lux-rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className={rating >= n ? 'on' : ''} onClick={() => setRating(n)}>
                  {n}
                </button>
              ))}
            </div>
            <label>
              Title
              <input name="title" />
            </label>
            <label>
              Review
              <textarea name="body" rows={4} />
            </label>
            <button type="submit" className="lux-btn">
              Submit review
            </button>
          </form>
        </div>
      </section>

      {!!product.related.length && (
        <section className="lux-section">
          <div className="lux-section-head">
            <div>
              <p className="lux-eyebrow">Pair with</p>
              <h2>You may also like</h2>
            </div>
          </div>
          <div className="lux-product-row">
            {product.related.map((p) => (
              <LuxProductTile key={p.id} tenant={tenant} product={p} />
            ))}
          </div>
        </section>
      )}

      {!!recent.length && (
        <section className="lux-section">
          <div className="lux-section-head">
            <div>
              <p className="lux-eyebrow">Continue</p>
              <h2>Recently viewed</h2>
            </div>
          </div>
          <div className="lux-recent-rail">
            {recent.map((r) => (
              <Link key={r.id} href={`/product/${r.slug}`} className="lux-recent">
                <div style={r.image ? { backgroundImage: `url(${r.image})` } : undefined} />
                <strong>{r.name}</strong>
                <span>{r.priceCents != null ? money(r.priceCents) : ''}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {sizeGuide && (
        <div className="lux-modal" onClick={() => setSizeGuide(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>Size guide</h2>
              <button type="button" onClick={() => setSizeGuide(false)}>
                Close
              </button>
            </header>
            <table>
              <thead>
                <tr>
                  <th>Label</th>
                  <th>US</th>
                  <th>EU</th>
                  <th>Chest / diameter</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>XS / 5</td>
                  <td>XS / 5</td>
                  <td>34 / 15.7</td>
                  <td>32–34 in</td>
                </tr>
                <tr>
                  <td>S / 6</td>
                  <td>S / 6</td>
                  <td>36 / 16.5</td>
                  <td>34–36 in</td>
                </tr>
                <tr>
                  <td>M / 7</td>
                  <td>M / 7</td>
                  <td>38 / 17.3</td>
                  <td>36–38 in</td>
                </tr>
                <tr>
                  <td>L / 8</td>
                  <td>L / 8</td>
                  <td>40 / 18.1</td>
                  <td>38–40 in</td>
                </tr>
                <tr>
                  <td>XL / 9</td>
                  <td>XL / 9</td>
                  <td>42 / 18.9</td>
                  <td>40–42 in</td>
                </tr>
              </tbody>
            </table>
            <p>Tip: if between sizes, size up for rings and apparel.</p>
          </div>
        </div>
      )}
    </div>
  );
}
