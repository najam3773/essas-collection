'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, money, paramSlug } from '@/lib/api';
import { ProductCard, type ProductCardData } from '@/components/ProductCard';
import { HeroSlider, type HeroSlide } from '@/components/HeroSlider';

type CmsSection = {
  type: string;
  settings?: Record<string, unknown>;
};

type Context = {
  tenant?: { name: string; slug: string };
  branding: {
    brandName: string;
    logoUrl?: string | null;
    primaryColor?: string;
    theme?: { themeKey: string; name: string } | null;
  } | null;
  pages: Record<string, CmsSection[]>;
};

function productImage(p?: ProductCardData | null) {
  return p?.media?.[0]?.url || '';
}

function asString(v: unknown, fallback = '') {
  return typeof v === 'string' && v.trim() ? v : fallback;
}

export default function StoreHomePage() {
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
      .catch((err) => {
        console.error('Store home load failed:', err);
      });
  }, [tenant]);

  const brand = ctx?.branding?.brandName || ctx?.tenant?.name || tenant;
  const homeSections = ctx?.pages?.home || [];
  const heroCms = homeSections.find((s) => String(s.type).includes('hero'));
  const lookbookCms = homeSections.find((s) => String(s.type).includes('lookbook'));
  const newsletterCms = homeSections.find((s) => String(s.type).includes('newsletter'));

  const subtitle = asString(
    heroCms?.settings?.subtitle,
    'New arrivals and enduring favorites — shop the season’s edit.',
  );

  const featured = products.find((p) => p.featured) || products[0];
  const featuredImg = productImage(featured);
  const featuredPrice = featured?.fromPriceCents ?? featured?.variants?.[0]?.priceCents;
  const newest = products.slice(0, 8);
  const mosaic = categories.slice(0, 4);
  const categorySections = categories
    .map((cat) => ({
      ...cat,
      items: products.filter((p) => p.category?.slug === cat.slug).slice(0, 4),
    }))
    .filter((c) => c.items.length > 0)
    .slice(0, 3);

  async function subscribe(e: FormEvent) {
    e.preventDefault();
    await api('/storefront/newsletter', { body: { email } });
    setSubscribed(true);
  }

  const categoryImage = (slug: string, index: number) => {
    const fromCat = products.find((p) => p.category?.slug === slug);
    return productImage(fromCat) || productImage(products[index]) || productImage(products[0]) || '';
  };

  const categoryCount = (slug: string) => products.filter((p) => p.category?.slug === slug).length;

  const withStorePath = (href: string) => {
    if (!href) return '/shop';
    if (href.startsWith('/store/')) return href.replace(/^\/store\/[^/]+/, '') || '/';
    if (href.startsWith('/')) return href;
    return href;
  };

  const heroSlides: HeroSlide[] = useMemo(() => {
    const settings = heroCms?.settings || {};
    const cmsSlides = Array.isArray(settings.slides) ? settings.slides : null;

    if (cmsSlides?.length) {
      return cmsSlides.map((raw, i) => {
        const s = (raw || {}) as Record<string, unknown>;
        return {
          image: asString(s.imageUrl || s.image),
          title: asString(s.title || s.headline, brand),
          subtitle: asString(s.subtitle || s.subhead, subtitle),
          ctaLabel: asString(s.ctaLabel, i === 0 ? 'Shop new arrivals' : 'Shop now'),
          ctaHref: withStorePath(asString(s.ctaHref, '/shop')),
          ctaSecondaryLabel: asString(s.ctaSecondaryLabel, 'Best sellers'),
          ctaSecondaryHref: withStorePath(asString(s.ctaSecondaryHref, '/shop?sort=rating')),
        };
      });
    }

    const heroImage = asString(settings.imageUrl || settings.image);
    if (heroImage) {
      return [
        {
          image: heroImage,
          title: asString(settings.title || settings.headline, brand),
          subtitle: asString(settings.subtitle, subtitle),
          ctaLabel: asString(settings.ctaLabel, 'Shop new arrivals'),
          ctaHref: withStorePath(asString(settings.ctaHref, '/shop?sort=newest')),
          ctaSecondaryLabel: asString(settings.ctaSecondaryLabel, 'Best sellers'),
          ctaSecondaryHref: withStorePath(asString(settings.ctaSecondaryHref, '/shop?sort=rating')),
        },
      ];
    }

    const pool = products.filter((p) => productImage(p)).slice(0, 4);
    if (pool.length) {
      return pool.map((p, i) => ({
        image: productImage(p),
        title: brand,
        subtitle: i === 0 ? subtitle : p.name,
        ctaLabel: i === 0 ? 'Shop new arrivals' : `Shop ${p.category?.name || 'now'}`,
        ctaHref:
          i === 0
            ? `/shop?sort=newest`
            : p.category?.slug
              ? `/collections/${p.category.slug}`
              : `/product/${p.slug}`,
        ctaSecondaryLabel: 'Shop all',
        ctaSecondaryHref: '/shop',
      }));
    }

    return [
      {
        image: '',
        title: brand,
        subtitle,
        ctaLabel: 'Shop now',
        ctaHref: '/shop',
        ctaSecondaryLabel: 'Browse collections',
        ctaSecondaryHref: '/shop',
      },
    ];
  }, [brand, subtitle, tenant, heroCms, products]);

  const lookbookMainImg =
    asString(lookbookCms?.settings?.imageUrl) || productImage(products[1]) || productImage(products[0]);
  const lookbookSideImg =
    asString(lookbookCms?.settings?.sideImageUrl) || productImage(products[2]) || productImage(products[0]);
  const lookbookTitle = asString(lookbookCms?.settings?.title, 'Designed to be lived in');
  const lookbookSideTitle = asString(lookbookCms?.settings?.sideTitle, 'Crafted for everyday wear');
  const newsletterTitle = asString(newsletterCms?.settings?.title, 'Early access to drops & private sales');

  const perks = [
    { title: 'Free shipping', text: 'On orders over $50' },
    { title: 'Easy returns', text: '30-day hassle-free' },
    { title: 'Secure pay', text: 'Encrypted checkout' },
    { title: 'Tracked delivery', text: 'Worldwide shipping' },
  ];

  return (
    <div className="theme-home theme-home-default">
      <HeroSlider slides={heroSlides} brand={brand} heroStyle="full-bleed" />

      <section className="home-perks" aria-label="Store benefits">
        {perks.map((p) => (
          <div key={p.title} className="home-perk">
            <strong>{p.title}</strong>
            <span>{p.text}</span>
          </div>
        ))}
      </section>

      <div className="marquee" aria-hidden>
        <div className="marquee-track">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            [
              'Complimentary shipping over $50',
              'Thirty-day returns',
              'Secure encrypted checkout',
              'Tracked delivery',
              'Member early access',
              'Quality that lasts',
            ].map((t) => (
              <span key={`${k}-${t}`}>✦ {t}</span>
            )),
          )}
        </div>
      </div>

      <section className="shell home-shell">
        {mosaic.length > 0 && (
          <>
            <div className="section-head">
              <div>
                <p className="eyebrow">Collections</p>
                <h2>Shop by category</h2>
              </div>
              <Link href={'/shop'} className="btn secondary sm">
                View all
              </Link>
            </div>

            <div className={`home-mosaic home-mosaic-${Math.min(mosaic.length, 4)}`}>
              {mosaic.map((c, i) => {
                const img = categoryImage(c.slug, i);
                const count = categoryCount(c.slug);
                return (
                  <Link
                    key={c.slug}
                    href={`/collections/${c.slug}`}
                    className="collection-tile"
                    style={img ? { backgroundImage: `url(${img})` } : undefined}
                  >
                    <div className="collection-tile-copy">
                      <span className="collection-count">{count ? `${count} pieces` : 'Explore'}</span>
                      <h3>{c.name}</h3>
                      <span className="collection-cta">Shop now →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {newest.length > 0 && (
          <>
            <div className="section-head">
              <div>
                <p className="eyebrow">Just in</p>
                <h2>New arrivals</h2>
              </div>
              <Link href={`/shop?sort=newest`} className="btn secondary sm">
                Shop new
              </Link>
            </div>
            <div className="home-product-grid">
              {newest.map((p) => (
                <ProductCard key={p.id} tenant={tenant} product={p} />
              ))}
            </div>
          </>
        )}

        {featured && (
          <div className="home-feature">
            <div
              className="home-feature-media"
              style={featuredImg ? { backgroundImage: `url(${featuredImg})` } : undefined}
            />
            <div className="home-feature-copy">
              <p className="eyebrow">Editor’s pick</p>
              <h2>{featured.name}</h2>
              <p>
                {featured.category?.name ? `${featured.category.name} · ` : ''}A standout from the {brand}{' '}
                collection — crafted to wear often.
              </p>
              {featuredPrice != null && <div className="home-feature-price">{money(featuredPrice)}</div>}
              <div className="row">
                <Link href={`/product/${featured.slug}`} className="btn gold">
                  View product
                </Link>
                <Link href={'/shop'} className="btn secondary">
                  Browse all
                </Link>
              </div>
            </div>
          </div>
        )}

        {categorySections.map((cat) => (
          <div key={cat.slug} className="home-cat-block">
            <div className="section-head">
              <div>
                <p className="eyebrow">Category</p>
                <h2>{cat.name}</h2>
              </div>
              <Link href={`/collections/${cat.slug}`} className="btn secondary sm">
                Shop {cat.name}
              </Link>
            </div>
            <div className="home-product-grid home-product-grid-4">
              {cat.items.map((p) => (
                <ProductCard key={p.id} tenant={tenant} product={p} />
              ))}
            </div>
          </div>
        ))}

        {(lookbookMainImg || lookbookSideImg) && (
          <div className="lookbook">
            <div
              className="lookbook-main"
              style={lookbookMainImg ? { backgroundImage: `url(${lookbookMainImg})` } : undefined}
            >
              <p className="eyebrow lookbook-eyebrow">Lookbook</p>
              <h2 className="lookbook-title">{lookbookTitle}</h2>
              <Link href={'/shop'} className="btn ghost" style={{ width: 'fit-content', marginTop: 16 }}>
                Enter the lookbook
              </Link>
            </div>
            <div
              className="lookbook-side"
              style={lookbookSideImg ? { backgroundImage: `url(${lookbookSideImg})` } : undefined}
            >
              <p className="eyebrow lookbook-eyebrow">Our story</p>
              <h3 className="lookbook-side-title">{lookbookSideTitle}</h3>
              <Link
                href={`/pages/about`}
                className="btn ghost"
                style={{ width: 'fit-content', marginTop: 16 }}
              >
                Learn more
              </Link>
            </div>
          </div>
        )}

        <form className="newsletter-premium" onSubmit={subscribe}>
          <div>
            <p className="eyebrow newsletter-eyebrow">Private list</p>
            <h2>{newsletterTitle}</h2>
            <p className="newsletter-copy">
              Join {brand} for new arrivals, styling notes, and member-only offers.
            </p>
          </div>
          {subscribed ? (
            <p className="success newsletter-success">You’re on the list.</p>
          ) : (
            <div className="newsletter-form-row">
              <input
                className="input newsletter-input"
                type="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="btn gold" type="submit">
                Join
              </button>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
