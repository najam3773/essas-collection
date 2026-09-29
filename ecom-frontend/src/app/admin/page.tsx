'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, money } from '@/lib/api';

type Dash = {
  products: number;
  orders: number;
  customers: number;
  lowStock: number;
  revenueCents: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalCents: number;
    createdAt?: string;
    customer?: { email?: string; fullName?: string | null } | null;
  }>;
};

export default function AdminHome() {
  const [dash, setDash] = useState<Dash | null>(null);
  const [boot, setBoot] = useState<{ user?: { fullName: string }; tenant?: { plan?: string; slug?: string }; entitlements?: string[] } | null>(null);
  const [paid, setPaid] = useState<Array<{ name: string; count: number }>>([]);

  useEffect(() => {
    const token = localStorage.getItem('staff_token')!;
    const raw = localStorage.getItem('staff_bootstrap');
    if (raw) setBoot(JSON.parse(raw));
    api<Dash>('/admin/dashboard', { token }).then(setDash);
    api<{ features: Array<{ name: string; count: number }> }>('/admin/paid-features/summary', { token })
      .then((r) => setPaid(r.features.slice(0, 6)))
      .catch(() => undefined);
  }, []);

  if (!dash) return <p className="muted">Loading dashboard…</p>;

  return (
    <>
      <div className="row admin-page-head" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <p className="eyebrow">Today</p>
          <h2 style={{ margin: 0, fontSize: '1.8rem' }}>
            Welcome{boot?.user?.fullName ? `, ${boot.user.fullName}` : ''}
          </h2>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            Essa&apos;s Collection · merchant ops
          </p>
        </div>
        <div className="row">
          <Link className="btn secondary sm" href="/">View store</Link>
          <Link className="btn gold sm" href="/admin/products">Add product</Link>
        </div>
      </div>

      <div className="stat-grid" style={{ marginTop: 18 }}>
        <div className="stat-card">
          <div className="label">Revenue</div>
          <div className="value">{money(dash.revenueCents)}</div>
          <div className="delta">All-time paid orders</div>
        </div>
        <div className="stat-card">
          <div className="label">Orders</div>
          <div className="value">{dash.orders}</div>
          <div className="delta">Ready for fulfillment</div>
        </div>
        <div className="stat-card">
          <div className="label">Products</div>
          <div className="value">{dash.products}</div>
          <div className="delta">{dash.customers} customers</div>
        </div>
        <div className={`stat-card ${dash.lowStock ? 'warn' : ''}`}>
          <div className="label">Low stock</div>
          <div className="value">{dash.lowStock}</div>
          <div className="delta">{dash.lowStock ? 'Needs restock' : 'Inventory healthy'}</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 18, alignItems: 'start' }}>
        <div className="panel">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2>Recent orders</h2>
            <Link href="/admin/orders" className="btn sm secondary">View all</Link>
          </div>
          <div className="admin-card-list">
            {dash.recentOrders.map((o) => (
              <article key={o.id} className="admin-entity-card">
                <div className="admin-entity-card-head">
                  <Link href={`/admin/orders/${o.id}`}><strong>{o.orderNumber}</strong></Link>
                  <span className="badge">{o.status}</span>
                </div>
                <div className="admin-entity-meta">
                  <span>{o.customer?.fullName || o.customer?.email || 'Guest'}</span>
                  <span className="muted">{o.customer?.email || '—'}</span>
                  <span>{money(o.totalCents)}</span>
                </div>
                <div className="admin-entity-actions">
                  <Link className="btn sm secondary" href={`/admin/orders/${o.id}`}>View</Link>
                </div>
              </article>
            ))}
            {!dash.recentOrders.length && <p className="muted">No orders yet</p>}
          </div>
          <table className="table admin-desktop-table">
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th></tr>
            </thead>
            <tbody>
              {dash.recentOrders.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/orders/${o.id}`}>{o.orderNumber}</Link></td>
                  <td>{o.customer?.fullName || o.customer?.email || 'Guest'}</td>
                  <td><span className="badge">{o.status}</span></td>
                  <td>{money(o.totalCents)}</td>
                </tr>
              ))}
              {!dash.recentOrders.length && (
                <tr><td colSpan={4} className="muted">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="stack">
          <div className="panel">
            <h2>Quick actions</h2>
            <div className="quick-grid">
              <Link href="/admin/products" className="quick-link"><strong>Catalog</strong><span>Create & edit products</span></Link>
              <Link href="/admin/marketing" className="quick-link"><strong>Marketing</strong><span>Campaigns & flows</span></Link>
              <Link href="/admin/paid-features" className="quick-link"><strong>Paid suite</strong><span>Gift cards, loyalty…</span></Link>
              <Link href="/admin/apps" className="quick-link"><strong>Apps</strong><span>Webhooks & integrations</span></Link>
              <Link href="/admin/abandoned" className="quick-link"><strong>Recovery</strong><span>Abandoned carts</span></Link>
              <Link href="/admin/analytics" className="quick-link"><strong>Analytics</strong><span>Sales insights</span></Link>
            </div>
          </div>
          <div className="panel">
            <h2>Active paid modules</h2>
            <div className="stack" style={{ gap: 10 }}>
              {paid.map((f) => (
                <div key={f.name} className="row" style={{ justifyContent: 'space-between' }}>
                  <span>{f.name}</span>
                  <span className="badge">{f.count}</span>
                </div>
              ))}
              {!paid.length && <p className="muted">Paid suite loading…</p>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
