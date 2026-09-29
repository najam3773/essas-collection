'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, money } from '@/lib/api';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  couponCode?: string | null;
  giftNote?: string | null;
  shippingAddress?: Record<string, string>;
  customer?: { email: string; fullName?: string; phone?: string | null } | null;
  lines: Array<{ productName: string; sku: string; quantity: number; unitPriceCents: number }>;
  shipments: Array<{ carrier?: string; trackingNumber?: string; trackingUrl?: string; status: string }>;
  payments: Array<{ status: string; provider: string; amountCents: number }>;
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState('');

  async function load() {
    const token = localStorage.getItem('staff_token')!;
    setOrder(await api<Order>(`/admin/orders/${id}`, { token }));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function fulfill(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = localStorage.getItem('staff_token')!;
    const fd = new FormData(e.currentTarget);
    await api(`/admin/orders/${id}/fulfill`, {
      token,
      body: {
        carrier: fd.get('carrier'),
        trackingNumber: fd.get('trackingNumber'),
        trackingUrl: fd.get('trackingUrl'),
      },
    });
    setMessage('Order fulfilled');
    await load();
  }

  async function refund() {
    const token = localStorage.getItem('staff_token')!;
    await api(`/admin/orders/${id}/refund`, { token, method: 'POST', body: {} });
    setMessage('Order refunded & stock restored');
    await load();
  }

  if (!order) return <p>Loading order…</p>;

  return (
    <>
      <Link href="/admin/orders" className="muted">← Orders</Link>
      <div className="row admin-page-head" style={{ justifyContent: 'space-between', marginTop: 12 }}>
        <div>
          <h1>Order {order.orderNumber}</h1>
          <span className="badge">{order.status}</span>
        </div>
        {order.status !== 'refunded' && (
          <button className="btn secondary" onClick={refund}>Refund</button>
        )}
      </div>
      {message && <p className="success">{message}</p>}

      <div className="grid-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <h2>Line items</h2>
          <table className="table">
            <thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>Total</th></tr></thead>
            <tbody>
              {order.lines.map((l, i) => (
                <tr key={i}>
                  <td>{l.productName}</td>
                  <td>{l.sku}</td>
                  <td>{l.quantity}</td>
                  <td>{money(l.unitPriceCents * l.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="stack" style={{ marginTop: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}><span>Subtotal</span><span>{money(order.subtotalCents)}</span></div>
            {order.discountCents > 0 && (
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                <span>-{money(order.discountCents)}</span>
              </div>
            )}
            <div className="row" style={{ justifyContent: 'space-between' }}><span>Shipping</span><span>{money(order.shippingCents)}</span></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span>Tax</span><span>{money(order.taxCents)}</span></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><strong>Total</strong><strong>{money(order.totalCents)}</strong></div>
          </div>
        </div>

        <div className="stack">
          <div className="card stack">
            <h2>Customer</h2>
            <div>{order.customer?.fullName || order.shippingAddress?.fullName || 'Guest'}</div>
            <div className="muted">{order.customer?.email || '—'}</div>
            {(order.customer?.phone || order.shippingAddress?.phone) && (
              <div>{order.customer?.phone || order.shippingAddress?.phone}</div>
            )}
            {order.shippingAddress && (
              <div className="muted">
                <strong>Ship to this order</strong><br />
                {order.shippingAddress.fullName && <>{order.shippingAddress.fullName}<br /></>}
                {order.shippingAddress.line1}<br />
                {order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}
                {order.shippingAddress.city}{order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ''} {order.shippingAddress.postalCode}<br />
                {order.shippingAddress.country}
                {order.shippingAddress.phone && <><br />{order.shippingAddress.phone}</>}
              </div>
            )}
            {order.giftNote && <p><strong>Gift note:</strong> {order.giftNote}</p>}
          </div>

          <div className="card stack">
            <h2>Fulfillment</h2>
            {order.shipments.map((s, i) => (
              <div key={i}>
                <span className="badge">{s.status}</span> {s.carrier} · {s.trackingNumber}
                {s.trackingUrl && <> · <a href={s.trackingUrl} target="_blank">Track</a></>}
              </div>
            ))}
            {order.status !== 'fulfilled' && order.status !== 'refunded' && (
              <form className="stack" onSubmit={fulfill}>
                <input className="input" name="carrier" placeholder="Carrier" defaultValue="UPS" />
                <input className="input" name="trackingNumber" placeholder="Tracking number" />
                <input className="input" name="trackingUrl" placeholder="Tracking URL" />
                <button className="btn">Mark fulfilled</button>
              </form>
            )}
          </div>

          <div className="card">
            <h2>Payments</h2>
            {order.payments.map((p, i) => (
              <div key={i} className="row" style={{ justifyContent: 'space-between' }}>
                <span>{p.provider}</span>
                <span>{money(p.amountCents)} · <span className="badge">{p.status}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
