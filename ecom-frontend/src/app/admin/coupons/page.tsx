'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  usedCount: number;
  maxUses?: number | null;
  isActive: boolean;
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  async function load() {
    const token = localStorage.getItem('staff_token')!;
    setCoupons(await api<Coupon[]>('/admin/coupons', { token }));
  }

  useEffect(() => {
    load().catch(() => setCoupons([]));
  }, []);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = localStorage.getItem('staff_token')!;
    const fd = new FormData(e.currentTarget);
    await api('/admin/coupons', {
      token,
      body: {
        code: String(fd.get('code')).toUpperCase(),
        type: fd.get('type'),
        value: Number(fd.get('value')),
        maxUses: fd.get('maxUses') ? Number(fd.get('maxUses')) : undefined,
      },
    });
    e.currentTarget.reset();
    await load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this coupon?')) return;
    const token = localStorage.getItem('staff_token')!;
    await api(`/admin/coupons/${id}`, { token, method: 'DELETE' });
    await load();
  }

  async function toggle(c: Coupon) {
    const token = localStorage.getItem('staff_token')!;
    await api(`/admin/coupons/${c.id}`, {
      token,
      method: 'PATCH',
      body: { isActive: !c.isActive },
    });
    await load();
  }

  return (
    <>
      <h1>Coupons</h1>
      <form className="card stack" style={{ marginTop: 16, maxWidth: 560 }} onSubmit={create}>
        <div className="grid-2">
          <input className="input" name="code" placeholder="CODE" required />
          <select className="select" name="type" defaultValue="percent">
            <option value="percent">Percent</option>
            <option value="fixed">Fixed (cents)</option>
          </select>
        </div>
        <div className="grid-2">
          <input className="input" name="value" type="number" placeholder="Value (10 = 10% or 10 cents)" required />
          <input className="input" name="maxUses" type="number" placeholder="Max uses (optional)" />
        </div>
        <button className="btn">Create coupon</button>
      </form>
      <div className="card" style={{ marginTop: 16 }}>
        <table className="table">
          <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Used</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.code}</strong></td>
                <td>{c.type}</td>
                <td>{c.type === 'percent' ? `${c.value}%` : `${c.value}¢`}</td>
                <td>{c.usedCount}{c.maxUses != null ? ` / ${c.maxUses}` : ''}</td>
                <td><span className="badge">{c.isActive ? 'Active' : 'Off'}</span></td>
                <td className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn sm secondary" onClick={() => toggle(c)}>{c.isActive ? 'Disable' : 'Enable'}</button>
                  <button className="btn sm secondary" onClick={() => remove(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
