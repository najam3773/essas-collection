'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, money } from '@/lib/api';
import { clearCustomerToken, getCustomerToken } from '@/lib/store-auth';

type Account = {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  addresses: Array<{ id: string; line1: string; city: string; postalCode: string; country: string; isDefault: boolean }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalCents: number;
    createdAt: string;
    lines: Array<{ productName: string; quantity: number }>;
  }>;
};

export default function AccountPage() {
  const { tenant } = useParams<{ tenant: string }>();
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [loyalty, setLoyalty] = useState<{ points: number; storeCreditCents: number; referralCode?: string | null } | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = getCustomerToken(tenant);
    if (!token) {
      router.replace('/login');
      return;
    }
    api<Account>('/storefront/account', { token })
      .then(setAccount)
      .catch(() => router.replace('/login'));
    api<typeof loyalty>('/storefront/loyalty/me', { token })
      .then(setLoyalty)
      .catch(() => undefined);
  }, [tenant, router]);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = getCustomerToken(tenant)!;
    const fd = new FormData(e.currentTarget);
    const updated = await api<Account>('/storefront/account', {
      token,
      method: 'PUT',
      body: { fullName: fd.get('fullName'), phone: fd.get('phone') },
    });
    setAccount((a) => (a ? { ...a, ...updated } : a));
    setMessage('Profile updated');
  }

  async function addAddress(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = getCustomerToken(tenant)!;
    const fd = new FormData(e.currentTarget);
    await api('/storefront/account/addresses', {
      token,
      body: {
        line1: fd.get('line1'),
        city: fd.get('city'),
        postalCode: String(fd.get('postalCode') || '').trim(),
        country: 'Pakistan',
        isDefault: true,
      },
    });
    const refreshed = await api<Account>('/storefront/account', { token });
    setAccount(refreshed);
    setMessage('Address saved');
    e.currentTarget.reset();
  }

  if (!account) return <main className="shell">Loading…</main>;

  return (
    <main className="shell">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <p className="eyebrow">Member</p>
          <h1 style={{ fontSize: 'clamp(2.2rem, 4vw, 3.2rem)' }}>My account</h1>
          <p className="muted">{account.email}</p>
        </div>
        <button
          className="btn secondary"
          onClick={() => {
            clearCustomerToken(tenant);
            router.push('/');
          }}
        >
          Sign out
        </button>
      </div>
      {message && <p className="success">{message}</p>}

      {loyalty && (
        <div className="grid-3" style={{ marginTop: 24 }}>
          <div className="card">
            <p className="eyebrow">Loyalty</p>
            <h3 style={{ margin: 0 }}>{loyalty.points} pts</h3>
          </div>
          <div className="card">
            <p className="eyebrow">Store credit</p>
            <h3 style={{ margin: 0 }}>{money(loyalty.storeCreditCents)}</h3>
          </div>
          <div className="card">
            <p className="eyebrow">Referral</p>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{loyalty.referralCode || 'Ask support for a code'}</h3>
          </div>
        </div>
      )}

      <div className="grid-2" style={{ marginTop: 28, alignItems: 'start' }}>
        <form className="card stack" onSubmit={saveProfile}>
          <p className="eyebrow">Profile</p>
          <h2 style={{ margin: 0 }}>Personal details</h2>
          <div><label className="label">Full name</label><input className="input" name="fullName" defaultValue={account.fullName || ''} /></div>
          <div><label className="label">Phone</label><input className="input" name="phone" defaultValue={account.phone || ''} /></div>
          <button className="btn gold">Save profile</button>
        </form>

        <form className="card stack" onSubmit={addAddress}>
          <p className="eyebrow">Addresses</p>
          <h2 style={{ margin: 0 }}>Shipping address</h2>
          <input className="input" name="line1" placeholder="Street address" required />
          <div className="grid-2">
            <input className="input" name="city" placeholder="City" required />
            <input className="input" name="postalCode" placeholder="Postal code (optional)" />
          </div>
          <div>
            <label className="label">Country</label>
            <input className="input" value="Pakistan" readOnly aria-readonly />
          </div>
          <button className="btn secondary">Save address</button>
          <div className="stack">
            {account.addresses.map((a) => (
              <div key={a.id} className="muted">
                {a.line1}, {a.city} {a.postalCode} {a.country}
                {a.isDefault && <span className="badge" style={{ marginLeft: 8 }}>Default</span>}
              </div>
            ))}
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 28 }}>
        <p className="eyebrow">Orders</p>
        <h2 style={{ marginTop: 0 }}>Order history</h2>
        {!account.orders.length && <p className="muted">No orders yet. <Link href={'/shop'}>Start shopping</Link></p>}
        <table className="table">
          <thead>
            <tr><th>Order</th><th>Date</th><th>Items</th><th>Status</th><th>Total</th></tr>
          </thead>
          <tbody>
            {account.orders.map((o) => (
              <tr key={o.id}>
                <td>{o.orderNumber}</td>
                <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="muted">{o.lines.map((l) => `${l.productName} ×${l.quantity}`).join(', ')}</td>
                <td><span className="badge">{o.status}</span></td>
                <td>{money(o.totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
