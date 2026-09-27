'use client';

import { FormEvent, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getCartSession, money } from '@/lib/api';
import { getCustomerToken } from '@/lib/store-auth';
import { CartDrawer } from '@/components/CartDrawer';
import type { ThemeLayoutProps } from '../types';

type Suggest = {
  products: Array<{ id: string; name: string; slug: string; variants: Array<{ priceCents: number }> }>;
  categories: Array<{ name: string; slug: string }>;
};

/** Default boutique chrome — classic header, mega menu, premium footer. */
export default function DefaultLayout({ tenant, context, children }: ThemeLayoutProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<{ announcementEnabled: boolean; announcementText?: string | null } | null>(null);
  const [categories, setCategories] = useState<Array<{ name: string; slug: string }>>([]);
  const [cartCount, setCartCount] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [mega, setMega] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState('');
  const [suggest, setSuggest] = useState<Suggest | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [megaPromoImg, setMegaPromoImg] = useState('');

  const brand = context?.branding?.brandName || context?.tenant.name || tenant;

  useEffect(() => {
    if (!tenant) return;
    setLoggedIn(!!getCustomerToken(tenant));
    if (context?.branding?.logoUrl) setMegaPromoImg(context.branding.logoUrl);
    api<{ announcementEnabled: boolean; announcementText?: string | null }>('/storefront/settings', {  })
      .then(setSettings)
      .catch(() => undefined);
    api<typeof categories>('/storefront/categories', {  }).then(setCategories).catch(() => undefined);
    api<{ items: unknown[] }>('/storefront/cart', { cartSession: getCartSession() })
      .then((c) => setCartCount(c.items?.length || 0))
      .catch(() => undefined);
    api<{ items: Array<{ media?: Array<{ url: string }> }> }>('/storefront/catalog?limit=1', {  })
      .then((c) => {
        const url = c.items?.[0]?.media?.[0]?.url;
        if (url) setMegaPromoImg((prev) => prev || url);
      })
      .catch(() => undefined);
  }, [tenant, context?.branding?.logoUrl]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setSuggest(null);
      return;
    }
    const t = setTimeout(() => {
      api<Suggest>(`/storefront/search/suggest?q=${encodeURIComponent(q)}`, {  })
        .then(setSuggest)
        .catch(() => setSuggest(null));
    }, 180);
    return () => clearTimeout(t);
  }, [q, tenant]);

  function closeMenus() {
    setMega(false);
    setMobileOpen(false);
    setSuggest(null);
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    closeMenus();
    router.push(`/shop?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className={`theme-ui-default${mobileOpen ? ' nav-open' : ''}`}>
      {settings?.announcementEnabled && settings.announcementText && (
        <div className="announce">{settings.announcementText}</div>
      )}

      <div className={`store-chrome ${scrolled || mega ? 'is-solid' : ''}`}>
        <header className={`store-header ${scrolled ? 'scrolled' : ''}`}>
          <button
            type="button"
            className="mobile-menu-btn"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => {
              setMega(false);
              setMobileOpen((v) => !v);
            }}
          >
            <span />
            <span />
            <span />
          </button>

          <Link href={'/'} className="store-brand" onClick={closeMenus}>
            {brand}
          </Link>

          <div className="search-wrap desktop-search">
            <form className="search-bar" onSubmit={onSearch}>
              <input
                placeholder="Search products…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setMega(false)}
                onBlur={() => setTimeout(() => setSuggest(null), 160)}
              />
              <button className="btn sm gold" type="submit">
                Search
              </button>
            </form>
            {suggest && (suggest.products.length > 0 || suggest.categories.length > 0) && (
              <div className="suggest-panel">
                {suggest.categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/collections/${c.slug}`}
                    className="suggest-row"
                    onClick={closeMenus}
                  >
                    <span>
                      <span className="badge">Collection</span> {c.name}
                    </span>
                  </Link>
                ))}
                {suggest.products.map((p) => (
                  <Link
                    key={p.id}
                    href={`/product/${p.slug}`}
                    className="suggest-row"
                    onClick={closeMenus}
                  >
                    <span>{p.name}</span>
                    <span className="muted">{p.variants[0] ? money(p.variants[0].priceCents) : ''}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="header-actions">
            <Link
              className="header-action"
              href={loggedIn ? '/account' : '/login'}
              onClick={closeMenus}
            >
              {loggedIn ? 'Account' : 'Sign in'}
            </Link>
            {context?.entitlements?.includes('storefront.wishlist') && (
              <Link className="header-action desktop-only-action" href={'/wishlist'} onClick={closeMenus}>
                Wishlist
              </Link>
            )}
            <button
              className="btn sm header-bag"
              type="button"
              onClick={() => {
                closeMenus();
                setDrawer(true);
              }}
            >
              Bag{cartCount ? ` (${cartCount})` : ''}
            </button>
          </div>
        </header>

        <nav className={`store-nav ${mobileOpen ? 'is-open' : ''}`} aria-label="Store">
          <button type="button" className="drawer-close" aria-label="Close menu" onClick={closeMenus}>
            ×
          </button>
          <div className="mobile-search">
            <form className="search-bar" onSubmit={onSearch}>
              <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
              <button className="btn sm gold" type="submit">
                Go
              </button>
            </form>
          </div>
          <button
            className="nav-link-btn desktop-collections"
            type="button"
            onClick={() => setMega((v) => !v)}
            aria-expanded={mega}
          >
            Collections
          </button>
          <div className="mobile-collections">
            <p className="nav-section-label">Collections</p>
            {categories.map((c) => (
              <Link key={c.slug} href={`/collections/${c.slug}`} onClick={closeMenus}>
                {c.name}
              </Link>
            ))}
          </div>
          <Link href={'/shop'} onClick={closeMenus}>
            Shop all
          </Link>
          <Link href={`/shop?sort=newest`} onClick={closeMenus} className="desktop-only-action">
            New in
          </Link>
          <Link href={'/compare'} onClick={closeMenus}>
            Compare
          </Link>
          <Link
            className="mobile-only-link"
            href={loggedIn ? '/account' : '/login'}
            onClick={closeMenus}
          >
            {loggedIn ? 'Account' : 'Sign in'}
          </Link>
        </nav>

        {mega && (
          <div className="mega" onMouseLeave={() => setMega(false)}>
            <div>
              <h4>Shop by collection</h4>
              {categories.map((c) => (
                <Link key={c.slug} href={`/collections/${c.slug}`} onClick={closeMenus}>
                  {c.name}
                </Link>
              ))}
              <Link href={'/shop'} onClick={closeMenus} style={{ marginTop: 10, color: 'var(--muted)' }}>
                View all products →
              </Link>
            </div>
            <div>
              <h4>Services</h4>
              <Link href={`/pages/shipping`} onClick={closeMenus}>
                Shipping & returns
              </Link>
              <Link href={`/pages/about`} onClick={closeMenus}>
                Our story
              </Link>
              <Link href={'/account'} onClick={closeMenus}>
                Order tracking
              </Link>
              <Link href={'/wishlist'} onClick={closeMenus}>
                Wishlist
              </Link>
            </div>
            <Link
              href={'/shop'}
              className="mega-promo"
              style={
                megaPromoImg
                  ? { backgroundImage: `url(${megaPromoImg})` }
                  : {
                      background:
                        'linear-gradient(135deg, color-mix(in srgb, var(--color-secondary) 70%, #0d1b2a), color-mix(in srgb, var(--color-primary) 55%, #0d1b2a))',
                    }
              }
              onClick={closeMenus}
            >
              <div className="badge" style={{ width: 'fit-content', marginBottom: 8 }}>
                New season
              </div>
              <strong style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem' }}>Curated edits</strong>
              <span style={{ opacity: 0.9 }}>Discover the latest arrivals</span>
            </Link>
          </div>
        )}
      </div>

      {mobileOpen && <button type="button" className="nav-backdrop" aria-label="Close menu" onClick={closeMenus} />}

      {children as ReactNode}

      <footer className="footer-premium">
        <div className="footer-grid">
          <div>
            <h3>{brand}</h3>
            <p style={{ color: 'var(--footer-muted)', maxWidth: 320, lineHeight: 1.6 }}>
              A premium white-label boutique experience — crafted product stories, considered service, and secure checkout.
            </p>
            <div className="row" style={{ marginTop: 16 }}>
              <span className="badge">Visa</span>
              <span className="badge">Mastercard</span>
              <span className="badge">PayPal</span>
              <span className="badge">Apple Pay</span>
            </div>
          </div>
          <div>
            <div className="col-title">Shop</div>
            {categories.map((c) => (
              <div key={c.slug} style={{ marginBottom: 8 }}>
                <Link href={`/collections/${c.slug}`}>{c.name}</Link>
              </div>
            ))}
          </div>
          <div>
            <div className="col-title">Help</div>
            <div style={{ marginBottom: 8 }}>
              <Link href={`/pages/shipping`}>Shipping</Link>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Link href={`/pages/about`}>About</Link>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Link href={'/account'}>Orders</Link>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Link href={'/compare'}>Compare</Link>
            </div>
          </div>
          <div>
            <div className="col-title">Promise</div>
            <div style={{ color: 'var(--footer-muted)', marginBottom: 8 }}>Complimentary shipping over $75</div>
            <div style={{ color: 'var(--footer-muted)', marginBottom: 8 }}>30-day easy returns</div>
            <div style={{ color: 'var(--footer-muted)', marginBottom: 8 }}>Secure encrypted checkout</div>
            <div style={{ color: 'var(--footer-muted)' }}>Tracked worldwide delivery</div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {brand}
          </span>
          <span>Crafted commerce · Privacy · Terms</span>
        </div>
      </footer>

      <CartDrawer tenant={tenant} open={drawer} onClose={() => setDrawer(false)} />
    </div>
  );
}
