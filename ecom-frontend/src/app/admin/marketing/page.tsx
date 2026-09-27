'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function MarketingPage() {
  const [auto, setAuto] = useState<{ automations: Array<{ type: string; name: string; subject: string; isActive: boolean }>; outbox: Array<{ toEmail: string; subject: string; status: string; createdAt: string }> }>({ automations: [], outbox: [] });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api<typeof auto>('/admin/automations', { token: localStorage.getItem('staff_token') })
      .then(setAuto)
      .catch((e) => setMsg(e.message));
  }, []);

  return (
    <>
      <p className="muted">Shopify Email / WooCommerce Follow-Ups style automation hub.</p>
      {msg && <p className="error">{msg}</p>}

      <div className="quick-grid" style={{ margin: '16px 0 20px' }}>
        <Link href="/admin/coupons" className="quick-link"><strong>Discounts</strong><span>Coupons & automatic rules</span></Link>
        <Link href="/admin/abandoned" className="quick-link"><strong>Abandoned carts</strong><span>Recovery emails</span></Link>
        <Link href="/admin/paid-features" className="quick-link"><strong>Gift cards</strong><span>Issue & track balances</span></Link>
        <Link href="/admin/cms" className="quick-link"><strong>Landing pages</strong><span>CMS campaigns</span></Link>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="panel">
          <h2>Email flows</h2>
          <table className="table">
            <thead><tr><th>Flow</th><th>Subject</th><th>Status</th></tr></thead>
            <tbody>
              {auto.automations.map((a) => (
                <tr key={a.type}>
                  <td>{a.name}</td>
                  <td className="muted">{a.subject}</td>
                  <td><span className="badge">{a.isActive ? 'active' : 'off'}</span></td>
                </tr>
              ))}
              {!auto.automations.length && <tr><td colSpan={3} className="muted">No automations</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <h2>Recent sends</h2>
          <table className="table">
            <thead><tr><th>To</th><th>Subject</th><th>Status</th></tr></thead>
            <tbody>
              {auto.outbox.slice(0, 12).map((o, i) => (
                <tr key={i}>
                  <td>{o.toEmail}</td>
                  <td>{o.subject}</td>
                  <td><span className="badge">{o.status}</span></td>
                </tr>
              ))}
              {!auto.outbox.length && <tr><td colSpan={3} className="muted">No emails yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
