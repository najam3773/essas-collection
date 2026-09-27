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
};

type Paid = { features: Array<{ name: string; count: number; key: string }> };

export default function AnalyticsPage() {
  const [dash, setDash] = useState<Dash | null>(null);
  const [paid, setPaid] = useState<Paid['features']>([]);

  useEffect(() => {
    const token = localStorage.getItem('staff_token')!;
    api<Dash>('/admin/dashboard', { token }).then(setDash);
    api<Paid>('/admin/paid-features/summary', { token }).then((r) => setPaid(r.features));
  }, []);

  if (!dash) return <p className="muted">Loading analytics…</p>;

  const aov = dash.orders ? dash.revenueCents / dash.orders : 0;

  return (
    <>
      <p className="muted">Shopify Analytics / WooCommerce reports — sales, conversion proxies, and module usage.</p>

      <div className="stat-grid" style={{ marginTop: 16 }}>
        <div className="stat-card"><div className="label">Gross sales</div><div className="value">{money(dash.revenueCents)}</div></div>
        <div className="stat-card"><div className="label">Orders</div><div className="value">{dash.orders}</div></div>
        <div className="stat-card"><div className="label">AOV</div><div className="value">{money(Math.round(aov))}</div></div>
        <div className="stat-card"><div className="label">Customers</div><div className="value">{dash.customers}</div></div>
      </div>

      <div className="grid-2" style={{ marginTop: 18, alignItems: 'start' }}>
        <div className="panel">
          <h2>Conversion levers</h2>
          <div className="stack">
            <div className="row" style={{ justifyContent: 'space-between' }}><span>Catalog size</span><strong>{dash.products}</strong></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span>Low-stock SKUs</span><strong>{dash.lowStock}</strong></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span>Repeat potential</span><strong>{Math.max(0, dash.customers - 1)}</strong></div>
          </div>
          <Link href="/admin/reports" className="btn secondary sm" style={{ marginTop: 16 }}>Open classic reports</Link>
        </div>
        <div className="panel">
          <h2>Feature adoption</h2>
          <table className="table">
            <thead><tr><th>Module</th><th>Usage</th></tr></thead>
            <tbody>
              {paid.map((f) => (
                <tr key={f.key}><td>{f.name}</td><td><span className="badge">{f.count}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
