'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Webhook = { id: string; url: string; events: string[]; isActive: boolean; secret: string };
type Integration = { id: string; provider: string; isActive: boolean; config: Record<string, unknown> };

const APP_CATALOG = [
  { key: 'stripe', name: 'Stripe Payments', desc: 'Cards, Apple Pay, wallets', icon: 'S' },
  { key: 'klaviyo', name: 'Klaviyo', desc: 'Email & SMS marketing', icon: 'K' },
  { key: 'ga4', name: 'Google Analytics 4', desc: 'Storefront analytics', icon: 'G' },
  { key: 'shipstation', name: 'ShipStation', desc: 'Label & fulfillment sync', icon: 'SS' },
  { key: 'judge', name: 'Product Reviews+', desc: 'Advanced review widgets', icon: '★' },
  { key: 'loyalty', name: 'Loyalty & Rewards', desc: 'Points, VIP tiers', icon: '♥' },
];

export default function AppsPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [msg, setMsg] = useState('');

  async function load() {
    const token = localStorage.getItem('staff_token')!;
    const data = await api<{ webhooks: Webhook[]; integrations: Integration[] }>('/admin/apps', { token });
    setWebhooks(data.webhooks);
    setIntegrations(data.integrations);
  }

  useEffect(() => {
    load().catch((e) => setMsg(e.message));
  }, []);

  async function connect(provider: string) {
    await api('/admin/apps/integrations', {
      token: localStorage.getItem('staff_token'),
      body: { provider, config: { connectedAt: new Date().toISOString() }, isActive: true },
    });
    setMsg(`${provider} connected`);
    await load();
  }

  async function addWebhook(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api('/admin/apps/webhooks', {
      token: localStorage.getItem('staff_token'),
      body: {
        url: fd.get('url'),
        events: String(fd.get('events') || 'order.created').split(',').map((s) => s.trim()),
      },
    });
    setMsg('Webhook created');
    e.currentTarget.reset();
    await load();
  }

  return (
    <>
      <p className="muted">Shopify App Store / WooCommerce Extensions style integrations hub.</p>
      {msg && <p className="success">{msg}</p>}

      <div className="grid-3" style={{ marginTop: 16 }}>
        {APP_CATALOG.map((app) => {
          const connected = integrations.some((i) => i.provider === app.key && i.isActive);
          return (
            <div key={app.key} className="app-tile">
              <div className="icon">{app.icon}</div>
              <strong style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem' }}>{app.name}</strong>
              <span className="muted">{app.desc}</span>
              <button
                className={`btn sm ${connected ? 'secondary' : 'gold'}`}
                type="button"
                onClick={() => connect(app.key)}
              >
                {connected ? 'Connected' : 'Install'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="grid-2" style={{ marginTop: 22, alignItems: 'start' }}>
        <form className="panel stack" onSubmit={addWebhook}>
          <h2>Create webhook</h2>
          <div>
            <label className="label">Endpoint URL</label>
            <input className="input" name="url" required placeholder="https://example.com/hooks/orders" />
          </div>
          <div>
            <label className="label">Events (comma-separated)</label>
            <input className="input" name="events" defaultValue="order.created, order.fulfilled, product.updated" />
          </div>
          <button className="btn gold">Add webhook</button>
        </form>
        <div className="panel">
          <h2>Active webhooks</h2>
          <table className="table">
            <thead><tr><th>URL</th><th>Events</th><th>Status</th></tr></thead>
            <tbody>
              {webhooks.map((w) => (
                <tr key={w.id}>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.url}</td>
                  <td className="muted">{w.events.join(', ')}</td>
                  <td><span className="badge">{w.isActive ? 'active' : 'off'}</span></td>
                </tr>
              ))}
              {!webhooks.length && <tr><td colSpan={3} className="muted">No webhooks yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
