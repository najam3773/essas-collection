'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { setCustomerToken } from '@/lib/store-auth';

export default function StoreLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    try {
      if (mode === 'login') {
        const data = await api<{ token: string }>('/auth/customer/login', {
          body: {
            email: fd.get('email'),
            password: fd.get('password'),
          },
        });
        setCustomerToken(data.token);
      } else {
        const data = await api<{ token: string }>('/storefront/register', {
          body: {
            email: fd.get('email'),
            password: fd.get('password'),
            fullName: fd.get('fullName'),
          },
        });
        setCustomerToken(data.token);
      }
      router.push('/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <main className="shell" style={{ maxWidth: 480 }}>
      <h1>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
      <p className="muted">Customer account for Essa&apos;s Collection</p>
      <form className="card stack" style={{ marginTop: 20 }} onSubmit={onSubmit}>
        {mode === 'register' && (
          <div>
            <label className="label">Full name</label>
            <input className="input" name="fullName" required />
          </div>
        )}
        <div>
          <label className="label">Email</label>
          <input className="input" name="email" type="email" defaultValue="shopper@example.com" required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" name="password" type="password" defaultValue="Password123!" required minLength={8} />
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn">{mode === 'login' ? 'Sign in' : 'Register'}</button>
        <button className="btn secondary" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
        </button>
        <Link href={'/'} className="muted">Back to store</Link>
      </form>
    </main>
  );
}
