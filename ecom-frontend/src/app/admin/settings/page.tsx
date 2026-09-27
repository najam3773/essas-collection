'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, setStoreCurrency } from '@/lib/api';
import { STORE_CURRENCIES } from '@/lib/currencies';

type Settings = {
  announcementEnabled: boolean;
  announcementText?: string | null;
  freeShippingThresholdCents?: number | null;
  lowStockThreshold: number;
  giftNotesEnabled: boolean;
  supportEmail?: string | null;
  currency: string;
};

type Rule = {
  id: string;
  name: string;
  type: string;
  value: number;
  minSubtotalCents: number;
  isActive: boolean;
};

export default function StoreSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [message, setMessage] = useState('');
  const [currency, setCurrency] = useState('USD');

  async function load() {
    const token = localStorage.getItem('staff_token')!;
    const s = await api<Settings>('/admin/settings', { token });
    setSettings(s);
    setCurrency(s.currency || 'USD');
    setStoreCurrency(s.currency || 'USD');
    setRules(await api<Rule[]>('/admin/discount-rules', { token }));
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = localStorage.getItem('staff_token')!;
    const fd = new FormData(e.currentTarget);
    const nextCurrency = String(fd.get('currency') || 'USD');
    await api('/admin/settings', {
      token,
      method: 'PUT',
      body: {
        announcementEnabled: fd.get('announcementEnabled') === 'on',
        announcementText: fd.get('announcementText'),
        freeShippingThresholdCents: fd.get('freeShip')
          ? Math.round(Number(fd.get('freeShip')) * 100)
          : null,
        lowStockThreshold: Number(fd.get('lowStock') || 5),
        giftNotesEnabled: fd.get('giftNotesEnabled') === 'on',
        supportEmail: fd.get('supportEmail') || null,
        currency: nextCurrency,
      },
    });
    setStoreCurrency(nextCurrency);
    setMessage('Settings saved');
    await load();
  }

  async function addRule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = localStorage.getItem('staff_token')!;
    const fd = new FormData(e.currentTarget);
    await api('/admin/discount-rules', {
      token,
      body: {
        name: fd.get('name'),
        type: fd.get('type'),
        value: Number(fd.get('value') || 0),
        minSubtotalCents: Math.round(Number(fd.get('minSubtotal') || 0) * 100),
      },
    });
    e.currentTarget.reset();
    await load();
  }

  if (!settings) return <p>Loading…</p>;

  return (
    <>
      <h1>Store settings</h1>
      <p className="muted">Announcement bar, currency, free shipping, automatic discounts — store config.</p>
      {message && <p className="success">{message}</p>}

      <form className="card stack" style={{ marginTop: 16, maxWidth: 720 }} onSubmit={saveSettings}>
        <div>
          <label className="label">Store currency</label>
          <select
            className="select"
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {STORE_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
          <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            Used for prices across your storefront and admin. Product amounts stay the same; only the currency label changes.
          </p>
        </div>
        <label className="row"><input type="checkbox" name="announcementEnabled" defaultChecked={settings.announcementEnabled} /> Enable announcement bar</label>
        <input className="input" name="announcementText" defaultValue={settings.announcementText || ''} placeholder="Announcement text" />
        <div className="grid-2">
          <div>
            <label className="label">Free shipping threshold ({currency})</label>
            <input
              className="input"
              name="freeShip"
              type="number"
              step="0.01"
              defaultValue={settings.freeShippingThresholdCents != null ? settings.freeShippingThresholdCents / 100 : ''}
            />
          </div>
          <div>
            <label className="label">Low stock threshold</label>
            <input className="input" name="lowStock" type="number" defaultValue={settings.lowStockThreshold} />
          </div>
        </div>
        <label className="row"><input type="checkbox" name="giftNotesEnabled" defaultChecked={settings.giftNotesEnabled} /> Allow gift notes at checkout</label>
        <input className="input" name="supportEmail" type="email" placeholder="Support email" defaultValue={settings.supportEmail || ''} />
        <button className="btn">Save settings</button>
      </form>

      <div className="grid-2" style={{ marginTop: 20, alignItems: 'start' }}>
        <form className="card stack" onSubmit={addRule}>
          <h2>Automatic discount rule</h2>
          <input className="input" name="name" placeholder="Rule name" required />
          <select className="select" name="type" defaultValue="percent_off_order">
            <option value="percent_off_order">% off order</option>
            <option value="fixed_off_order">Fixed amount off (minor units)</option>
            <option value="free_shipping">Free shipping</option>
          </select>
          <input className="input" name="value" type="number" placeholder="Value (10 = 10% or 10 minor units)" defaultValue={10} />
          <input className="input" name="minSubtotal" type="number" step="0.01" placeholder={`Min subtotal (${currency})`} defaultValue={50} />
          <button className="btn secondary">Add rule</button>
        </form>
        <div className="card">
          <h2>Active rules</h2>
          {rules.map((r) => (
            <div key={r.id} className="row" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)', gap: 8 }}>
              <div>
                <strong>{r.name}</strong>
                <div className="muted">{r.type} · min {(r.minSubtotalCents / 100).toFixed(0)} {currency}</div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="btn sm secondary"
                  onClick={async () => {
                    const token = localStorage.getItem('staff_token')!;
                    await api(`/admin/discount-rules/${r.id}`, {
                      token,
                      method: 'PATCH',
                      body: { isActive: !r.isActive },
                    });
                    await load();
                  }}
                >
                  {r.isActive ? 'Disable' : 'Enable'}
                </button>
                <button
                  type="button"
                  className="btn sm secondary"
                  onClick={async () => {
                    if (!confirm('Delete this discount rule?')) return;
                    const token = localStorage.getItem('staff_token')!;
                    await api(`/admin/discount-rules/${r.id}`, { token, method: 'DELETE' });
                    await load();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
