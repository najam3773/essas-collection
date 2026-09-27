'use client';

import { FormEvent, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, money, paramSlug } from '@/lib/api';
import type { ProductCardData } from '@/components/ProductCard';
import { FashionShowroom } from './showroom/FashionShowroom';
import { LookCard } from './LookCard';

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

function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`vx-reveal${on ? ' is-in' : ''} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** 3D scroll boutique, then animated home blocks below. */
export default function VirtualBoutiqueHome() {
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

  // Live branding.brandName — renames from Admin/Platform show immediately.
  const title = brand;
  const subtitle = asString(
    heroCms?.settings?.subtitle,
    'Walk the boutique. Products on display — scroll to move.',
  );
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

  const lookbookMain = asString(lookbookCms?.settings?.imageUrl) || imgOf(products[1]) || imgOf(products[0]);
  const lookbookSide = asString(lookbookCms?.settings?.sideImageUrl) || imgOf(products[2]) || imgOf(products[0]);
  const lookbookTitle = asString(lookbookCms?.settings?.title, 'Studio lookbook');
  const lookbookSideTitle = asString(lookbookCms?.settings?.sideTitle, 'Fabric notes');
  const newsletterTitle = asString(newsletterCms?.settings?.title, 'Join the drop list');

  const perks = [
    { t: 'Scroll boutique', s: 'Walk the floor in 3D', img: imgOf(products[0]) },
    { t: 'Free ship $60+', s: 'Tracked worldwide', img: imgOf(products[1]) || imgOf(products[0]) },
    { t: '30-day returns', s: 'Easy exchanges', img: imgOf(products[2]) || imgOf(products[0]) },
    { t: 'Drop alerts', s: 'Members first access', img: imgOf(products[3]) || imgOf(products[0]) },
  ];

  const catCards = categories.slice(0, 6).map((c, i) => {
    const cover =
      products.find((p) => p.category?.slug === c.slug)?.media?.[0]?.url ||
      products[i]?.media?.[0]?.url ||
      '';
    const count = products.filter((p) => p.category?.slug === c.slug).length;
    return { ...c, cover, count };
  });

  const outroBg = [imgOf(products[0]), imgOf(products[1]), imgOf(products[2]), imgOf(products[3])].filter(Boolean);

  const stories = [
    {
      t: 'Designed for light',
      s: 'Pieces shot and styled for the gallery aisle — color that holds under motion.',
    },
    {
      t: 'Limited runs',
      s: 'Small batches, sharp colorways, no endless restocks.',
    },
    {
      t: 'From floor to bag',
      s: 'Inspect a look in the walkthrough, then buy in one tap.',
    },
  ];

  async function subscribe(e: FormEvent) {
    e.preventDefault();
    await api('/storefront/newsletter', { body: { email } });
    setSubscribed(true);
  }

  return (
    <div className="vx-home">
      <FashionShowroom tenant={tenant} brand={brand} title={title} subtitle={subtitle} products={products} />

      <div className="vx-after">
        <Reveal className="vx-outro vx-outro-hero">
          <div className="vx-outro-mosaic" aria-hidden>
            {outroBg.map((src, i) => (
              <div key={i} className={`vx-outro-tile vx-outro-tile-${i + 1}`} style={{ backgroundImage: `url(${src})` }} />
            ))}
            <div className="vx-outro-veil" />
          </div>
          <div className="vx-outro-copy">
            <p className="vx-kicker">After the walk</p>
            <h2>Explore the rest of the edit</h2>
            <p>You finished the boutique path — keep scrolling for drops, categories, and the lookbook.</p>
            <div className="vx-outro-actions">
              <Link href={'/shop'} className="vx-btn">
                Open looks
              </Link>
              <Link href={`/shop?sort=newest`} className="vx-btn ghost">
                Newest first
              </Link>
            </div>
          </div>
        </Reveal>

        <div className="vx-perks">
          {perks.map((p, i) => (
            <Reveal key={p.t} className="vx-perk" delay={80 + i * 90}>
              <div
                className="vx-perk-media"
                style={p.img ? { backgroundImage: `url(${p.img})` } : undefined}
                aria-hidden
              />
              <div className="vx-perk-copy">
                <span className="vx-perk-index">0{i + 1}</span>
                <strong>{p.t}</strong>
                <em>{p.s}</em>
              </div>
            </Reveal>
          ))}
        </div>

        {catCards.length > 0 && (
          <Reveal className="vx-section">
            <div className="vx-section-head">
              <div>
                <p className="vx-kicker">Collections</p>
                <h2>Shop by cut</h2>
              </div>
              <Link href={'/shop'}>All</Link>
            </div>
            <div className="vx-cat-rail">
              {catCards.map((c, i) => (
                <Reveal key={c.slug} delay={i * 80}>
                  <Link
                    href={`/collections/${c.slug}`}
                    className="vx-cat-card"
                    style={c.cover ? { backgroundImage: `url(${c.cover})` } : undefined}
                  >
                    <span className="vx-cat-veil" aria-hidden />
                    <span className="vx-cat-meta">
                      <span>0{i + 1}</span>
                      {c.count > 0 && <span>{c.count} looks</span>}
                    </span>
                    <strong>{c.name}</strong>
                    <em>Enter →</em>
                  </Link>
                </Reveal>
              ))}
            </div>
          </Reveal>
        )}

        <Reveal className="vx-section">
          <div className="vx-section-head">
            <div>
              <p className="vx-kicker">Just dropped</p>
              <h2>New in the boutique</h2>
            </div>
            <Link href={`/shop?sort=newest`}>View all</Link>
          </div>
          <div className="vx-look-grid">
            {newest.map((p, i) => (
              <Reveal key={p.id} delay={i * 50}>
                <LookCard tenant={tenant} product={p} />
              </Reveal>
            ))}
          </div>
          {!newest.length && <p className="vx-empty">No pieces in this drop yet.</p>}
        </Reveal>

        {featured && (
          <Reveal className="vx-spotlight">
            <div
              className="vx-spotlight-media"
              style={imgOf(featured) ? { backgroundImage: `url(${imgOf(featured)})` } : undefined}
            />
            <div className="vx-spotlight-copy">
              <p className="vx-kicker">Hero piece</p>
              <h2>{featured.name}</h2>
              <p>
                {(featured.category?.name || 'Drop') +
                  ' · Featured from the floor — wear it loud, keep it clean.'}
              </p>
              {priceOf(featured) != null && <p className="vx-price">{money(priceOf(featured)!)}</p>}
              <div className="vx-outro-actions">
                <Link href={`/product/${featured.slug}`} className="vx-btn">
                  View piece
                </Link>
                <Link href={'/shop'} className="vx-btn ghost">
                  Browse
                </Link>
              </div>
            </div>
          </Reveal>
        )}

        {onSale.length > 0 && (
          <Reveal className="vx-section">
            <div className="vx-section-head">
              <div>
                <p className="vx-kicker">Marked down</p>
                <h2>On sale</h2>
              </div>
            </div>
            <div className="vx-look-grid">
              {onSale.map((p, i) => (
                <Reveal key={p.id} delay={i * 50}>
                  <LookCard tenant={tenant} product={p} />
                </Reveal>
              ))}
            </div>
          </Reveal>
        )}

        {categorySections.map((sec, si) => (
          <Reveal key={sec.slug} className="vx-section" delay={si * 40}>
            <div className="vx-section-head">
              <div>
                <p className="vx-kicker">Category</p>
                <h2>{sec.name}</h2>
              </div>
              <Link href={`/collections/${sec.slug}`}>Shop</Link>
            </div>
            <div className="vx-look-grid">
              {sec.items.map((p, i) => (
                <Reveal key={p.id} delay={i * 50}>
                  <LookCard tenant={tenant} product={p} />
                </Reveal>
              ))}
            </div>
          </Reveal>
        ))}

        <Reveal className="vx-lookbook">
          <div
            className="vx-look-panel main"
            style={lookbookMain ? { backgroundImage: `url(${lookbookMain})` } : undefined}
          >
            <p className="vx-kicker">Lookbook</p>
            <h2>{lookbookTitle}</h2>
            <Link href={'/shop'} className="vx-btn ghost">
              Enter
            </Link>
          </div>
          <div
            className="vx-look-panel side"
            style={lookbookSide ? { backgroundImage: `url(${lookbookSide})` } : undefined}
          >
            <h3>{lookbookSideTitle}</h3>
            <Link href={`/pages/about`} className="vx-btn ghost">
              Studio
            </Link>
          </div>
        </Reveal>

        <Reveal className="vx-section">
          <div className="vx-section-head">
            <div>
              <p className="vx-kicker">Studio notes</p>
              <h2>Why this boutique</h2>
            </div>
          </div>
          <div className="vx-story-grid">
            {stories.map((s, i) => (
              <Reveal key={s.t} className="vx-story" delay={i * 80}>
                <h3>{s.t}</h3>
                <p>{s.s}</p>
              </Reveal>
            ))}
          </div>
        </Reveal>

        <Reveal className="vx-news">
          <div>
            <p className="vx-kicker">Members</p>
            <h2>{newsletterTitle}</h2>
            <p>Drops, restocks, and early access — straight to your inbox.</p>
          </div>
          {subscribed ? (
            <p className="vx-price">You&apos;re on the list.</p>
          ) : (
            <form className="vx-news-form" onSubmit={subscribe}>
              <input
                type="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" className="vx-btn">
                Join
              </button>
            </form>
          )}
        </Reveal>
      </div>
    </div>
  );
}
