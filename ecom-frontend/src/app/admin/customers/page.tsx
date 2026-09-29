'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function AdminCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Array<{ id: string; email: string; fullName?: string; createdAt: string }>>([]);

  useEffect(() => {
    const token = localStorage.getItem('staff_token');
    if (!token) return router.replace('/admin/login');
    api<typeof customers>('/admin/customers', { token }).then(setCustomers);
  }, [router]);

  return (
    <>
      <h1 style={{ marginTop: 0 }}>Customers</h1>
      <div className="admin-card-list">
        {customers.map((c) => (
          <article key={c.id} className="admin-entity-card">
            <div className="admin-entity-card-head">
              <strong>{c.fullName || '—'}</strong>
            </div>
            <div className="admin-entity-meta">
              <span>{c.email}</span>
              <span className="muted">Joined {new Date(c.createdAt).toLocaleDateString()}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="card table-scroll admin-desktop-table" style={{ marginTop: 20 }}>
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Joined</th></tr></thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.fullName || '—'}</td>
                <td>{c.email}</td>
                <td>{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
