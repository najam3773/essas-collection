'use client';

import Link from 'next/link';
import { money } from '@/lib/api';
import { useProductDetail, variantLabel } from '../shared/useProductDetail';
import { FbProductTile } from './ProductTile';

/** Horizontal street PDP — swipe thumbs, bold ATC bar, dense related wall. */
export default function FashionProduct() {
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
      <main className="fb-pdp fb-pdp-loading">
        <p>LOADING…</p>
      </main>
    );
  }

  const gallery = images.length ? images : [{ url: '' }];

  return (
    <div className="fb-pdp">
      <div className="fb-pdp-top">
        <Link href={'/shop'}>← BACK</Link>
        <span>{product.category?.name?.toUpperCase() || 'DROP'}</span>
        <button type="button" onClick={() => share('copy')}>
          SHARE
        </button>
      </div>

      <div className="fb-pdp-stage">
        <div className="fb-pdp-gallery">
          <div
            className="fb-pdp-hero"
            style={gallery[0]?.url ? { backgroundImage: `url(${gallery[0].url})` } : undefined}
          />
          <div className="fb-pdp-thumbs">
            {gallery.map((m, i) => (
              <div
                key={`${m.url}-${i}`}
                style={m.url ? { backgroundImage: `url(${m.url})` } : undefined}
              />
            ))}
          </div>
        </div>

        <div className="fb-pdp-panel">
          <p className="fb-kicker">{product.vendor || 'LIMITED'}</p>
          <h1>{product.name}</h1>
          <div className="fb-pdp-meta">
            <span>
              {'★'.repeat(Math.round(product.avgRating || 0))}
              {product.reviewCount ? ` ${product.reviewCount}` : ' NEW'}
            </span>
            <span className={stock > 0 ? '' : 'out'}>{stock > 0 ? `${stock} LEFT` : 'SOLD OUT'}</span>
          </div>

          <div className="fb-pdp-price">
            <strong className={salePercent > 0 ? 'sale' : ''}>
              {displayPrice != null ? money(displayPrice) : ''}
            </strong>
            {displayOriginal != null && <s>{money(displayOriginal)}</s>}
            {salePercent > 0 && <span>{salePercent}% OFF</span>}
          </div>

          {product.description && <p className="fb-pdp-desc">{product.description}</p>}

          {!!product.tags?.length && (
            <div className="fb-pdp-tags">
              {product.tags.map((t) => (
                <Link key={t} href={`/shop?q=${encodeURIComponent(t)}`}>
                  #{t.toUpperCase()}
                </Link>
              ))}
            </div>
          )}

          <div className="fb-pdp-opts">
            <div className="fb-pdp-opts-head">
              <span>{attrKeys.length ? attrKeys.join(' / ').toUpperCase() : 'OPTION'}</span>
              <button type="button" onClick={() => setSizeGuide(true)}>
                SIZE GUIDE
              </button>
            </div>
            <div className="fb-pdp-swatches">
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

          <div className="fb-pdp-qty">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>
              −
            </button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(Math.max(1, stock), q + 1))}>
              +
            </button>
          </div>

          <div className="fb-pdp-actions">
            <button type="button" className="primary" disabled={stock < 1} onClick={addToCart}>
              {stock < 1 ? 'SOLD OUT' : addedPulse ? 'ADDED ✓' : 'ADD TO BAG'}
            </button>
            <button type="button" onClick={addWishlist}>
              WISHLIST
            </button>
            <button type="button" onClick={() => (window.location.href = '/compare')}>
              COMPARE
            </button>
          </div>

          {stock < 1 && (
            <div className="fb-notify">
              <strong>BACK IN STOCK ALERT</strong>
              <div>
                <input
                  type="email"
                  placeholder="EMAIL"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                />
                <button type="button" onClick={notifyStock}>
                  NOTIFY
                </button>
              </div>
            </div>
          )}
          {message && <p className="success">{message}</p>}

          <div className="fb-pdp-promises">
            <div>
              <strong>FREE SHIP</strong>
              <span>Over $50</span>
            </div>
            <div>
              <strong>RETURNS</strong>
              <span>30 days</span>
            </div>
            <div>
              <strong>SECURE</strong>
              <span>Encrypted</span>
            </div>
            <div>
              <strong>PHOTOS</strong>
              <span>{images.length} shots</span>
            </div>
          </div>

          <details className="fb-acc" open>
            <summary>DETAILS</summary>
            {!!Object.keys(selected?.attributeValues || {}).length ? (
              <ul>
                {Object.entries(selected!.attributeValues).map(([k, v]) => (
                  <li key={k}>
                    <span>{k}</span>
                    <em>{v}</em>
                  </li>
                ))}
                <li>
                  <span>SKU</span>
                  <em>{selected?.sku}</em>
                </li>
              </ul>
            ) : (
              <p>{product.description || 'Clean construction. Loud silhouette.'}</p>
            )}
          </details>
          <details className="fb-acc">
            <summary>SHIPPING</summary>
            <p>1–2 day dispatch. Free tracked shipping over $50. 30-day returns, unused.</p>
          </details>
          <details className="fb-acc">
            <summary>CARE</summary>
            <p>Cold wash or dry clean when needed. Hang dry. Skip the dryer heat.</p>
          </details>
        </div>
      </div>

      <div className="fb-sticky-atc">
        <div>
          <strong>{product.name}</strong>
          <span>{displayPrice != null ? money(displayPrice) : ''}</span>
        </div>
        <button type="button" disabled={stock < 1} onClick={addToCart}>
          ADD TO BAG
        </button>
      </div>

      <section className="fb-wall fb-pdp-reviews">
        <div className="fb-wall-head">
          <h2>REVIEWS</h2>
        </div>
        <div className="fb-reviews-grid">
          <div className="fb-review-list">
            {product.reviews.map((r) => (
              <article key={r.id}>
                <header>
                  <strong>{r.authorName.toUpperCase()}</strong>
                  <span>{'★'.repeat(r.rating)}</span>
                </header>
                {r.title && <h3>{r.title}</h3>}
                <p>{r.body}</p>
              </article>
            ))}
            {!product.reviews.length && <p className="muted">NO REVIEWS YET.</p>}
          </div>
          <form className="fb-review-form" onSubmit={submitReview}>
            <h3>WRITE ONE</h3>
            <input name="authorName" placeholder="NAME" required />
            <div className="fb-rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className={rating >= n ? 'on' : ''} onClick={() => setRating(n)}>
                  {n}
                </button>
              ))}
            </div>
            <input name="title" placeholder="TITLE" />
            <textarea name="body" rows={4} placeholder="REVIEW" />
            <button type="submit">SUBMIT</button>
          </form>
        </div>
      </section>

      {!!product.related.length && (
        <section className="fb-wall">
          <div className="fb-wall-head">
            <h2>PAIR WITH</h2>
          </div>
          <div className="fb-wall-grid">
            {product.related.map((p) => (
              <FbProductTile key={p.id} tenant={tenant} product={p} />
            ))}
          </div>
        </section>
      )}

      {!!recent.length && (
        <section className="fb-wall">
          <div className="fb-wall-head">
            <h2>RECENT</h2>
          </div>
          <div className="fb-wall-grid fb-wall-grid-4">
            {recent.map((r) => (
              <Link key={r.id} href={`/product/${r.slug}`} className="fb-tile">
                <div className="fb-tile-media" style={r.image ? { backgroundImage: `url(${r.image})` } : undefined}>
                  <div className="fb-tile-copy">
                    <strong>{r.name}</strong>
                    <em>{r.priceCents != null ? money(r.priceCents) : ''}</em>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {sizeGuide && (
        <div className="fb-modal" onClick={() => setSizeGuide(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>SIZE GUIDE</h2>
              <button type="button" onClick={() => setSizeGuide(false)}>
                CLOSE
              </button>
            </header>
            <table>
              <thead>
                <tr>
                  <th>LABEL</th>
                  <th>US</th>
                  <th>EU</th>
                  <th>CHEST</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>XS</td>
                  <td>XS</td>
                  <td>34</td>
                  <td>32–34</td>
                </tr>
                <tr>
                  <td>S</td>
                  <td>S</td>
                  <td>36</td>
                  <td>34–36</td>
                </tr>
                <tr>
                  <td>M</td>
                  <td>M</td>
                  <td>38</td>
                  <td>36–38</td>
                </tr>
                <tr>
                  <td>L</td>
                  <td>L</td>
                  <td>40</td>
                  <td>38–40</td>
                </tr>
                <tr>
                  <td>XL</td>
                  <td>XL</td>
                  <td>42</td>
                  <td>40–42</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
