'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, money } from '@/lib/api';
import { ProductImageFields } from '@/components/ProductImageFields';

type Category = { id: string; name: string; slug: string; isActive?: boolean };
type Product = {
  id: string;
  name: string;
  slug: string;
  status: string;
  pieceType?: string | null;
  tags?: string[];
  category?: { id: string; name: string } | null;
  variants: Array<{ sku: string; priceCents: number }>;
};

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function load(token: string) {
    const [prods, cats] = await Promise.all([
      api<Product[]>('/admin/products', { token }),
      api<Category[]>('/admin/categories', { token }).catch(() => [] as Category[]),
    ]);
    setProducts(prods);
    setCategories(cats.filter((c) => c.isActive !== false && !['1-piece', '2-piece', '3-piece', 'dupatta', 'dupattas'].includes(c.slug)));
  }

  useEffect(() => {
    const token = localStorage.getItem('staff_token');
    if (!token) return router.replace('/admin/login');
    load(token).catch((e) => setError(e.message));
  }, [router]);

  async function createProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = localStorage.getItem('staff_token')!;
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name'));
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const categoryId = String(fd.get('categoryId') || '');
    const pieceType = String(fd.get('pieceType') || '');
    if (!pieceType) {
      setError('Piece Type is required.');
      return;
    }
    const color = String(fd.get('color') || '');
    const collection = String(fd.get('collection') || '');
    const fabricName = categories.find((c) => c.id === categoryId)?.name || '';
    const tags = [pieceType, color.toLowerCase().replace(/[^a-z0-9]+/g, '-'), fabricName.toLowerCase(), 'unstitched']
      .filter(Boolean);
    try {
      const media = String(fd.get('media') || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((url, i) => ({ url, alt: `Image ${i + 1}` }));
      const compare = fd.get('compare');
      await api('/admin/products', {
        token,
        body: {
          name,
          slug,
          description: fd.get('description'),
          status: 'active',
          ...(categoryId ? { categoryId } : {}),
          vendor: collection || "Essa's Collection",
          pieceType,
          tags,
          media,
          variants: [
            {
              sku: String(fd.get('sku')),
              priceCents: Math.round(Number(fd.get('price')) * 100),
              compareAtCents: compare ? Math.round(Number(compare) * 100) : undefined,
              quantity: Number(fd.get('quantity') || 0),
              attributeValues: {
                ...(fabricName ? { fabric: fabricName } : {}),
                ...(pieceType ? { pieces: pieceType.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) } : {}),
                ...(color ? { color } : {}),
              },
            },
          ],
        },
      });
      setShowForm(false);
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function removeProduct(id: string) {
    if (!confirm('Delete this product?')) return;
    const token = localStorage.getItem('staff_token')!;
    try {
      await api(`/admin/products/${id}`, { token, method: 'DELETE' });
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <main className="shell">
      <Link href="/admin" className="muted">← Dashboard</Link>
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 0 }}>
        <h1>Products</h1>
        <div className="row">
          <Link className="btn secondary sm" href="/admin/categories">
            Categories
          </Link>
          <a className="btn secondary sm" href="/api/admin/export/products" onClick={(e) => {
            e.preventDefault();
            const token = localStorage.getItem('staff_token');
            fetch('/api/admin/export/products', {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then((r) => r.text())
              .then((csv) => {
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'products.csv';
                a.click();
              });
          }}>Export CSV</a>
          <button className="btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Close' : 'Add product'}
          </button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {showForm && (
        <form className="card stack" style={{ margin: '16px 0' }} onSubmit={createProduct}>
          <div>
            <label className="label">Product Name</label>
            <input className="input" name="name" required />
          </div>
          <div className="grid-2">
            <div>
              <label className="label">Fabric</label>
              <select className="select" name="categoryId" required defaultValue="">
                <option value="">Select fabric…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {!categories.length && (
                <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                  No fabrics yet — <Link href="/admin/categories">create one</Link> first.
                </p>
              )}
            </div>
            <div>
              <label className="label">Piece Type</label>
              <select className="select" name="pieceType" required defaultValue="">
                <option value="">Select piece type…</option>
                <option value="1-piece">1 Piece</option>
                <option value="2-piece">2 Piece</option>
                <option value="3-piece">3 Piece</option>
                <option value="dupatta">Dupatta</option>
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div><label className="label">Color</label><input className="input" name="color" placeholder="Sage Green" /></div>
            <div><label className="label">SKU</label><input className="input" name="sku" required /></div>
          </div>
          <div className="grid-2">
            <div><label className="label">Price (PKR)</label><input className="input" name="price" type="number" step="1" required /></div>
            <div><label className="label">Stock</label><input className="input" name="quantity" type="number" defaultValue={10} /></div>
          </div>
          <div className="grid-2">
            <div><label className="label">Compare-at / discount</label><input className="input" name="compare" type="number" step="1" /></div>
            <div>
              <label className="label">Collection</label>
              <input className="input" name="collection" placeholder="Summer Lawn" />
            </div>
          </div>
          <div><label className="label">Description</label><textarea className="textarea" name="description" rows={3} /></div>
          <ProductImageFields />
          <button className="btn">Create</button>
        </form>
      )}
      <div className="card">
        <table className="table">
          <thead><tr><th>Name</th><th>Fabric</th><th>Piece Type</th><th>Status</th><th>From</th><th>SKU</th><th></th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/admin/products/${p.id}`}><strong>{p.name}</strong></Link></td>
                <td className="muted">{p.category?.name || '—'}</td>
                <td className="muted">{
                  p.pieceType === 'ONE_PIECE' ? '1 Piece'
                    : p.pieceType === 'TWO_PIECE' ? '2 Piece'
                      : p.pieceType === 'THREE_PIECE' ? '3 Piece'
                        : p.pieceType === 'DUPATTA' ? 'Dupatta'
                          : '—'
                }</td>
                <td><span className="badge">{p.status}</span></td>
                <td>{p.variants[0] ? money(p.variants[0].priceCents) : '—'}</td>
                <td className="muted">{p.variants.map((v) => v.sku).join(', ')}</td>
                <td><button className="btn sm secondary" onClick={() => removeProduct(p.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
