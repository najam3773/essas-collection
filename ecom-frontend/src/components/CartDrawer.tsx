'use client';

import Link from 'next/link';
import { api, getCartSession, money } from '@/lib/api';
import { useEffect, useState } from 'react';

type Cart = {
  id: string;
  items: Array<{
    id: string;
    quantity: number;
    unitPriceCents: number;
    variant: { product: { name: string; slug: string; media?: Array<{ url: string }> } };
  }>;
};

export function CartDrawer({
  tenant,
  open,
  onClose,
}: {
  tenant: string;
  open: boolean;
  onClose: () => void;
}) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [upsells, setUpsells] = useState<Array<{ id: string; name: string; slug: string; variants: Array<{ priceCents: number }> }>>([]);
  const [toFree, setToFree] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    api<Cart>('/storefront/cart', { cartSession: getCartSession() }).then(async (c) => {
      setCart(c);
      if (c.items.length) {
        const q = await api<{ amountToFreeShipping: number | null }>('/storefront/checkout/quote', {
          body: { cartId: c.id, country: 'PK' },
        });
        setToFree(q.amountToFreeShipping);
      } else setToFree(null);
    });
    api<typeof upsells>('/storefront/cart/upsells', {
      cartSession: getCartSession(),
    }).then(setUpsells);
  }, [open, tenant]);

  if (!open) return null;
  const subtotal = cart?.items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0) || 0;
  const freeGoal = 7500;
  const progress = toFree == null ? 0 : toFree === 0 ? 100 : Math.min(99, Math.round(((freeGoal - toFree) / freeGoal) * 100));

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>Your bag</p>
            <h2 style={{ margin: 0, fontSize: '2rem' }}>Cart</h2>
          </div>
          <button className="btn secondary sm" type="button" onClick={onClose}>Close</button>
        </div>

        <div style={{ overflow: 'auto', padding: '18px 0', minHeight: 0 }}>
          {toFree != null && (
            <div style={{ marginBottom: 18 }}>
              <p className="badge warn" style={{ marginBottom: 10 }}>
                {toFree > 0 ? `Add ${money(toFree)} more for free shipping` : 'Free shipping unlocked'}
              </p>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {!cart?.items.length && (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <p className="muted">Your bag is empty.</p>
              <Link className="btn gold sm" href={'/shop'} onClick={onClose}>
                Start shopping
              </Link>
            </div>
          )}

          {cart?.items.map((i) => {
            const img = i.variant.product.media?.[0]?.url;
            return (
              <div key={i.id} className="cart-line">
                <div className="cart-thumb">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" />
                  ) : null}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/product/${i.variant.product.slug}`} onClick={onClose}>
                    <strong style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem' }}>
                      {i.variant.product.name}
                    </strong>
                  </Link>
                  <div className="muted" style={{ fontSize: '.88rem' }}>Qty {i.quantity}</div>
                </div>
                <span className="price">{money(i.unitPriceCents * i.quantity)}</span>
              </div>
            );
          })}

          {!!upsells.length && (
            <div style={{ marginTop: 28 }}>
              <p className="eyebrow">Complete the look</p>
              <div className="stack">
                {upsells.map((u) => (
                  <Link
                    key={u.id}
                    href={`/product/${u.slug}`}
                    className="cart-line"
                    onClick={onClose}
                    style={{ textDecoration: 'none' }}
                  >
                    <span style={{ flex: 1 }}>{u.name}</span>
                    <span className="muted">{u.variants[0] ? money(u.variants[0].priceCents) : ''}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="stack" style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">Subtotal</span>
            <strong style={{ fontSize: '1.2rem' }}>{money(subtotal)}</strong>
          </div>
          <Link className="btn gold" href={'/cart'} onClick={onClose}>
            Checkout
          </Link>
          <Link className="btn secondary" href={'/shop'} onClick={onClose}>
            Continue shopping
          </Link>
        </div>
      </aside>
    </div>
  );
}
