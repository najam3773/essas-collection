'use client';

import { FormEvent, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getCartSession } from '@/lib/api';
import { getCustomerToken } from '@/lib/store-auth';
import { CartDrawer } from '@/components/CartDrawer';
import type { ThemeLayoutProps } from '../types';

/** Editorial luxury chrome — centered brand, text links, minimal footer. */
export default function LuxuryLayout({ tenant, context, children }: ThemeLayoutProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Array<{ name: string; slug: string }>>([]);
  const [cartCount, setCartCount] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const brand = context?.branding?.brandName || context?.tenant.name || tenant;

  useEffect(() => {
    if (!tenant) return;
    setLoggedIn(!!getCustomerToken(tenant));
    api<typeof categories>('/storefront/categories', {  }).then(setCategories).catch(() => undefined);
    api<{ items: unknown[] }>('/storefront/cart', { cartSession: getCartSession() })
      .then((c) => setCartCount(c.items?.length || 0))
      .catch(() => undefined);
  }, [tenant]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setMenuOpen(false);
    router.push(`/shop?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className={`theme-ui-luxury${menuOpen ? ' is-menu-open' : ''}`}>
      <header className="lux-topbar">
        <button
          type="button"
          className="lux-menu-btn"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
        <Link href={'/'} className="lux-brand" onClick={() => setMenuOpen(false)}>
          {brand}
        </Link>
        <div className="lux-actions">
          <Link href={loggedIn ? '/account' : '/login'}>Account</Link>
          <button type="button" className="lux-bag" onClick={() => setDrawer(true)}>
            Bag{cartCount ? ` · ${cartCount}` : ''}
          </button>
        </div>
      </header>

      <nav className={`lux-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Store">
        <button type="button" className="drawer-close lux-drawer-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
          ×
        </button>
        <form className="lux-search" onSubmit={onSearch}>
          <input placeholder="Search the collection" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <Link href={'/shop'} onClick={() => setMenuOpen(false)}>
          All products
        </Link>
        {categories.map((c) => (
          <Link key={c.slug} href={`/collections/${c.slug}`} onClick={() => setMenuOpen(false)}>
            {c.name}
          </Link>
        ))}
        <Link href={`/pages/about`} onClick={() => setMenuOpen(false)}>
          Atelier
        </Link>
        <Link href={`/pages/shipping`} onClick={() => setMenuOpen(false)}>
          Care & delivery
        </Link>
      </nav>

      {menuOpen && <button type="button" className="lux-backdrop" aria-label="Close" onClick={() => setMenuOpen(false)} />}

      <div className="lux-main">{children as ReactNode}</div>

      <footer className="lux-footer">
        <div className="lux-footer-brand">{brand}</div>
        <div className="lux-footer-links">
          <Link href={'/shop'}>Shop</Link>
          <Link href={`/pages/about`}>Story</Link>
          <Link href={`/pages/shipping`}>Shipping</Link>
          <Link href={'/account'}>Orders</Link>
        </div>
        <p className="lux-footer-note">Quiet luxury · considered materials · complimentary shipping over $75</p>
      </footer>

      <CartDrawer tenant={tenant} open={drawer} onClose={() => setDrawer(false)} />
    </div>
  );
}
