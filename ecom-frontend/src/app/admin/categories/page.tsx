'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { products: number };
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function load(token: string) {
    setCategories(await api<Category[]>('/admin/categories', { token }));
  }

  useEffect(() => {
    const token = localStorage.getItem('staff_token');
    if (!token) return router.replace('/admin/login');
    load(token).catch((e) => setError(e.message));
  }, [router]);

  async function createCategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = localStorage.getItem('staff_token')!;
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    const slug = String(fd.get('slug') || '').trim() || slugify(name);
    try {
      await api('/admin/categories', {
        token,
        body: {
          name,
          slug,
          description: String(fd.get('description') || '') || undefined,
        },
      });
      setShowForm(false);
      setMessage('Category created');
      setError('');
      await load(token);
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function toggleActive(cat: Category) {
    const token = localStorage.getItem('staff_token')!;
    try {
      await api(`/admin/categories/${cat.id}`, {
        token,
        method: 'PATCH',
        body: { isActive: !cat.isActive },
      });
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function removeCategory(id: string) {
    if (!confirm('Delete this category? Products keep their data but lose this category link.')) return;
    const token = localStorage.getItem('staff_token')!;
    try {
      await api(`/admin/categories/${id}`, { token, method: 'DELETE' });
      setMessage('Category deleted');
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <>
      <Link href="/admin/products" className="muted">
        ← Products
      </Link>
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
        <div>
          <h1>Categories</h1>
          <p className="muted">Product types shown on the storefront home, shop filters, and collections.</p>
        </div>
        <button className="btn" type="button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Close' : 'Add category'}
        </button>
      </div>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {showForm && (
        <form className="card stack" style={{ margin: '16px 0', maxWidth: 640 }} onSubmit={createCategory}>
          <div className="grid-2">
            <div>
              <label className="label">Name</label>
              <input className="input" name="name" required placeholder="e.g. Tops" />
            </div>
            <div>
              <label className="label">Slug</label>
              <input className="input" name="slug" placeholder="auto from name" pattern="[a-z0-9-]*" />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="textarea" name="description" rows={2} placeholder="Optional" />
          </div>
          <button className="btn">Create category</button>
        </form>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.name}</strong>
                  {c.description ? <div className="muted" style={{ fontSize: 13 }}>{c.description}</div> : null}
                </td>
                <td className="muted">{c.slug}</td>
                <td>
                  <span className="badge">{c.isActive ? 'Active' : 'Hidden'}</span>
                </td>
                <td className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                  <button className="btn sm secondary" type="button" onClick={() => toggleActive(c)}>
                    {c.isActive ? 'Hide' : 'Show'}
                  </button>
                  <button className="btn sm secondary" type="button" onClick={() => removeCategory(c.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!categories.length && (
              <tr>
                <td colSpan={4} className="muted">
                  No categories yet — add one to start organizing products.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
