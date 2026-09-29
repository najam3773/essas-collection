'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { api, getCartSession, money } from '@/lib/api';
import { getCustomerToken } from '@/lib/store-auth';

type Cart = {
  id: string;
  items: Array<{
    id: string;
    quantity: number;
    unitPriceCents: number;
    variant: { sku: string; product: { name: string; slug: string; media?: Array<{ url: string }> } };
  }>;
};

type Quote = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  couponCode?: string;
  autoRuleName?: string;
  amountToFreeShipping?: number | null;
  giftNotesEnabled?: boolean;
};

type SavedAddress = {
  id: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  country: string;
  isDefault?: boolean;
};

type Account = {
  email: string;
  fullName?: string | null;
  phone?: string | null;
  addresses: SavedAddress[];
};

function pickCheckoutAddress(addresses: SavedAddress[]): SavedAddress | undefined {
  if (!addresses.length) return undefined;
  return addresses.find((a) => a.isDefault) || (addresses.length === 1 ? addresses[0] : undefined);
}

export default function CartPage() {
  const { tenant } = useParams<{ tenant: string }>();
  const searchParams = useSearchParams();
  const [cart, setCart] = useState<Cart | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [coupon, setCoupon] = useState('');
  const [giftCard, setGiftCard] = useState('');
  const [giftBalance, setGiftBalance] = useState<number | null>(null);
  const [fulfillment, setFulfillment] = useState<'ship' | 'pickup' | 'local_delivery'>('ship');
  const [fulfillOpts, setFulfillOpts] = useState<Array<{ type: string; name: string; priceCents: number }>>([]);
  const [order, setOrder] = useState<{ orderNumber: string; totalCents: number } | null>(null);
  const [error, setError] = useState('');
  const [recoverNote, setRecoverNote] = useState('');
  const [account, setAccount] = useState<Account | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [saveAddress, setSaveAddress] = useState(false);
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [email, setEmail] = useState('');

  const savedAddresses = account?.addresses || [];
  const usingSaved = selectedAddressId !== 'new' && savedAddresses.some((a) => a.id === selectedAddressId);
  const selectedSaved = useMemo(
    () => savedAddresses.find((a) => a.id === selectedAddressId),
    [savedAddresses, selectedAddressId],
  );

  async function load() {
    const c = await api<Cart>('/storefront/cart', {
      cartSession: getCartSession(),
    });
    setCart(c);
    if (c.items.length) {
      const q = await api<Quote>('/storefront/checkout/quote', {
        body: { cartId: c.id, country: 'Pakistan', couponCode: coupon || undefined },
      });
      setQuote(q);
    } else setQuote(null);
  }

  useEffect(() => {
    const recover = searchParams.get('recover');
    async function boot() {
      const token = getCustomerToken(tenant);
      if (token) {
        try {
          const me = await api<Account>('/storefront/account', { token });
          setAccount(me);
          setEmail(me.email || '');
          setContactName(me.fullName || '');
          setContactPhone(me.phone || '');
          const picked = pickCheckoutAddress(me.addresses || []);
          if (picked) {
            setSelectedAddressId(picked.id);
            setLine1(picked.line1);
            setCity(picked.city);
            setState(picked.state || '');
            setPostalCode(picked.postalCode || '');
          }
        } catch {
          setAccount(null);
        }
      }
      if (recover) {
        const recovered = await api<{ sessionToken?: string; items: unknown[] }>(
          `/storefront/cart/recover/${recover}`,
          { },
        );
        if (recovered.sessionToken) {
          localStorage.setItem('cart_session', recovered.sessionToken);
        }
        setRecoverNote(
          recovered.items?.length
            ? 'Welcome back — we restored your bag.'
            : 'Recovery link opened, but this bag is empty.',
        );
      }
      await load();
      api<typeof fulfillOpts>('/storefront/fulfillment-options', {  })
        .then(setFulfillOpts)
        .catch(() => undefined);
    }
    boot().catch((e) => setError(e.message));
  }, [tenant, searchParams]);

  function applySavedAddress(id: string) {
    setSelectedAddressId(id);
    if (id === 'new') {
      setLine1('');
      setCity('');
      setState('');
      setPostalCode('');
      setSaveAddress(true);
      return;
    }
    const addr = savedAddresses.find((a) => a.id === id);
    if (!addr) return;
    setLine1(addr.line1);
    setCity(addr.city);
    setState(addr.state || '');
    setPostalCode(addr.postalCode || '');
    setSaveAddress(false);
  }

  async function lookupGift() {
    if (!giftCard) return;
    const r = await api<{ balanceCents: number }>('/storefront/gift-cards/lookup', {
      body: { code: giftCard },
    });
    setGiftBalance(r.balanceCents);
  }

  async function updateQty(id: string, quantity: number) {
    await api(`/storefront/cart/items/${id}`, {
      cartSession: getCartSession(),
      method: 'PATCH',
      body: { quantity },
    });
    await load();
  }

  async function applyCoupon() {
    if (!cart) return;
    const q = await api<Quote>('/storefront/checkout/quote', {
      body: { cartId: cart.id, country: 'Pakistan', couponCode: coupon },
    });
    setQuote(q);
  }

  async function checkout(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cart) return;
    const fd = new FormData(e.currentTarget);
    const token = getCustomerToken(tenant);
    try {
      const result = await api<{ orderNumber: string; totalCents: number }>('/storefront/checkout', {
        cartSession: getCartSession(),
        token: token || undefined,
        body: {
          cartId: cart.id,
          email: token ? undefined : fd.get('email'),
          couponCode: coupon || undefined,
          giftNote: fd.get('giftNote') || undefined,
          contactName: contactName || undefined,
          contactPhone: contactPhone || undefined,
          addressId: usingSaved ? selectedAddressId : undefined,
          saveAddress: Boolean(token) && !usingSaved && saveAddress,
          shippingAddress: {
            line1,
            city,
            state: state || undefined,
            postalCode: postalCode.trim(),
            country: 'Pakistan',
            fullName: contactName || undefined,
            phone: contactPhone || undefined,
          },
        },
      });
      setOrder(result);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    }
  }

  return (
    <main className="shell">
      <p className="eyebrow">Secure checkout</p>
      <h1 style={{ fontSize: 'clamp(2.4rem, 5vw, 3.4rem)' }}>Shopping bag</h1>
      {recoverNote && <p className="success">{recoverNote}</p>}
      {error && <p className="error">{error}</p>}
      {order ? (
        <div className="card stack" style={{ marginTop: 28, textAlign: 'center', padding: 40 }}>
          <p className="eyebrow">Confirmed</p>
          <h2 style={{ fontSize: '2.4rem' }}>Thank you</h2>
          <p>Order <strong>#{order.orderNumber}</strong> is confirmed.</p>
          <p className="muted">Cash on Delivery — pay when your order arrives.</p>
          <p className="pdp-price">{money(order.totalCents)}</p>
          <Link className="btn gold" href={'/shop'}>Continue shopping</Link>
        </div>
      ) : (
        <div className="checkout-shell">
          <div>
            {!cart?.items.length && (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <p className="muted">Your bag is empty.</p>
                <Link className="btn gold" href={'/shop'}>Browse the collection</Link>
              </div>
            )}
            {cart?.items.map((i) => {
              const img = i.variant.product.media?.[0]?.url;
              return (
                <div key={i.id} className="cart-item-row">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" />
                  ) : (
                    <div style={{ width: 88, height: 110, borderRadius: 14, background: '#e7dfd2' }} />
                  )}
                  <div>
                    <Link href={`/product/${i.variant.product.slug}`}>
                      <strong style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem' }}>
                        {i.variant.product.name}
                      </strong>
                    </Link>
                    <div className="muted">{i.variant.sku}</div>
                    <div className="row" style={{ marginTop: 10 }}>
                      <button className="btn sm secondary" type="button" onClick={() => updateQty(i.id, i.quantity - 1)}>-</button>
                      <span>{i.quantity}</span>
                      <button className="btn sm secondary" type="button" onClick={() => updateQty(i.id, i.quantity + 1)}>+</button>
                    </div>
                  </div>
                  <strong>{money(i.unitPriceCents * i.quantity)}</strong>
                </div>
              );
            })}
          </div>

          {!!cart?.items.length && (
            <div className="stack">
              <div className="card stack">
                <p className="eyebrow">Summary</p>
                <h2 style={{ margin: 0 }}>Order total</h2>
                {quote?.amountToFreeShipping != null && quote.amountToFreeShipping > 0 && (
                  <>
                    <p className="badge warn">Add {money(quote.amountToFreeShipping)} more for free shipping</p>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.min(99, Math.round(((7500 - quote.amountToFreeShipping) / 7500) * 100))}%` }}
                      />
                    </div>
                  </>
                )}
                {quote?.amountToFreeShipping === 0 && <p className="badge">Free shipping unlocked</p>}
                <div className="row">
                  <input className="input" placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} />
                  <button className="btn secondary" type="button" onClick={applyCoupon}>Apply</button>
                </div>
                <div className="row">
                  <input className="input" placeholder="Gift card code" value={giftCard} onChange={(e) => setGiftCard(e.target.value.toUpperCase())} />
                  <button className="btn secondary" type="button" onClick={lookupGift}>Check</button>
                </div>
                {giftBalance != null && (
                  <p className="badge">Gift card balance {money(giftBalance)}</p>
                )}
                <div>
                  <label className="label">Fulfillment</label>
                  <select className="select" value={fulfillment} onChange={(e) => setFulfillment(e.target.value as typeof fulfillment)}>
                    {fulfillOpts.map((o) => (
                      <option key={o.type} value={o.type}>
                        {o.name}{o.priceCents ? ` (+${money(o.priceCents)})` : ''}
                      </option>
                    ))}
                    {!fulfillOpts.length && (
                      <>
                        <option value="ship">Ship</option>
                        <option value="pickup">Pickup</option>
                        <option value="local_delivery">Local delivery</option>
                      </>
                    )}
                  </select>
                </div>
                {quote && (
                  <>
                    <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">Subtotal</span><span>{money(quote.subtotalCents)}</span></div>
                    {quote.discountCents > 0 && (
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <span className="muted">Discount ({quote.couponCode || quote.autoRuleName || 'promo'})</span>
                        <span>-{money(quote.discountCents)}</span>
                      </div>
                    )}
                    <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">Shipping</span><span>{quote.shippingCents === 0 ? 'Free' : money(quote.shippingCents)}</span></div>
                    <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">Tax</span><span>{money(quote.taxCents)}</span></div>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>Total</strong>
                      <strong className="pdp-price" style={{ fontSize: '1.6rem' }}>{money(quote.totalCents)}</strong>
                    </div>
                  </>
                )}
              </div>
              <form className="card stack" onSubmit={checkout}>
                <p className="eyebrow">Payment</p>
                <h2 style={{ margin: 0 }}>Checkout</h2>
                <p className="muted">Cash on Delivery is available for orders in Pakistan.</p>
                <div>
                  <label className="label">Payment method</label>
                  <input className="input" value="Cash on Delivery" readOnly aria-readonly />
                </div>
                {account ? (
                  <div>
                    <label className="label">Account</label>
                    <input className="input" value={account.email} readOnly aria-readonly />
                  </div>
                ) : (
                  <div>
                    <label className="label">Email</label>
                    <input className="input" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                      <Link href="/login">Sign in</Link> to use your saved addresses.
                    </p>
                  </div>
                )}
                <div>
                  <label className="label">Full name</label>
                  <input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Recipient name" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="03xx xxxxxxx" />
                </div>
                {savedAddresses.length > 0 && (
                  <div>
                    <label className="label">Saved addresses</label>
                    <select
                      className="select"
                      value={selectedAddressId}
                      onChange={(e) => applySavedAddress(e.target.value)}
                    >
                      {savedAddresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.isDefault ? 'Default · ' : ''}{a.line1}, {a.city}
                        </option>
                      ))}
                      <option value="new">Use a new address</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="label">Address</label>
                  <input
                    className="input"
                    name="line1"
                    required
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    readOnly={usingSaved}
                  />
                </div>
                <div className="grid-3">
                  <input className="input" name="city" placeholder="City" required value={city} onChange={(e) => setCity(e.target.value)} readOnly={usingSaved} />
                  <input className="input" name="state" placeholder="Province" value={state} onChange={(e) => setState(e.target.value)} readOnly={usingSaved} />
                  <input className="input" name="postalCode" placeholder="Postal code (optional)" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} readOnly={usingSaved} />
                </div>
                <div>
                  <label className="label">Country</label>
                  <input className="input" value="Pakistan" readOnly aria-readonly />
                </div>
                {account && !usingSaved && (
                  <label className="row" style={{ gap: 10, alignItems: 'center' }}>
                    <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                    <span>Save this address to my account</span>
                  </label>
                )}
                {selectedSaved && usingSaved && (
                  <p className="muted" style={{ fontSize: 13 }}>Using your saved address snapshot at checkout. Past orders keep the address they were placed with.</p>
                )}
                {(quote?.giftNotesEnabled ?? true) && (
                  <div>
                    <label className="label">Gift note (optional)</label>
                    <textarea className="textarea" name="giftNote" rows={2} placeholder="Happy birthday…" />
                  </div>
                )}
                <button className="btn gold">Place order</button>
              </form>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
