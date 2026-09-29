'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, money } from '@/lib/api';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  createdAt: string;
  customer?: { email?: string; fullName?: string | null; phone?: string | null } | null;
  shippingAddress?: { fullName?: string; phone?: string } | null;
};

function customerLabel(o: Order) {
  return o.customer?.fullName || o.shippingAddress?.fullName || o.customer?.email || 'Guest';
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('staff_token');
    if (!token) return router.replace('/admin/login');
    api<Order[]>('/admin/orders', { token }).then(setOrders);
  }, [router]);

  async function setStatus(id: string, status: string) {
    const token = localStorage.getItem('staff_token')!;
    const updated = await api<Order>(`/admin/orders/${id}`, {
      token,
      method: 'PATCH',
      body: { status },
    });
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
  }

  return (
    <>
      <h1>Orders</h1>
      <div className="admin-card-list">
        {orders.map((o) => (
          <article key={o.id} className="admin-entity-card">
            <div className="admin-entity-card-head">
              <Link href={`/admin/orders/${o.id}`}><strong>{o.orderNumber}</strong></Link>
              <span className="badge">{o.status}</span>
            </div>
            <div className="admin-entity-meta">
              <span>{customerLabel(o)}</span>
              <span className="muted">{o.customer?.email || 'No email'}</span>
              {(o.customer?.phone || o.shippingAddress?.phone) && (
                <span className="muted">{o.customer?.phone || o.shippingAddress?.phone}</span>
              )}
              <span>{money(o.totalCents)}</span>
              <span className="muted">{new Date(o.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="admin-entity-actions">
              <Link className="btn sm secondary" href={`/admin/orders/${o.id}`}>View</Link>
              <button className="btn sm secondary" onClick={() => setStatus(o.id, 'fulfilled')}>Fulfill</button>
            </div>
          </article>
        ))}
        {!orders.length && <p className="muted">No orders yet</p>}
      </div>
      <div className="card table-scroll admin-desktop-table" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr><th>Order</th><th>Customer</th><th>Email</th><th>Phone</th><th>Date</th><th>Total</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`}><strong>{o.orderNumber}</strong></Link></td>
                <td>{customerLabel(o)}</td>
                <td>{o.customer?.email || 'Guest'}</td>
                <td>{o.customer?.phone || o.shippingAddress?.phone || '—'}</td>
                <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                <td>{money(o.totalCents)}</td>
                <td><span className="badge">{o.status}</span></td>
                <td className="row">
                  <Link className="btn sm secondary" href={`/admin/orders/${o.id}`}>View</Link>
                  <button className="btn sm secondary" onClick={() => setStatus(o.id, 'fulfilled')}>Fulfill</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
