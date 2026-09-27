'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, getCartSession, money } from '@/lib/api';
import { getCustomerToken } from '@/lib/store-auth';
import { ProductCard, type ProductCardData } from '@/components/ProductCard';
import { ProductGallery } from '@/components/ProductGallery';
import { getRecentlyViewed, pushRecentlyViewed } from '@/lib/recently-viewed';

type Detail = {
  id: string;
  name: string;
  description?: string;
  media: Array<{ url: string; alt?: string }>;
  tags?: string[];
  vendor?: string | null;
  avgRating: number;
  reviewCount: number;
  salePercent?: number;
  onSale?: boolean;
  fromPriceCents?: number;
  originalPriceCents?: number;
  category?: { name: string; slug?: string } | null;
  variants: Array<{
    id: string;
    sku: string;
    priceCents: number;
    compareAtCents?: number | null;
    salePriceCents?: number;
    saleOriginalCents?: number;
    salePercent?: number;
    attributeValues: Record<string, string>;
    inventory: Array<{ quantity: number }>;
  }>;
  reviews: Array<{ id: string; authorName: string; rating: number; title?: string; body?: string; createdAt: string }>;
  related: ProductCardData[];
};

function variantLabel(v: Detail['variants'][0]) {
  const attrs = Object.entries(v.attributeValues || {});
  if (!attrs.length) return v.sku;
  return attrs.map(([, val]) => val).join(' · ');
}

export default function ProductPage() {
  const { tenant, slug } = useParams<{ tenant: string; slug: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Detail | null>(null);
  const [variantId, setVariantId] = useState('');
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [sizeGuide, setSizeGuide] = useState(false);
  const [recent, setRecent] = useState<ReturnType<typeof getRecentlyViewed>>([]);
  const [token, setToken] = useState<string | null>(null);
  const [addedPulse, setAddedPulse] = useState(false);

  useEffect(() => {
    setToken(getCustomerToken(tenant));
    api<Detail>(`/storefront/products/${slug}/detail`, {  }).then((p) => {
      setProduct(p);
      setVariantId(p.variants[0]?.id || '');
      pushRecentlyViewed(tenant, {
        id: p.id,
        slug,
        name: p.name,
        image: p.media?.[0]?.url,
        priceCents: p.variants[0]?.salePriceCents ?? p.variants[0]?.priceCents,
      });
      setRecent(getRecentlyViewed(tenant).filter((x) => x.slug !== slug));
    });
  }, [tenant, slug]);

  const selected = useMemo(
    () => product?.variants.find((v) => v.id === variantId),
    [product, variantId],
  );
  const displayPrice = selected?.salePriceCents ?? selected?.priceCents;
  const displayOriginal =
    selected?.saleOriginalCents && displayPrice != null && selected.saleOriginalCents > displayPrice
      ? selected.saleOriginalCents
      : selected?.compareAtCents && displayPrice != null && selected.compareAtCents > displayPrice
        ? selected.compareAtCents
        : null;
  const salePercent = selected?.salePercent || product?.salePercent || 0;
  const stock = selected?.inventory?.[0]?.quantity ?? 0;
  const images = (product?.media || []).filter((m) => m.url);
  const attrKeys = useMemo(() => {
    if (!product) return [] as string[];
    const keys = new Set<string>();
    product.variants.forEach((v) => Object.keys(v.attributeValues || {}).forEach((k) => keys.add(k)));
    return [...keys];
  }, [product]);

  if (!product) {
    return (
      <main className="shell" style={{ minHeight: '50vh', display: 'grid', placeItems: 'center' }}>
        <p className="muted">Loading piece…</p>
      </main>
    );
  }

  async function addToCart() {
    await api('/storefront/cart/items', {
      cartSession: getCartSession(),
      body: { variantId, quantity: qty },
    });
    setMessage('Added to bag');
    setAddedPulse(true);
    setTimeout(() => setAddedPulse(false), 1200);
  }

  async function addWishlist() {
    if (!token) return router.push('/login');
    await api(`/storefront/wishlist/${product!.id}`, { token, method: 'POST', body: {} });
    setMessage('Saved to wishlist');
  }

  async function submitReview(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api(`/storefront/products/${product!.id}/reviews`, {
      token,
      body: {
        authorName: fd.get('authorName'),
        rating,
        title: fd.get('title'),
        body: fd.get('body'),
      },
    });
    const refreshed = await api<Detail>(`/storefront/products/${slug}/detail`, {  });
    setProduct(refreshed);
    setMessage('Review submitted');
    e.currentTarget.reset();
  }

  async function notifyStock() {
    await api('/storefront/stock-notify', {
      body: { variantId, email: notifyEmail },
    });
    setMessage('We’ll notify you when it’s back in stock');
  }

  function share(network: 'copy' | 'x' | 'facebook') {
    if (!product) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (network === 'copy') {
      navigator.clipboard?.writeText(url);
      setMessage('Link copied');
      return;
    }
    const text = encodeURIComponent(product.name);
    const u = encodeURIComponent(url);
    const href =
      network === 'x'
        ? `https://twitter.com/intent/tweet?text=${text}&url=${u}`
        : `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    window.open(href, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="pdp-page">
      <nav className="pdp-crumb">
        <Link href={'/'}>Home</Link>
        <span style={{ margin: '0 8px', opacity: 0.35 }}>/</span>
        {product.category?.slug ? (
          <Link href={`/collections/${product.category.slug}`}>{product.category.name}</Link>
        ) : (
          <span>{product.category?.name}</span>
        )}
        <span style={{ margin: '0 8px', opacity: 0.35 }}>/</span>
        <span style={{ color: 'var(--ink)' }}>{product.name}</span>
      </nav>

      <div className="pdp-stage">
        <div className="pdp-gallery-wrap">
          <ProductGallery images={images.length ? images : [{ url: '' }]} alt={product.name} />
        </div>

        <div className="pdp-panel">
          <div>
            <p className="eyebrow" style={{ marginBottom: 10 }}>
              {product.vendor || product.category?.name || 'Collection'}
            </p>
            <h1 className="pdp-name">{product.name}</h1>
          </div>

          <div className="pdp-meta">
            <div className="stars">
              {'★★★★★'.slice(0, Math.round(product.avgRating))}
              {'☆☆☆☆☆'.slice(Math.round(product.avgRating))}
              <span className="muted">
                {' '}
                {product.reviewCount ? `${product.avgRating.toFixed(1)} · ${product.reviewCount} reviews` : 'New arrival'}
              </span>
            </div>
            {stock > 0 ? (
              <span className="badge">In stock · {stock} left</span>
            ) : (
              <span className="badge danger">Sold out</span>
            )}
          </div>

          <div className="pdp-price-row">
            <span className={`pdp-price ${salePercent > 0 ? 'sale-price' : ''}`}>
              {displayPrice != null ? money(displayPrice) : ''}
            </span>
            {displayOriginal != null && (
              <span className="compare">{money(displayOriginal)}</span>
            )}
            {salePercent > 0 && <span className="badge sale-badge">{salePercent}% off</span>}
          </div>

          {product.description && <p className="pdp-desc">{product.description}</p>}

          {!!product.tags?.length && (
            <div className="row">
              {product.tags.map((t) => (
                <Link key={t} href={`/shop?q=${encodeURIComponent(t)}`} className="badge">
                  #{t}
                </Link>
              ))}
            </div>
          )}

          <div>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <label className="label" style={{ margin: 0 }}>
                {attrKeys.length ? attrKeys.join(' / ') : 'Select option'}
              </label>
              <button type="button" className="btn sm secondary" onClick={() => setSizeGuide(true)}>
                Size guide
              </button>
            </div>
            <div className="swatch-grid">
              {product.variants.map((v) => {
                const vStock = v.inventory?.[0]?.quantity ?? 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={`swatch ${variantId === v.id ? 'active' : ''}`}
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

          <div className="row" style={{ alignItems: 'center', gap: 16 }}>
            <div>
              <label className="label">Quantity</label>
              <div className="qty-stepper">
                <button type="button" aria-label="Decrease" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  −
                </button>
                <span>{qty}</span>
                <button
                  type="button"
                  aria-label="Increase"
                  onClick={() => setQty((q) => Math.min(Math.max(1, stock), q + 1))}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="pdp-actions">
            <button className={`btn gold ${addedPulse ? 'reveal' : ''}`} disabled={stock < 1} onClick={addToCart}>
              {stock < 1 ? 'Sold out' : addedPulse ? 'Added ✓' : 'Add to bag'}
            </button>
            <button className="btn secondary" type="button" onClick={addWishlist}>
              Wishlist
            </button>
            <button className="btn secondary" type="button" onClick={() => router.push('/compare')}>
              Compare
            </button>
          </div>

          {stock < 1 && (
            <div className="card stack" style={{ padding: 18 }}>
              <strong>Notify me when available</strong>
              <div className="row">
                <input
                  className="input"
                  type="email"
                  placeholder="Email"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                />
                <button className="btn secondary" type="button" onClick={notifyStock}>
                  Notify
                </button>
              </div>
            </div>
          )}
          {message && <p className="success">{message}</p>}

          <div className="pdp-promises">
            <div>
              <strong>Complimentary shipping</strong>
              On orders over $75
            </div>
            <div>
              <strong>Easy returns</strong>
              30 days, no fuss
            </div>
            <div>
              <strong>Secure checkout</strong>
              Encrypted payment
            </div>
            <div>
              <strong>Studio gallery</strong>
              {images.length} photos · hover to zoom
            </div>
          </div>

          <div className="pdp-accordions">
            <details open>
              <summary>Details</summary>
              <div className="acc-body">
                {!!Object.keys(selected?.attributeValues || {}).length ? (
                  <table className="table">
                    <tbody>
                      {Object.entries(selected!.attributeValues).map(([k, v]) => (
                        <tr key={k}>
                          <td className="muted">{k}</td>
                          <td>{v}</td>
                        </tr>
                      ))}
                      <tr>
                        <td className="muted">SKU</td>
                        <td>{selected?.sku}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <p style={{ margin: 0 }}>{product.description || 'Crafted with considered materials and lasting finish.'}</p>
                )}
              </div>
            </details>
            <details>
              <summary>Shipping & returns</summary>
              <div className="acc-body">
                Orders ship within 1–2 business days. Complimentary tracked shipping over $75. Easy returns within 30 days
                of delivery — unused with original packaging.
              </div>
            </details>
            <details>
              <summary>Care</summary>
              <div className="acc-body">
                Store in a dry place. Avoid harsh chemicals and prolonged water exposure. Wipe gently with a soft cloth
                after wear.
              </div>
            </details>
          </div>

          <div className="pdp-share">
            <span className="muted" style={{ fontSize: '.88rem' }}>
              Share
            </span>
            <button className="btn sm secondary" type="button" onClick={() => share('copy')}>
              Copy link
            </button>
            <button className="btn sm secondary" type="button" onClick={() => share('x')}>
              X
            </button>
            <button className="btn sm secondary" type="button" onClick={() => share('facebook')}>
              Facebook
            </button>
          </div>
        </div>
      </div>

      <div className="sticky-atc row" style={{ justifyContent: 'space-between', paddingInline: 20 }}>
        <div>
          <strong style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem' }}>{product.name}</strong>
          <div>{displayPrice != null ? money(displayPrice) : ''}</div>
        </div>
        <button className="btn gold" disabled={stock < 1} onClick={addToCart}>
          Add to bag
        </button>
      </div>

      <div className="pdp-lower">
        <section>
          <div className="section-head" style={{ marginTop: 0 }}>
            <div>
              <p className="eyebrow">Community</p>
              <h2>Reviews</h2>
            </div>
          </div>
          <div className="grid-2" style={{ alignItems: 'start' }}>
            <div>
              {product.reviews.map((r) => (
                <div key={r.id} className="card review-card">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <strong style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem' }}>{r.authorName}</strong>
                    <span className="stars">
                      {'★'.repeat(r.rating)}
                      {'☆'.repeat(5 - r.rating)}
                    </span>
                  </div>
                  {r.title && <div style={{ marginTop: 6 }}>{r.title}</div>}
                  <p className="muted" style={{ margin: '8px 0 0', lineHeight: 1.6 }}>
                    {r.body}
                  </p>
                </div>
              ))}
              {!product.reviews.length && <p className="muted">No reviews yet — be the first to share.</p>}
            </div>
            <form className="review-form-luxe stack" onSubmit={submitReview}>
              <p className="eyebrow">Write</p>
              <h3 style={{ margin: 0, fontSize: '1.8rem' }}>Share your experience</h3>
              <div>
                <label className="label">Your name</label>
                <input className="input" name="authorName" required />
              </div>
              <div>
                <label className="label">Rating</label>
                <div className="rating-input">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" className={rating >= n ? 'on' : ''} onClick={() => setRating(n)}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Title</label>
                <input className="input" name="title" />
              </div>
              <div>
                <label className="label">Review</label>
                <textarea className="textarea" name="body" rows={4} />
              </div>
              <button className="btn gold">Submit review</button>
            </form>
          </div>
        </section>

        {!!product.related.length && (
          <section style={{ marginTop: 56 }}>
            <div className="section-head">
              <div>
                <p className="eyebrow">Pair with</p>
                <h2>You may also like</h2>
              </div>
            </div>
            <div className="product-rail">
              {product.related.map((p) => (
                <ProductCard key={p.id} tenant={tenant} product={p} />
              ))}
            </div>
          </section>
        )}

        {!!recent.length && (
          <section style={{ marginTop: 40 }}>
            <div className="section-head">
              <div>
                <p className="eyebrow">Continue</p>
                <h2>Recently viewed</h2>
              </div>
            </div>
            <div className="product-rail">
              {recent.map((r) => (
                <Link key={r.id} href={`/product/${r.slug}`} className="product-card">
                  <div className="product-media" style={r.image ? { backgroundImage: `url(${r.image})` } : undefined} />
                  <strong className="title">{r.name}</strong>
                  <span className="price">{r.priceCents != null ? money(r.priceCents) : ''}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {sizeGuide && (
        <div className="modal-backdrop" onClick={() => setSizeGuide(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0 }}>Size guide</h2>
              <button className="btn secondary sm" onClick={() => setSizeGuide(false)}>
                Close
              </button>
            </div>
            <table className="table" style={{ marginTop: 16 }}>
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
            <p className="muted">Tip: if between sizes, size up for rings and apparel.</p>
          </div>
        </div>
      )}
    </div>
  );
}
