'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api, setStoreCurrency } from '@/lib/api';

type Boot = {
  tenant: { name: string; slug: string; plan?: string; customDomain?: string | null };
  user?: { fullName?: string; email?: string };
  entitlements: string[];
  permissions: string[];
};

type NavItem = { href: string; label: string; show?: boolean };
type NavGroup = { title: string; items: NavItem[] };

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [boot, setBoot] = useState<Boot | null>(null);
  const [q, setQ] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const openBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('staff_token');
    const raw = localStorage.getItem('staff_bootstrap');
    if (!token || !raw) {
      router.replace('/admin/login');
      return;
    }
    setBoot(JSON.parse(raw));
    api<{ currency?: string }>('/admin/settings', { token })
      .then((s) => setStoreCurrency(s.currency || 'USD'))
      .catch(() => undefined);
  }, [router]);

  useEffect(() => {
    setMobileNav(false);
  }, [path]);

  useEffect(() => {
    if (!mobileNav) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMobileNav(false);
        return;
      }
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      openBtnRef.current?.focus();
    };
  }, [mobileNav]);

  const groups: NavGroup[] = useMemo(() => {
    if (!boot) return [];
    const has = (_f: string) => true;
    return [
      {
        title: 'Home',
        items: [
          { href: '/admin', label: 'Home' },
          { href: '/admin/analytics', label: 'Analytics' },
        ],
      },
      {
        title: 'Orders',
        items: [
          { href: '/admin/orders', label: 'Orders', show: has('orders.management') },
          { href: '/admin/abandoned', label: 'Abandoned checkouts' },
        ],
      },
      {
        title: 'Products',
        items: [
          { href: '/admin/products', label: 'Products', show: has('catalog.products') },
          { href: '/admin/categories', label: 'Categories', show: has('catalog.categories') },
          { href: '/admin/inventory', label: 'Inventory', show: has('inventory.tracking') },
          { href: '/admin/reviews', label: 'Reviews' },
        ],
      },
      {
        title: 'Customers',
        items: [
          { href: '/admin/customers', label: 'Customers', show: has('customers.crm') },
          { href: '/admin/staff', label: 'Staff & roles' },
        ],
      },
      {
        title: 'Marketing',
        items: [
          { href: '/admin/marketing', label: 'Campaigns' },
          { href: '/admin/coupons', label: 'Coupons', show: has('marketing.coupons') },
          { href: '/admin/sales', label: 'Product sales' },
          { href: '/admin/paid-features', label: 'Apps & paid suite' },
        ],
      },
      {
        title: 'Content',
        items: [
          { href: '/admin/cms', label: 'Online store / CMS', show: has('content.cms') },
          { href: '/admin/branding', label: 'Theme & branding' },
        ],
      },
      {
        title: 'Settings',
        items: [
          { href: '/admin/settings', label: 'General' },
          { href: '/admin/shipping', label: 'Shipping & tax' },
          { href: '/admin/apps', label: 'Apps & integrations' },
          { href: '/admin/reports', label: 'Reports', show: has('reports.basic') },
        ],
      },
    ];
  }, [boot]);

  if (!boot) {
    return (
      <div className="ops-loading">
        <div className="ops-spinner" />
        <p>Loading admin…</p>
      </div>
    );
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/admin/products?q=${encodeURIComponent(q.trim())}`);
  }

  const activeLabel = groups.flatMap((g) => g.items).find((i) => i.href === path)?.label || 'Admin';

  return (
    <div className={`ops-shell ${collapsed ? 'is-collapsed' : ''} ${mobileNav ? 'mobile-nav-open' : ''}`}>
      {mobileNav && (
        <button
          type="button"
          className="ops-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside
        ref={drawerRef}
        id="admin-nav-drawer"
        className="ops-side"
      >
        <div className="ops-brand">
          <div>
            <strong>{boot.tenant.name}</strong>
            <span>Store admin</span>
          </div>
          <button type="button" className="ops-icon-btn desktop-only" onClick={() => setCollapsed((v) => !v)} aria-label="Toggle menu">
            ☰
          </button>
          <button
            ref={closeBtnRef}
            type="button"
            className="ops-icon-btn mobile-only"
            onClick={() => setMobileNav(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="ops-nav" aria-label="Admin">
          {groups.map((group) => {
            const items = group.items.filter((i) => i.show !== false);
            if (!items.length) return null;
            return (
              <div key={group.title} className="ops-nav-group">
                <div className="ops-nav-title">{group.title}</div>
                {items.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileNav(false)}
                    className={path === l.href || (l.href !== '/admin' && path.startsWith(l.href)) ? 'active' : ''}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="ops-side-foot">
          <Link href="/" className="ops-store-link">
            View storefront →
          </Link>
          <button
            className="btn secondary sm"
            type="button"
            onClick={() => {
              localStorage.removeItem('staff_token');
              localStorage.removeItem('staff_bootstrap');
              router.push('/admin/login');
            }}
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="ops-main">
        <header className="ops-top">
          <button
            ref={openBtnRef}
            type="button"
            className="ops-icon-btn mobile-only ops-open-nav"
            onClick={() => setMobileNav(true)}
            aria-label="Open menu"
            aria-expanded={mobileNav}
            aria-controls="admin-nav-drawer"
          >
            ☰
          </button>
          <div className="ops-title-block">
            <p className="eyebrow" style={{ margin: 0 }}>Merchant admin</p>
            <h1 className="ops-page-title">{activeLabel}</h1>
          </div>
          <form className="ops-search" onSubmit={onSearch}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products, orders, customers…"
              aria-label="Search admin"
            />
            <button className="btn sm gold" type="submit">Search</button>
          </form>
          <div className="ops-top-actions">
            <Link href="/admin/products" className="btn sm">Add product</Link>
            <Link href="/admin/orders" className="btn sm secondary">Orders</Link>
            <div className="ops-avatar" title={boot.user?.email || 'Admin'}>
              {(boot.user?.fullName || boot.tenant.name || 'A').slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>
        <div className="ops-content">{children}</div>
      </div>
    </div>
  );
}
