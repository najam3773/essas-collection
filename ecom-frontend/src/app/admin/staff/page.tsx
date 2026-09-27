'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Staff = { id: string; email: string; fullName: string; role?: { name: string; id: string } | null };
type Role = { id: string; name: string; key: string };

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState('');

  async function load() {
    const token = localStorage.getItem('staff_token')!;
    try {
      setStaff(await api<Staff[]>('/admin/staff', { token }));
      setRoles(await api<Role[]>('/admin/roles', { token }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function invite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = localStorage.getItem('staff_token')!;
    const fd = new FormData(e.currentTarget);
    await api('/admin/staff', {
      token,
      body: {
        email: fd.get('email'),
        fullName: fd.get('fullName'),
        password: fd.get('password'),
        roleId: fd.get('roleId'),
      },
    });
    e.currentTarget.reset();
    await load();
  }

  async function remove(id: string) {
    if (!confirm('Remove this staff member?')) return;
    const token = localStorage.getItem('staff_token')!;
    await api(`/admin/staff/${id}`, { token, method: 'DELETE' });
    await load();
  }

  return (
    <>
      <h1>Staff & roles</h1>
      {error && <p className="error">{error}</p>}
      <form className="card stack" style={{ marginTop: 16, maxWidth: 560 }} onSubmit={invite}>
        <h2>Invite staff</h2>
        <input className="input" name="fullName" placeholder="Full name" required />
        <input className="input" name="email" type="email" placeholder="Email" required />
        <input className="input" name="password" type="password" placeholder="Temp password" minLength={8} required />
        <select className="select" name="roleId" required>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <button className="btn">Add staff</button>
      </form>
      <div className="card" style={{ marginTop: 16 }}>
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td>{s.fullName}</td>
                <td>{s.email}</td>
                <td><span className="badge">{s.role?.name || '—'}</span></td>
                <td><button className="btn sm secondary" onClick={() => remove(s.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
