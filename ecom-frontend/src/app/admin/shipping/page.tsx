'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, money } from '@/lib/api';

export default function ShippingTaxPage() {
  const [zones, setZones] = useState<Array<{ id: string; name: string; countries: string[]; rateCents: number; isActive?: boolean }>>([]);
  const [taxes, setTaxes] = useState<Array<{ id: string; name: string; country: string; rateBps: number; isActive?: boolean }>>([]);

  async function load() {
    const token = localStorage.getItem('staff_token')!;
    const [z, t] = await Promise.all([
      api<typeof zones>('/admin/shipping-zones', { token }),
      api<typeof taxes>('/admin/tax-rules', { token }),
    ]);
    setZones(z);
    setTaxes(t);
  }

  useEffect(() => {
    load();
  }, []);

  async function addZone(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = localStorage.getItem('staff_token')!;
    const fd = new FormData(e.currentTarget);
    await api('/admin/shipping-zones', {
      token,
      body: {
        name: fd.get('name'),
        countries: String(fd.get('countries')).split(',').map((s) => s.trim().toUpperCase()),
        rateCents: Math.round(Number(fd.get('rate')) * 100),
      },
    });
    e.currentTarget.reset();
    await load();
  }

  async function addTax(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = localStorage.getItem('staff_token')!;
    const fd = new FormData(e.currentTarget);
    await api('/admin/tax-rules', {
      token,
      body: {
        name: fd.get('name'),
        country: fd.get('country'),
        rateBps: Math.round(Number(fd.get('rate')) * 100),
      },
    });
    e.currentTarget.reset();
    await load();
  }

  async function removeZone(id: string) {
    if (!confirm('Delete this shipping zone?')) return;
    const token = localStorage.getItem('staff_token')!;
    await api(`/admin/shipping-zones/${id}`, { token, method: 'DELETE' });
    await load();
  }

  async function removeTax(id: string) {
    if (!confirm('Delete this tax rule?')) return;
    const token = localStorage.getItem('staff_token')!;
    await api(`/admin/tax-rules/${id}`, { token, method: 'DELETE' });
    await load();
  }

  return (
    <>
      <h1>Shipping & tax</h1>
      <div className="grid-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="stack">
          <form className="card stack" onSubmit={addZone}>
            <h2>Add shipping zone</h2>
            <input className="input" name="name" placeholder="Zone name" required />
            <input className="input" name="countries" placeholder="Countries (US,CA)" required />
            <input className="input" name="rate" type="number" step="0.01" placeholder="Rate" required />
            <button className="btn">Add zone</button>
          </form>
          <div className="card">
            {zones.map((z) => (
              <div key={z.id} className="row" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)', gap: 12 }}>
                <div>
                  <strong>{z.name}</strong>
                  <div className="muted">{z.countries.join(', ')}</div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <span>{money(z.rateCents)}</span>
                  <button type="button" className="btn sm secondary" onClick={() => removeZone(z.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="stack">
          <form className="card stack" onSubmit={addTax}>
            <h2>Add tax rule</h2>
            <input className="input" name="name" placeholder="Rule name" required />
            <input className="input" name="country" placeholder="Country code" defaultValue="US" required />
            <input className="input" name="rate" type="number" step="0.01" placeholder="Rate % (e.g. 8)" required />
            <button className="btn">Add tax</button>
          </form>
          <div className="card">
            {taxes.map((t) => (
              <div key={t.id} className="row" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)', gap: 12 }}>
                <div>
                  <strong>{t.name}</strong>
                  <div className="muted">{t.country}</div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <span>{(t.rateBps / 100).toFixed(2)}%</span>
                  <button type="button" className="btn sm secondary" onClick={() => removeTax(t.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
