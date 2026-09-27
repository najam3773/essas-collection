'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    try {
      const data = await api<{ token: string; bootstrap: unknown }>('/auth/staff/login', {
        body: {
          email: fd.get('email'),
          password: fd.get('password'),
        },
      });
      localStorage.setItem('staff_token', data.token);
      localStorage.setItem('staff_bootstrap', JSON.stringify(data.bootstrap));
      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="panel" style={{ width: 'min(460px, 100%)' }}>
        <p className="eyebrow">Staff admin</p>
        <h1 style={{ marginTop: 0 }}>Essa&apos;s Collection</h1>
        <p className="muted">Sign in to manage the store.</p>
        <form className="stack" style={{ marginTop: 20 }} onSubmit={onSubmit}>
          <div>
            <label className="label">Email</label>
            <input className="input" name="email" type="email" placeholder="owner@essascollection.com" required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" name="password" type="password" required />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn gold" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p style={{ marginTop: 16 }} className="muted">
          <Link href="/">Back to store</Link>
        </p>
      </div>
    </main>
  );
}
