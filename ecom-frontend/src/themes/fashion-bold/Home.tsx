'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, money, paramSlug } from '@/lib/api';
import type { ProductCardData } from '@/components/ProductCard';
import { FbProductTile } from './ProductTile';

type CmsSection = { type: string; settings?: Record<string, unknown> };
type Context = {
  tenant?: { name: string; slug: string };
  branding: { brandName: string } | null;
  pages: Record<string, CmsSection[]>;
};

function imgOf(p?: ProductCardData | null) {
  return p?.media?.[0]?.url || '';
}

function asString(v: unknown, fallback = '') {
  return typeof v === 'string' && v.trim() ? v : fallback;
}

function priceOf(p?: ProductCardData | null) {
  if (!p) return null;
  return p.fromPriceCents ?? p.variants?.[0]?.salePriceCents ?? p.variants?.[0]?.priceCents ?? null;
}

/** Dense fashion home — hero stack, lookbook split, category walls, drops. */
export default function FashionHome() {
  const params = useParams<{ tenant: string }>();
  const tenant = paramSlug(params.tenant);
  const [ctx, setCtx] = useState<Context | null>(null);
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [categories, setCategories] = useState<Array<{ name: string; slug: string; description?: string | null }>>([]);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    Promise.all([
      api<Context>('/storefront/context', {  }),
      api<{ items: ProductCardData[] }>('/storefront/catalog?limit=48', {  }),
      api<Array<{ name: string; slug: string; description?: string | null }>>('/storefront/categories', {
        }),
    ])
      .then(([c, catalog, cats]) => {
        setCtx(c);
        setProducts(catalog.items);
        setCategories(cats);
      })
      .catch(console.error);
  }, [tenant]);

  const brand = ctx?.branding?.brandName || ctx?.tenant?.name || tenant;
  const home = ctx?.pages?.home || [];
  const heroCms = home.find((s) => String(s.type).includes('hero'));
  const lookbookCms = home.find((s) => String(s.type).includes('lookbook'));
  const newsletterCms = home.find((s) => String(s.type).includes('newsletter'));

  const subtitle = asString(heroCms?.settings?.subtitle, 'Loud pieces. Clean lines. Move fast.');
  const heroTitle = brand;
  const featured = products.find((p) => p.featured) || products[0];
  const newest = products.slice(0, 8);
  const onSale = products.filter((p) => p.onSale || (p.salePercent || 0) > 0).slice(0, 4);
  const categorySections = categories
    .map((cat) => ({
      ...cat,
      items: products.filter((p) => p.category?.slug === cat.slug).slice(0, 4),
    }))
    .filter((c) => c.items.length > 0)
    .slice(0, 3);

  const heroImg =
    asString(heroCms?.settings?.imageUrl || heroCms?.settings?.image) || imgOf(featured) || imgOf(products[0]);
  const lookbookMain =
    asString(lookbookCms?.settings?.imageUrl) || imgOf(products[1]) || imgOf(products[0]);
  const lookbookSide =
    asString(lookbookCms?.settings?.sideImageUrl) || imgOf(products[2]) || imgOf(products[0]);
  const lookbookTitle = asString(lookbookCms?.settings?.title, 'LOOKBOOK 01');
  const lookbookSideTitle = asString(lookbookCms?.settings?.sideTitle, 'BUILT TO MOVE');
  const newsletterTitle = asString(newsletterCms?.settings?.title, 'DROP ALERTS FIRST');

  const perks = [
    { t: 'FREE SHIP $50+', s: 'Tracked worldwide' },
    { t: '30-DAY RETURNS', s: 'No drama' },
    { t: 'SECURE PAY', s: 'Encrypted checkout' },
    { t: 'MEMBERS FIRST', s: 'Early access drops' },
  ];

  async function subscribe(e: FormEvent) {
    e.preventDefault();
    await api('/storefront/newsletter', { body: { email } });
    setSubscribed(true);
  }

  return (
    <div className="fb-home">
      <section className="fb-hero" style={heroImg ? { backgroundImage: `url(${heroImg})` } : undefined}>
        <div className="fb-hero-overlay">
          <p className="fb-kicker">NEW SEASON</p>
          <h1>{heroTitle}</h1>
          <p className="fb-sub">{subtitle}</p>
          <div className="fb-hero-cta">
            <Link href={`/shop?sort=newest`}>SHOP DROPS</Link>
            <Link href={'/shop'} className="ghost">
              ALL
            </Link>
          </div>
        </div>
      </section>

      <div className="fb-ticker" aria-hidden>
        <div className="fb-ticker-track">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            ['DROP ALERT', 'LIMITED', 'SOLD OUT RISK', 'MEMBERS FIRST', 'FREE OVER $50', 'EASY RETURNS'].map((t) => (
              <span key={`${k}-${t}`}>✦ {t}</span>
            )),
          )}
        </div>
      </div>

      <section className="fb-perks">
        {perks.map((p) => (
          <div key={p.t}>
            <strong>{p.t}</strong>
            <span>{p.s}</span>
          </div>
        ))}
      </section>

      {categories.length > 0 && (
        <section className="fb-cats">
          {categories.slice(0, 6).map((c) => (
            <Link key={c.slug} href={`/collections/${c.slug}`}>
              {c.name}
            </Link>
          ))}
        </section>
      )}

      {newest.length > 0 && (
        <section className="fb-wall">
          <div className="fb-wall-head">
            <h2>JUST DROPPED</h2>
            <Link href={`/shop?sort=newest`}>SEE ALL</Link>
          </div>
          <div className="fb-wall-grid">
            {newest.map((p) => (
              <FbProductTile key={p.id} tenant={tenant} product={p} />
            ))}
          </div>
        </section>
      )}

      {featured && (
        <section className="fb-spotlight fb-spotlight-split">
          <div
            className="fb-spotlight-media"
            style={imgOf(featured) ? { backgroundImage: `url(${imgOf(featured)})` } : undefined}
          />
          <div className="fb-spotlight-copy">
            <p className="fb-kicker">SPOTLIGHT</p>
            <h2>{featured.name}</h2>
            <p>
              {featured.category?.name ? `${featured.category.name.toUpperCase()} · ` : ''}
              Standout from {brand}. Wear it loud.
            </p>
            {priceOf(featured) != null && <div className="fb-price">{money(priceOf(featured)!)}</div>}
            <Link href={`/product/${featured.slug}`}>VIEW PIECE</Link>
          </div>
        </section>
      )}

      {onSale.length > 0 && (
        <section className="fb-wall fb-sale-wall">
          <div className="fb-wall-head">
            <h2>ON SALE</h2>
            <Link href={'/shop'}>GRAB IT</Link>
          </div>
          <div className="fb-wall-grid fb-wall-grid-4">
            {onSale.map((p) => (
              <FbProductTile key={p.id} tenant={tenant} product={p} />
            ))}
          </div>
        </section>
      )}

      {categorySections.map((cat) => (
        <section key={cat.slug} className="fb-wall">
          <div className="fb-wall-head">
            <h2>{cat.name.toUpperCase()}</h2>
            <Link href={`/collections/${cat.slug}`}>SHOP</Link>
          </div>
          <div className="fb-wall-grid fb-wall-grid-4">
            {cat.items.map((p) => (
              <FbProductTile key={p.id} tenant={tenant} product={p} />
            ))}
          </div>
        </section>
      ))}

      {(lookbookMain || lookbookSide) && (
        <section className="fb-lookbook">
          <div
            className="fb-look-main"
            style={lookbookMain ? { backgroundImage: `url(${lookbookMain})` } : undefined}
          >
            <p className="fb-kicker">LOOKBOOK</p>
            <h2>{lookbookTitle}</h2>
            <Link href={'/shop'}>ENTER</Link>
          </div>
          <div
            className="fb-look-side"
            style={lookbookSide ? { backgroundImage: `url(${lookbookSide})` } : undefined}
          >
            <p className="fb-kicker">STORY</p>
            <h3>{lookbookSideTitle}</h3>
            <Link href={`/pages/about`}>READ</Link>
          </div>
        </section>
      )}

      <section className="fb-manifesto">
        <h2>NO HALF MEASURES</h2>
        <p>
          {brand} cuts loud silhouettes with clean construction. Limited drops. Fast turns. If it sells out —
          it sold out.
        </p>
        <div className="fb-manifesto-links">
          <Link href={'/shop'}>SHOP ALL</Link>
          <Link href={`/pages/shipping`}>SHIPPING</Link>
          <Link href={'/compare'}>COMPARE</Link>
        </div>
      </section>

      <form className="fb-news" onSubmit={subscribe}>
        <h2>{newsletterTitle}</h2>
        <p>Join {brand} — drops, restocks, member-only offers.</p>
        {subscribed ? (
          <p className="success">You’re in.</p>
        ) : (
          <div>
            <input type="email" required placeholder="EMAIL" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="submit">JOIN</button>
          </div>
        )}
      </form>
    </div>
  );
}
