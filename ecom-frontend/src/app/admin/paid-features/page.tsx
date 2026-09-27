'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';

function token() {
  return localStorage.getItem('staff_token')!;
}

export default function PaidFeaturesPage() {
  const [summary, setSummary] = useState<Array<{ key: string; name: string; count: number; status: string }>>([]);
  const [giftCards, setGiftCards] = useState<Array<{ id: string; code: string; balanceCents: number; initialCents: number; isActive?: boolean }>>([]);
  const [abandoned, setAbandoned] = useState<Array<{ id: string; updatedAt: string; customer?: { email: string } | null; items: unknown[] }>>([]);
  const [drafts, setDrafts] = useState<Array<{ id: string; orderNumber: string; totalCents: number }>>([]);
  const [automations, setAutomations] = useState<{ automations: unknown[]; outbox: Array<{ toEmail: string; subject: string; status: string }> }>({ automations: [], outbox: [] });
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'overview' | 'gift' | 'abandoned' | 'drafts' | 'automations'>('overview');

  async function load() {
    const t = token();
    const [s, g, a, d, auto] = await Promise.all([
      api<{ features: typeof summary }>('/admin/paid-features/summary', { token: t }),
      api<typeof giftCards>('/admin/gift-cards', { token: t }),
      api<typeof abandoned>('/admin/abandoned-carts', { token: t }),
      api<typeof drafts>('/admin/draft-orders', { token: t }),
      api<typeof automations>('/admin/automations', { token: t }),
    ]);
    setSummary(s.features);
    setGiftCards(g);
    setAbandoned(a);
    setDrafts(d);
    setAutomations(auto);
  }

  useEffect(() => {
    load().catch((e) => setMsg(e.message));
  }, []);

  async function issueGiftCard(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api('/admin/gift-cards', {
      token: token(),
      body: { initialCents: Math.round(Number(fd.get('amount')) * 100), note: fd.get('note') || undefined },
    });
    setMsg('Gift card issued');
    e.currentTarget.reset();
    await load();
  }

  async function toggleGiftCard(g: { id: string; isActive?: boolean }) {
    await api(`/admin/gift-cards/${g.id}`, {
      token: token(),
      method: 'PATCH',
      body: { isActive: !g.isActive },
    });
    await load();
  }

  async function removeGiftCard(id: string) {
    if (!confirm('Delete this gift card?')) return;
    await api(`/admin/gift-cards/${id}`, { token: token(), method: 'DELETE' });
    await load();
  }

  async function recover(id: string) {
    const email = prompt('Customer email for recovery (if guest cart)') || undefined;
    const res = await api<{ recoveryUrl: string; emailed: string }>(`/admin/abandoned-carts/${id}/recover`, {
      token: token(),
      body: { email },
    });
    setMsg(`Recovery emailed to ${res.emailed}`);
    await load();
  }

  async function createDraft(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api('/admin/draft-orders', {
      token: token(),
      body: {
        note: fd.get('note') || undefined,
        lines: [
          {
            variantId: fd.get('variantId'),
            quantity: Number(fd.get('qty') || 1),
          },
        ],
      },
    });
    setMsg('Draft order created');
    e.currentTarget.reset();
    await load();
  }

  return (
    <>
      <p className="muted">Gift cards, loyalty, abandoned carts, B2B, multi-currency, bundles, drafts, automations, and more.</p>
      {msg && <p className="success">{msg}</p>}

      <div className="row" style={{ margin: '20px 0' }}>
        {(['overview', 'gift', 'abandoned', 'drafts', 'automations'] as const).map((t) => (
          <button key={t} className={`btn sm ${tab === t ? 'gold' : 'secondary'}`} type="button" onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid-3">
          {summary.map((f) => (
            <div key={f.key} className="card">
              <p className="eyebrow">{f.status}</p>
              <h3 style={{ margin: 0 }}>{f.name}</h3>
              <p className="muted" style={{ marginBottom: 0 }}>Active records: {f.count}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'gift' && (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <form className="card stack" onSubmit={issueGiftCard}>
            <h2 style={{ margin: 0 }}>Issue gift card</h2>
            <div>
              <label className="label">Amount (USD)</label>
              <input className="input" name="amount" type="number" min={1} step="0.01" required defaultValue={50} />
            </div>
            <div>
              <label className="label">Note</label>
              <input className="input" name="note" placeholder="Birthday gift" />
            </div>
            <button className="btn gold">Issue card</button>
          </form>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Gift cards</h2>
            <table className="table">
              <thead>
                <tr><th>Code</th><th>Balance</th><th>Initial</th><th></th></tr>
              </thead>
              <tbody>
                {giftCards.map((g) => (
                  <tr key={g.id}>
                    <td><code>{g.code}</code></td>
                    <td>${(g.balanceCents / 100).toFixed(2)}</td>
                    <td>${(g.initialCents / 100).toFixed(2)}</td>
                    <td className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                      <button className="btn sm secondary" type="button" onClick={() => toggleGiftCard(g)}>
                        {g.isActive === false ? 'Activate' : 'Deactivate'}
                      </button>
                      <button className="btn sm secondary" type="button" onClick={() => removeGiftCard(g.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {!giftCards.length && <tr><td colSpan={4} className="muted">No gift cards yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'abandoned' && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Abandoned carts</h2>
          <table className="table">
            <thead>
              <tr><th>Updated</th><th>Customer</th><th>Items</th><th></th></tr>
            </thead>
            <tbody>
              {abandoned.map((c) => (
                <tr key={c.id}>
                  <td>{new Date(c.updatedAt).toLocaleString()}</td>
                  <td>{c.customer?.email || 'Guest'}</td>
                  <td>{c.items.length}</td>
                  <td><button className="btn sm" type="button" onClick={() => recover(c.id)}>Send recovery</button></td>
                </tr>
              ))}
              {!abandoned.length && <tr><td colSpan={4} className="muted">No abandoned carts</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'drafts' && (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <form className="card stack" onSubmit={createDraft}>
            <h2 style={{ margin: 0 }}>Create draft order</h2>
            <div>
              <label className="label">Variant ID</label>
              <input className="input" name="variantId" required placeholder="UUID from product variant" />
            </div>
            <div>
              <label className="label">Qty</label>
              <input className="input" name="qty" type="number" min={1} defaultValue={1} />
            </div>
            <div>
              <label className="label">Note</label>
              <input className="input" name="note" />
            </div>
            <button className="btn gold">Create draft</button>
          </form>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Drafts</h2>
            <table className="table">
              <thead><tr><th>Order</th><th>Total</th></tr></thead>
              <tbody>
                {drafts.map((d) => (
                  <tr key={d.id}>
                    <td>{d.orderNumber}</td>
                    <td>${(d.totalCents / 100).toFixed(2)}</td>
                  </tr>
                ))}
                {!drafts.length && <tr><td colSpan={2} className="muted">No drafts</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'automations' && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Email outbox</h2>
          <table className="table">
            <thead><tr><th>To</th><th>Subject</th><th>Status</th></tr></thead>
            <tbody>
              {automations.outbox.map((o, i) => (
                <tr key={i}>
                  <td>{o.toEmail}</td>
                  <td>{o.subject}</td>
                  <td><span className="badge">{o.status}</span></td>
                </tr>
              ))}
              {!automations.outbox.length && <tr><td colSpan={3} className="muted">No emails yet — send an abandoned cart recovery to generate one</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
