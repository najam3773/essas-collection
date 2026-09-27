'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { api, getCartSession } from '@/lib/api';
import { getCustomerToken } from '@/lib/store-auth';
import { CartDrawer } from '@/components/CartDrawer';
import type { ThemeLayoutProps } from '../types';

/** Minimal glass chrome over the virtual boutique. */
export default function VirtualBoutiqueLayout({ tenant, context, children }: ThemeLayoutProps) {
  const [categories, setCategories] = useState<Array<{ name: string; slug: string }>>([]);
  const [cartCount, setCartCount] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [open, setOpen] = useState(false);
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

  const links = (
    <>
      <Link href={'/'} onClick={() => setOpen(false)}>
        Boutique
      </Link>
      <Link href={'/shop'} onClick={() => setOpen(false)}>
        Looks
      </Link>
      {categories.slice(0, 4).map((c) => (
        <Link key={c.slug} href={`/collections/${c.slug}`} onClick={() => setOpen(false)}>
          {c.name}
        </Link>
      ))}
    </>
  );

  return (
    <div className={`theme-ui-vx${open ? ' is-open' : ''}`}>
      <header className="vx-top">
        <button
          type="button"
          className="vx-burger"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <Link href={'/'} className="vx-brand" onClick={() => setOpen(false)}>
          <em>3D</em>
          {brand}
        </Link>

        <nav className="vx-nav">{links}</nav>

        <div className="vx-actions">
          <Link href={loggedIn ? '/account' : '/login'} onClick={() => setOpen(false)}>
            {loggedIn ? 'Account' : 'Sign in'}
          </Link>
          <button type="button" className="vx-bag" onClick={() => setDrawer(true)}>
            Bag {cartCount || 0}
          </button>
        </div>
      </header>

      <div className="vx-backdrop" onClick={() => setOpen(false)} aria-hidden={!open} />
      <aside className="vx-drawer" aria-hidden={!open}>
        <button type="button" className="vx-btn ghost" onClick={() => setOpen(false)}>
          Close
        </button>
        {links}
      </aside>

      <div className="vx-main">{children as ReactNode}</div>

      <footer className="vx-foot">
        <div>
          <p className="vx-kicker">Virtual boutique</p>
          <strong style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem' }}>{brand}</strong>
          <p>Scroll the floor. Inspect products on display. Shop the edit.</p>
        </div>
        <div className="vx-foot-links">
          <Link href={'/shop'}>Looks</Link>
          <Link href={'/cart'}>Bag</Link>
          <Link href={`/pages/about`}>About</Link>
        </div>
        <div className="vx-foot-bar">© {new Date().getFullYear()} {brand}</div>
      </footer>

      <CartDrawer tenant={tenant} open={drawer} onClose={() => setDrawer(false)} />
    </div>
  );
}
