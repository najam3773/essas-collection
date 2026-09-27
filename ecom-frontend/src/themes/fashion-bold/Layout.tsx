'use client';

import { FormEvent, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getCartSession } from '@/lib/api';
import { getCustomerToken } from '@/lib/store-auth';
import { CartDrawer } from '@/components/CartDrawer';
import type { ThemeLayoutProps } from '../types';

/** Fashion bold chrome — loud brand strip, uppercase rail, sticky bag. */
export default function FashionLayout({ tenant, context, children }: ThemeLayoutProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Array<{ name: string; slug: string }>>([]);
  const [cartCount, setCartCount] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [open, setOpen] = useState(false);
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
    setOpen(false);
    router.push(`/shop?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className={`theme-ui-fashion${open ? ' is-open' : ''}`}>
      <div className="fb-announce">Drop season · Members first · Free over $50</div>

      <header className="fb-header">
        <button type="button" className="fb-burger" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
          <span />
          <span />
          <span />
        </button>
        <Link href={'/'} className="fb-brand" onClick={() => setOpen(false)}>
          {brand}
          <span>NOW</span>
        </Link>
        <form className="fb-search" onSubmit={onSearch}>
          <input placeholder="SEARCH" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <div className="fb-actions">
          <Link href={loggedIn ? '/account' : '/login'}>SIGN IN</Link>
          <button type="button" onClick={() => setDrawer(true)}>
            BAG {cartCount || 0}
          </button>
        </div>
      </header>

      <nav className={`fb-rail ${open ? 'is-open' : ''}`}>
        <button type="button" className="drawer-close fb-drawer-close" aria-label="Close menu" onClick={() => setOpen(false)}>
          ×
        </button>
        <Link href={'/shop'} onClick={() => setOpen(false)}>
          SHOP ALL
        </Link>
        <Link href={`/shop?sort=newest`} onClick={() => setOpen(false)}>
          NEW IN
        </Link>
        {categories.map((c) => (
          <Link key={c.slug} href={`/collections/${c.slug}`} onClick={() => setOpen(false)}>
            {c.name.toUpperCase()}
          </Link>
        ))}
        <Link href={'/compare'} onClick={() => setOpen(false)}>
          COMPARE
        </Link>
      </nav>

      {open && <button type="button" className="fb-backdrop" aria-label="Close" onClick={() => setOpen(false)} />}

      <div className="fb-main">{children as ReactNode}</div>

      <footer className="fb-footer">
        <div className="fb-footer-grid">
          <div>
            <strong>{brand}</strong>
            <p>Loud pieces. Clean lines. Move fast.</p>
          </div>
          <div>
            <Link href={'/shop'}>Shop</Link>
            <Link href={`/pages/shipping`}>Shipping</Link>
            <Link href={'/account'}>Orders</Link>
          </div>
        </div>
        <div className="fb-footer-bar">© {new Date().getFullYear()} {brand}</div>
      </footer>

      <CartDrawer tenant={tenant} open={drawer} onClose={() => setDrawer(false)} />
    </div>
  );
}
