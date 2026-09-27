'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
    <main className="shell">
      <Link href="/admin" className="muted">← Dashboard</Link>
      <h1 style={{ marginTop: 16 }}>Customers</h1>
      <div className="card" style={{ marginTop: 20 }}>
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
    </main>
  );
}
