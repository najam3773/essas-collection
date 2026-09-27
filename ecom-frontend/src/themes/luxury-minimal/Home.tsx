'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, money, paramSlug } from '@/lib/api';
import type { ProductCardData } from '@/components/ProductCard';
import { LuxProductTile } from './ProductTile';

type CmsSection = { type: string; settings?: Record<string, unknown> };
type Context = {
  tenant?: { name: string; slug: string };
  branding: { brandName: string; logoUrl?: string | null } | null;
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

/** Full editorial home — mosaic, lookbook, category edits, journal, newsletter. */
export default function LuxuryHome() {
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

  const subtitle = asString(
    heroCms?.settings?.subtitle,
    'Quiet luxury for everyday rituals. Considered materials, lasting finish.',
  );
  const heroTitle = brand;
  const featured = products.find((p) => p.featured) || products[0];
  const newest = products.slice(0, 6);
  const mosaic = categories.slice(0, 4);
  const categorySections = categories
    .map((cat) => ({
      ...cat,
      items: products.filter((p) => p.category?.slug === cat.slug).slice(0, 4),
    }))
    .filter((c) => c.items.length > 0)
    .slice(0, 3);

  const heroImg =
    asString(heroCms?.settings?.imageUrl || heroCms?.settings?.image) ||
    imgOf(featured) ||
    imgOf(products[0]);
  const lookbookMain =
    asString(lookbookCms?.settings?.imageUrl) || imgOf(products[1]) || imgOf(products[0]);
  const lookbookSide =
    asString(lookbookCms?.settings?.sideImageUrl) || imgOf(products[2]) || imgOf(products[0]);
  const lookbookTitle = asString(lookbookCms?.settings?.title, 'Designed to be lived in');
  const lookbookSideTitle = asString(lookbookCms?.settings?.sideTitle, 'Crafted for everyday wear');
  const newsletterTitle = asString(newsletterCms?.settings?.title, 'Private list · atelier notes');

  const journal = [
    {
      title: 'The metal that ages with you',
      body: 'Solid gold and sterling that soften with wear — pieces meant for decades, not seasons.',
      href: `/pages/about`,
    },
    {
      title: 'How we size rings',
      body: 'A calm guide to fit, comfort, and when to size up — from our atelier bench.',
      href: `/pages/shipping`,
    },
    {
      title: 'Care without the ritual theatre',
      body: 'Soft cloth, dry drawer, skip the chemicals. Beauty that asks little of you.',
      href: `/pages/about`,
    },
  ];

  async function subscribe(e: FormEvent) {
    e.preventDefault();
    await api('/storefront/newsletter', { body: { email } });
    setSubscribed(true);
  }

  const catImg = (slug: string, i: number) =>
    imgOf(products.find((p) => p.category?.slug === slug)) || imgOf(products[i]) || imgOf(products[0]);

  return (
    <div className="lux-home">
      <section className="lux-hero">
        <div className="lux-hero-copy">
          <p className="lux-eyebrow">Fine craft</p>
          <h1>{heroTitle}</h1>
          <p className="lux-lede">{subtitle}</p>
          <div className="lux-hero-actions">
            <Link href={'/shop'} className="lux-btn">
              Shop the collection
            </Link>
            <Link href={`/pages/about`} className="lux-link">
              Our atelier →
            </Link>
          </div>
          <ul className="lux-hero-perks">
            <li>Complimentary shipping over $75</li>
            <li>30-day easy returns</li>
            <li>Lifetime polish service</li>
          </ul>
        </div>
        <div className="lux-hero-media" style={heroImg ? { backgroundImage: `url(${heroImg})` } : undefined}>
          {featured && (
            <Link href={`/product/${featured.slug}`} className="lux-hero-card">
              <span className="lux-eyebrow">Editor’s pick</span>
              <strong>{featured.name}</strong>
              <span>{priceOf(featured) != null ? money(priceOf(featured)!) : ''}</span>
            </Link>
          )}
        </div>
      </section>

      <section className="lux-strip" aria-label="Promises">
        <div>
          <strong>Complimentary shipping</strong>
          <span>Orders over $75</span>
        </div>
        <div>
          <strong>Easy returns</strong>
          <span>30 days, no fuss</span>
        </div>
        <div>
          <strong>Secure checkout</strong>
          <span>Encrypted payment</span>
        </div>
        <div>
          <strong>Tracked delivery</strong>
          <span>Worldwide</span>
        </div>
      </section>

      {mosaic.length > 0 && (
        <section className="lux-section">
          <div className="lux-section-head">
            <div>
              <p className="lux-eyebrow">Collections</p>
              <h2>Shop by category</h2>
            </div>
            <Link href={'/shop'}>View all</Link>
          </div>
          <div className={`lux-mosaic lux-mosaic-${Math.min(mosaic.length, 4)}`}>
            {mosaic.map((c, i) => {
              const bg = catImg(c.slug, i);
              const count = products.filter((p) => p.category?.slug === c.slug).length;
              return (
                <Link
                  key={c.slug}
                  href={`/collections/${c.slug}`}
                  className="lux-mosaic-tile"
                  style={bg ? { backgroundImage: `url(${bg})` } : undefined}
                >
                  <span>{count ? `${count} pieces` : 'Explore'}</span>
                  <h3>{c.name}</h3>
                  <em>Enter →</em>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {newest.length > 0 && (
        <section className="lux-section">
          <div className="lux-section-head">
            <div>
              <p className="lux-eyebrow">Just in</p>
              <h2>New arrivals</h2>
            </div>
            <Link href={`/shop?sort=newest`}>Shop new</Link>
          </div>
          <div className="lux-product-row">
            {newest.map((p) => (
              <LuxProductTile key={p.id} tenant={tenant} product={p} />
            ))}
          </div>
        </section>
      )}

      {featured && (
        <section className="lux-feature-band">
          <div
            className="lux-feature-media"
            style={imgOf(featured) ? { backgroundImage: `url(${imgOf(featured)})` } : undefined}
          />
          <div className="lux-feature-copy">
            <p className="lux-eyebrow">Signature piece</p>
            <h2>{featured.name}</h2>
            <p>
              {featured.category?.name ? `${featured.category.name} · ` : ''}A standout from the {brand}{' '}
              collection — made to wear often, kept for longer.
            </p>
            {priceOf(featured) != null && <div className="lux-feature-price">{money(priceOf(featured)!)}</div>}
            <div className="lux-hero-actions">
              <Link href={`/product/${featured.slug}`} className="lux-btn">
                View piece
              </Link>
              <Link href={'/shop'} className="lux-link">
                Browse all
              </Link>
            </div>
          </div>
        </section>
      )}

      {categorySections.map((cat) => (
        <section key={cat.slug} className="lux-section">
          <div className="lux-section-head">
            <div>
              <p className="lux-eyebrow">Category</p>
              <h2>{cat.name}</h2>
              {cat.description ? <p className="lux-section-desc">{cat.description}</p> : null}
            </div>
            <Link href={`/collections/${cat.slug}`}>Shop {cat.name}</Link>
          </div>
          <div className="lux-product-row lux-product-row-4">
            {cat.items.map((p) => (
              <LuxProductTile key={p.id} tenant={tenant} product={p} />
            ))}
          </div>
        </section>
      ))}

      {(lookbookMain || lookbookSide) && (
        <section className="lux-lookbook">
          <div
            className="lux-lookbook-main"
            style={lookbookMain ? { backgroundImage: `url(${lookbookMain})` } : undefined}
          >
            <p className="lux-eyebrow">Lookbook</p>
            <h2>{lookbookTitle}</h2>
            <Link href={'/shop'} className="lux-btn lux-btn-ghost">
              Enter the lookbook
            </Link>
          </div>
          <div
            className="lux-lookbook-side"
            style={lookbookSide ? { backgroundImage: `url(${lookbookSide})` } : undefined}
          >
            <p className="lux-eyebrow">Our story</p>
            <h3>{lookbookSideTitle}</h3>
            <Link href={`/pages/about`} className="lux-link">
              Learn more →
            </Link>
          </div>
        </section>
      )}

      <section className="lux-section lux-journal">
        <div className="lux-section-head">
          <div>
            <p className="lux-eyebrow">Journal</p>
            <h2>From the atelier</h2>
          </div>
        </div>
        <div className="lux-journal-grid">
          {journal.map((j) => (
            <Link key={j.title} href={j.href} className="lux-journal-card">
              <h3>{j.title}</h3>
              <p>{j.body}</p>
              <span>Read</span>
            </Link>
          ))}
        </div>
      </section>

      <form className="lux-newsletter" onSubmit={subscribe}>
        <p className="lux-eyebrow">Members</p>
        <h2>{newsletterTitle}</h2>
        <p>Join {brand} for new work, styling notes, and private offers.</p>
        {subscribed ? (
          <p className="success">You’re on the list.</p>
        ) : (
          <div className="lux-newsletter-row">
            <input type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="submit">Join</button>
          </div>
        )}
      </form>
    </div>
  );
}
