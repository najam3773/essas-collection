'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type Sale = {
  id: string;
  name: string;
  percentOff: number;
  scope: string;
  productId?: string | null;
  categoryId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
  product?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
};

type Category = { id: string; name: string };
type Product = { id: string; name: string };

function fromLocalInput(value: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function AdminSalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [scope, setScope] = useState<'product' | 'category' | 'all'>('category');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load(token: string) {
    const [s, cats, prods] = await Promise.all([
      api<Sale[]>('/admin/sales', { token }),
      api<Category[]>('/admin/categories', { token }).catch(() => [] as Category[]),
      api<Product[]>('/admin/products', { token }).catch(() => [] as Product[]),
    ]);
    setSales(s);
    setCategories(cats);
    setProducts(prods);
  }

  useEffect(() => {
    const token = localStorage.getItem('staff_token');
    if (!token) return router.replace('/admin/login');
    load(token).catch((e) => setError(e.message));
  }, [router]);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = localStorage.getItem('staff_token')!;
    const fd = new FormData(e.currentTarget);
    setError('');
    try {
      await api('/admin/sales', {
        token,
        body: {
          name: fd.get('name'),
          percentOff: Number(fd.get('percentOff')),
          scope,
          productId: scope === 'product' ? fd.get('productId') || null : null,
          categoryId: scope === 'category' ? fd.get('categoryId') || null : null,
          startsAt: fromLocalInput(String(fd.get('startsAt') || '')),
          endsAt: fromLocalInput(String(fd.get('endsAt') || '')),
          isActive: true,
        },
      });
      setMessage('Sale created');
      e.currentTarget.reset();
      setScope('category');
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function toggle(sale: Sale) {
    const token = localStorage.getItem('staff_token')!;
    await api(`/admin/sales/${sale.id}`, {
      token,
      method: 'PATCH',
      body: { isActive: !sale.isActive },
    });
    await load(token);
  }

  async function remove(id: string) {
    if (!confirm('Delete this sale?')) return;
    const token = localStorage.getItem('staff_token')!;
    await api(`/admin/sales/${id}`, { token, method: 'DELETE' });
    await load(token);
  }

  function targetLabel(s: Sale) {
    if (s.scope === 'product') return s.product?.name || 'Product';
    if (s.scope === 'category') return s.category?.name || 'Category';
    return 'Entire store';
  }

  return (
    <>
      <Link href="/admin/coupons" className="muted">
        ← Discounts
      </Link>
      <h1 style={{ marginTop: 8 }}>Product sales</h1>
      <p className="muted">
        Set percent-off sales by product, category, or whole store. Optional start/end dates control when they apply.
      </p>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <form className="card stack" style={{ marginTop: 16, maxWidth: 720 }} onSubmit={create}>
        <div className="grid-2">
          <div>
            <label className="label">Sale name</label>
            <input className="input" name="name" required placeholder="Spring sale" />
          </div>
          <div>
            <label className="label">Percent off</label>
            <input className="input" name="percentOff" type="number" min={1} max={90} defaultValue={20} required />
          </div>
        </div>
        <div className="grid-2">
          <div>
            <label className="label">Applies to</label>
            <select className="select" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
              <option value="category">Category</option>
              <option value="product">Product</option>
              <option value="all">Entire store</option>
            </select>
          </div>
          {scope === 'category' && (
            <div>
              <label className="label">Category</label>
              <select className="select" name="categoryId" required>
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          {scope === 'product' && (
            <div>
              <label className="label">Product</label>
              <select className="select" name="productId" required>
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="grid-2">
          <div>
            <label className="label">Starts (optional)</label>
            <input className="input" name="startsAt" type="datetime-local" />
          </div>
          <div>
            <label className="label">Ends (optional)</label>
            <input className="input" name="endsAt" type="datetime-local" />
          </div>
        </div>
        <button className="btn">Create sale</button>
      </form>

      <div className="card" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Off</th>
              <th>Target</th>
              <th>Dates</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.name}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>{s.scope}</div>
                </td>
                <td>{s.percentOff}%</td>
                <td>{targetLabel(s)}</td>
                <td className="muted" style={{ fontSize: 13 }}>
                  {s.startsAt || s.endsAt
                    ? `${s.startsAt ? new Date(s.startsAt).toLocaleString() : 'Now'} → ${s.endsAt ? new Date(s.endsAt).toLocaleString() : 'Open'}`
                    : 'Always'}
                </td>
                <td><span className="badge">{s.isActive ? 'Active' : 'Off'}</span></td>
                <td className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                  <button className="btn sm secondary" type="button" onClick={() => toggle(s)}>
                    {s.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button className="btn sm secondary" type="button" onClick={() => remove(s.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!sales.length && (
              <tr>
                <td colSpan={6} className="muted">No sales yet — create one above.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
