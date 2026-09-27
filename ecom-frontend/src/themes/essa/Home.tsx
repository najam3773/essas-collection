'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { ProductCardData } from '@/components/ProductCard';
import { FABRIC_CARD_IMAGES, FABRIC_FILTERS, HERO_IMAGES, PIECE_CARD_IMAGES, PIECE_FILTERS } from '@/lib/unstitched';
import { EssaProductTile } from './ProductTile';

type CatalogProduct = ProductCardData & { tags?: string[]; featured?: boolean };
type CmsSection = { type: string; settings?: Record<string, unknown> };

const FABRIC_CARDS = FABRIC_FILTERS.filter((f) => ['lawn', 'khaddar', 'linen', 'viscose'].includes(f.slug));

export default function EssaHome() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<CatalogProduct[]>([]);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [heroTitle, setHeroTitle] = useState('Timeless Unstitched Elegance');
  const [heroSub, setHeroSub] = useState('Curated fabrics, graceful prints and effortless Pakistani style.');

  useEffect(() => {
    Promise.all([
      api<{ pages?: Record<string, CmsSection[]> }>('/storefront/context'),
      api<{ items: CatalogProduct[] }>('/storefront/catalog?limit=24&sort=newest'),
      api<CatalogProduct[]>('/storefront/featured').catch(() => [] as CatalogProduct[]),
    ])
      .then(([ctx, catalog, featuredItems]) => {
        const hero = ctx.pages?.home?.find((s) => String(s.type).includes('hero'));
        if (typeof hero?.settings?.title === 'string') setHeroTitle(hero.settings.title);
        if (typeof hero?.settings?.subtitle === 'string') setHeroSub(hero.settings.subtitle);
        setProducts(catalog.items);
        setFeaturedProducts((Array.isArray(featuredItems) ? featuredItems : []).filter((p) => p?.slug));
      })
      .catch(console.error);
  }, []);

  const newest = products.slice(0, 8);
  const featuredShow = (featuredProducts.length ? featuredProducts : products.filter((p) => p.featured || p.tags?.includes('featured'))).slice(0, 6);

  async function subscribe(e: FormEvent) {
    e.preventDefault();
    await api('/storefront/newsletter', { body: { email } });
    setSubscribed(true);
  }

  const fabricImage = (slug: string, i: number) =>
    products.find((p) => p.category?.slug === slug)?.media?.[0]?.url ||
    FABRIC_CARD_IMAGES[slug] ||
    products[i]?.media?.[0]?.url ||
    HERO_IMAGES.featured.src;

  const pieceImage = (slug: string) => {
    const tag = slug === 'dupatta' ? 'dupatta' : slug;
    return (
      products.find((p) => p.tags?.includes(tag) || p.tags?.includes(slug))?.media?.[0]?.url ||
      PIECE_CARD_IMAGES[slug] ||
      HERO_IMAGES.featured.src
    );
  };

  return (
    <div className="essa-home">
      <section className="essa-hero">
        <div className="essa-hero-copy">
          <p className="essa-eyebrow">Women’s Unstitched Elegance</p>
          <h1>{heroTitle}</h1>
          <p className="essa-lede">{heroSub}</p>
          <p className="essa-hero-fabrics">Lawn · Khaddar · Linen · Viscose</p>
          <div className="essa-hero-actions">
            <Link href="/collections/new-arrivals" className="essa-btn">
              Shop New Arrivals
            </Link>
            <Link href="/collections/3-piece" className="essa-btn-ghost">
              Explore 3 Piece
            </Link>
          </div>
        </div>
        <div className="essa-hero-stage" aria-hidden={false}>
          <figure className="essa-hero-featured">
            <img
              src={HERO_IMAGES.featured.src}
              alt={HERO_IMAGES.featured.alt}
              width={720}
              height={960}
              fetchPriority="high"
              decoding="async"
            />
          </figure>
          <figure className="essa-hero-support essa-hero-support-a">
            <img
              src={HERO_IMAGES.supportA.src}
              alt={HERO_IMAGES.supportA.alt}
              width={320}
              height={400}
              fetchPriority="high"
              decoding="async"
            />
          </figure>
          <figure className="essa-hero-support essa-hero-support-b">
            <img
              src={HERO_IMAGES.supportB.src}
              alt={HERO_IMAGES.supportB.alt}
              width={280}
              height={340}
              decoding="async"
            />
          </figure>
        </div>
      </section>

      <section className="essa-section">
        <div className="essa-section-head">
          <div>
            <p className="essa-eyebrow">Collections</p>
            <h2>Shop by Fabric</h2>
          </div>
          <Link href="/shop">View all</Link>
        </div>
        <div className="essa-fabric-grid">
          {FABRIC_CARDS.map((c, i) => {
            const bg = fabricImage(c.slug, i);
            return (
              <Link key={c.slug} href={`/collections/${c.slug}`} className="essa-fabric-card">
                <img src={bg} alt="" width={640} height={800} loading="lazy" decoding="async" />
                <div>
                  <h3>{c.name}</h3>
                  <p>{c.blurb}</p>
                  <span>Shop {c.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="essa-section essa-style">
        <div className="essa-section-head">
          <div>
            <p className="essa-eyebrow">Browse</p>
            <h2>Shop by Piece</h2>
          </div>
        </div>
        <div className="essa-style-grid">
          {PIECE_FILTERS.map((p) => {
            const href = p.slug === 'dupatta' ? '/collections/dupattas' : `/collections/${p.slug}`;
            const bg = pieceImage(p.slug);
            return (
              <Link key={p.slug} href={href} className="essa-style-card">
                <img src={bg} alt="" width={480} height={360} loading="lazy" decoding="async" />
                <div>
                  <em>{p.included.join(' · ')}</em>
                  <h3>{p.name}</h3>
                  <span>Shop {p.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {newest.length > 0 && (
        <section className="essa-section">
          <div className="essa-section-head">
            <div>
              <p className="essa-eyebrow">Just in</p>
              <h2>New Arrivals</h2>
            </div>
            <Link href="/collections/new-arrivals">Shop new</Link>
          </div>
          <div className="essa-product-grid">
            {newest.map((p) => (
              <EssaProductTile key={p.id} tenant="" product={p} />
            ))}
          </div>
        </section>
      )}

      {featuredShow.length > 0 && (
        <section className="essa-section">
          <div className="essa-section-head">
            <div>
              <p className="essa-eyebrow">Selected</p>
              <h2>Featured Collection</h2>
              <p className="essa-section-desc">Worn lookbooks and winter prints chosen for the homepage.</p>
            </div>
            <Link href="/shop">Shop the edit</Link>
          </div>
          <div className="essa-product-grid essa-product-grid-6">
            {featuredShow.map((p) => (
              <EssaProductTile key={p.id} tenant="" product={p} />
            ))}
          </div>
        </section>
      )}

      <form className="essa-newsletter" onSubmit={subscribe}>
        <p className="essa-eyebrow">The list</p>
        <h2>New prints, quietly announced.</h2>
        <p>Join Essa’s Collection for lawn drops, winter khaddar and private offers.</p>
        {subscribed ? (
          <p className="success">You’re on the list.</p>
        ) : (
          <div className="essa-newsletter-row">
            <input type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="submit">Join</button>
          </div>
        )}
      </form>
    </div>
  );
}
