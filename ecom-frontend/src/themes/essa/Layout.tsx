'use client';

import { FormEvent, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getCartSession } from '@/lib/api';
import { getCustomerToken } from '@/lib/store-auth';
import { CartDrawer } from '@/components/CartDrawer';
import type { ThemeLayoutProps } from '../types';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/collections/new-arrivals', label: 'New Arrivals' },
  { href: '/collections/lawn', label: 'Lawn' },
  { href: '/collections/khaddar', label: 'Khaddar' },
  { href: '/collections/linen', label: 'Linen' },
  { href: '/collections/viscose', label: 'Viscose' },
  { href: '/collections/2-piece', label: '2 Piece' },
  { href: '/collections/3-piece', label: '3 Piece' },
  { href: '/collections/dupattas', label: 'Dupattas' },
];

export default function EssaLayout({ tenant, context, children }: ThemeLayoutProps) {
  const router = useRouter();
  const [cartCount, setCartCount] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const brand = context?.branding?.brandName || context?.tenant.name || "Essa's Collection";
  const wishlistOn = context?.entitlements?.includes('storefront.wishlist');

  useEffect(() => {
    setLoggedIn(!!getCustomerToken(tenant));
    api<{ items: unknown[] }>('/storefront/cart', { cartSession: getCartSession() })
      .then((c) => setCartCount(c.items?.length || 0))
      .catch(() => undefined);
  }, [tenant]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setSearchOpen(false);
    setMenuOpen(false);
    router.push(`/shop?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className={`theme-ui-essa${menuOpen ? ' is-menu-open' : ''}`}>
      <p className="essa-announce">Women’s unstitched clothing  ·  Lawn · Khaddar · Linen · Viscose</p>
      <header className="essa-header">
        <button
          type="button"
          className="essa-icon-btn essa-menu-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        <Link href="/" className="essa-logo" onClick={() => setMenuOpen(false)}>
          {brand}
        </Link>
        <nav className="essa-desktop-nav" aria-label="Store">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="essa-tools">
          <button type="button" className="essa-icon-btn" aria-label="Search" onClick={() => setSearchOpen((v) => !v)}>
            Search
          </button>
          <Link href={loggedIn ? '/account' : '/login'} aria-label="Account" className="essa-icon-btn">
            Account
          </Link>
          {wishlistOn ? (
            <Link href="/wishlist" aria-label="Wishlist" className="essa-icon-btn">
              ♡
            </Link>
          ) : null}
          <button type="button" className="essa-icon-btn essa-bag" aria-label="Cart" onClick={() => setDrawer(true)}>
            Bag{cartCount ? ` ${cartCount}` : ''}
          </button>
        </div>
      </header>

      {searchOpen && (
        <form className="essa-search-bar" onSubmit={onSearch}>
          <input
            autoFocus
            placeholder="Search lawn, 3 piece, linen, embroidered…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
      )}

      <nav className={`essa-drawer ${menuOpen ? 'is-open' : ''}`} aria-label="Mobile">
        <form onSubmit={onSearch}>
          <input placeholder="Search the collection" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
            {item.label}
          </Link>
        ))}
        <Link href="/shop" onClick={() => setMenuOpen(false)}>
          Shop all
        </Link>
        <Link href="/pages/fabric-guide" onClick={() => setMenuOpen(false)}>
          Fabric guide
        </Link>
      </nav>
      {menuOpen && <button type="button" className="essa-backdrop" aria-label="Close" onClick={() => setMenuOpen(false)} />}

      <div className="essa-main">{children as ReactNode}</div>

      <footer className="essa-footer">
        <div className="essa-footer-grid">
          <div>
            <strong className="essa-footer-brand">{brand}</strong>
            <p>Elegant unstitched fashion for every occasion.</p>
          </div>
          <div>
            <h4>Customer Care</h4>
            <Link href="/pages/contact">Contact Us</Link>
            <Link href="/pages/shipping">Shipping & Delivery</Link>
            <Link href="/pages/returns">Returns & Exchange</Link>
            <Link href="/pages/fabric-guide">Size / Fabric Guide</Link>
            <Link href="/pages/faqs">FAQs</Link>
          </div>
          <div>
            <h4>Shop</h4>
            <Link href="/collections/new-arrivals">New Arrivals</Link>
            <Link href="/collections/lawn">Lawn</Link>
            <Link href="/collections/khaddar">Khaddar</Link>
            <Link href="/collections/linen">Linen</Link>
            <Link href="/collections/viscose">Viscose</Link>
            <Link href="/collections/3-piece">3 Piece</Link>
            <Link href="/collections/dupattas">Dupattas</Link>
          </div>
          <div>
            <h4>The house</h4>
            <Link href="/pages/about">Our story</Link>
            <Link href="/account">Orders</Link>
            <p className="essa-footer-note">Lawn · Khaddar · Linen · Viscose · 2 Piece · 3 Piece · Dupattas</p>
          </div>
        </div>
      </footer>

      <CartDrawer tenant={tenant} open={drawer} onClose={() => setDrawer(false)} />
    </div>
  );
}
