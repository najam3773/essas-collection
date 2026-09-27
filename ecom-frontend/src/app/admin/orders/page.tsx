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
  customer?: { email: string } | null;
};

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
    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
  }

  return (
    <>
      <h1>Orders</h1>
      <div className="card" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`}><strong>{o.orderNumber}</strong></Link></td>
                <td>{o.customer?.email || 'Guest'}</td>
                <td>{money(o.totalCents)}</td>
                <td><span className="badge">{o.status}</span></td>
                <td className="row">
                  <Link className="btn sm secondary" href={`/admin/orders/${o.id}`}>Manage</Link>
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
