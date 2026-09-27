'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Cart = {
  id: string;
  updatedAt: string;
  customer?: { email: string } | null;
  items: Array<{ quantity: number; variant: { product: { name: string } } }>;
};

export default function AbandonedPage() {
  const [carts, setCarts] = useState<Cart[]>([]);
  const [msg, setMsg] = useState('');

  async function load() {
    setCarts(await api('/admin/abandoned-carts', { token: localStorage.getItem('staff_token') }));
  }

  useEffect(() => {
    load().catch((e) => setMsg(e.message));
  }, []);

  async function recover(id: string) {
    const email = prompt('Guest email (optional if customer linked)') || undefined;
    const res = await api<{ emailed: string; recoveryUrl: string }>(`/admin/abandoned-carts/${id}/recover`, {
      token: localStorage.getItem('staff_token'),
      body: { email },
    });
    setMsg(`Sent to ${res.emailed}`);
    await load();
  }

  return (
    <>
      <p className="muted">Shopify abandoned checkout recovery — email customers who left items in cart.</p>
      {msg && <p className="success">{msg}</p>}
      <div className="panel" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr><th>Updated</th><th>Customer</th><th>Items</th><th></th></tr>
          </thead>
          <tbody>
            {carts.map((c) => (
              <tr key={c.id}>
                <td>{new Date(c.updatedAt).toLocaleString()}</td>
                <td>{c.customer?.email || 'Guest'}</td>
                <td className="muted">{c.items.map((i) => `${i.variant.product.name} ×${i.quantity}`).join(', ')}</td>
                <td><button className="btn sm gold" type="button" onClick={() => recover(c.id)}>Send recovery</button></td>
              </tr>
            ))}
            {!carts.length && <tr><td colSpan={4} className="muted">No abandoned carts older than 1 hour</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
