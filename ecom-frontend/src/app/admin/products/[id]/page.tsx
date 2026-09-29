'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ProductImageFields } from '@/components/ProductImageFields';

type Product = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
  tags: string[];
  vendor?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  featured: boolean;
  pieceType?: string | null;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  media: Array<{ url: string }>;
  variants: Array<{
    id: string;
    sku: string;
    priceCents: number;
    compareAtCents?: number | null;
    attributeValues: Record<string, string>;
    inventory: Array<{ quantity: number }>;
  }>;
};

type Category = { id: string; name: string; slug?: string; isActive?: boolean };

export default function ProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('staff_token')!;
    Promise.all([
      api<Product>(`/admin/products/${id}`, { token }),
      api<Category[]>('/admin/categories', { token }).catch(() => [] as Category[]),
    ]).then(([p, cats]) => {
      setProduct(p);
      setCategories(cats.filter((c) => c.isActive !== false && !['1-piece', '2-piece', '3-piece', 'dupatta', 'dupattas'].includes(c.slug || '')));
    });
  }, [id]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!product) return;
    const token = localStorage.getItem('staff_token')!;
    const fd = new FormData(e.currentTarget);
    const mediaUrls = String(fd.get('media') || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((url) => ({ url }));
    const categoryId = String(fd.get('categoryId') || '');
    const pieceType = String(fd.get('pieceType') || '');
    if (!pieceType) {
      setMessage('Piece Type is required.');
      return;
    }
    const color = String(fd.get('color') || '');
    const fabricName = categories.find((c) => c.id === categoryId)?.name || product.category?.name || '';
    const extraTags = String(fd.get('tags') || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const tags = [...new Set([
      ...extraTags,
      pieceType,
      color.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      fabricName.toLowerCase(),
      'unstitched',
    ].filter(Boolean))];
    try {
    const updated = await api<Product>(`/admin/products/${id}/full`, {
      token,
      method: 'PUT',
      body: {
        name: fd.get('name'),
        description: fd.get('description'),
        status: fd.get('status'),
        categoryId: categoryId || null,
        vendor: fd.get('vendor') || null,
        tags,
        seoTitle: fd.get('seoTitle') || null,
        seoDescription: fd.get('seoDescription') || null,
        featured: fd.get('featured') === 'on',
        pieceType,
        media: mediaUrls,
        variants: product.variants.map((v, i) => ({
          id: v.id,
          sku: String(fd.get(`sku_${i}`)),
          priceCents: Math.round(Number(fd.get(`price_${i}`)) * 100),
          compareAtCents: fd.get(`compare_${i}`)
            ? Math.round(Number(fd.get(`compare_${i}`)) * 100)
            : null,
          quantity: Number(fd.get(`qty_${i}`) || 0),
          attributeValues: {
            ...v.attributeValues,
            ...(fabricName ? { fabric: fabricName } : {}),
            ...(pieceType
              ? { pieces: pieceType === 'dupatta' ? 'Dupatta' : pieceType.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }
              : {}),
            ...(color ? { color } : {}),
          },
        })),
      },
    });
    setProduct(updated);
    setMessage('Product saved');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    }
  }

  if (!product) return <p>Loading product…</p>;

  return (
    <>
      <Link href="/admin/products" className="muted">← Products</Link>
      <h1 style={{ marginTop: 12 }}>Edit product</h1>
      <p className="muted">/{product.slug}</p>
      {message && <p className={message === 'Product saved' ? 'success' : 'error'}>{message}</p>}
      <form className="stack" style={{ marginTop: 16 }} onSubmit={save}>
        <div className="card stack">
          <h2>Basics</h2>
          <div>
            <label className="label">Product Name</label>
            <input className="input" name="name" defaultValue={product.name} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="textarea" name="description" rows={4} defaultValue={product.description || ''} />
          </div>
          <div className="grid-2">
            <div>
              <label className="label">Status</label>
              <select className="select" name="status" defaultValue={product.status}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="label">Collection</label>
              <input className="input" name="vendor" placeholder="Collection" defaultValue={product.vendor || ''} />
            </div>
          </div>
          <div className="grid-2">
            <div>
              <label className="label">Fabric</label>
              <select
                className="select"
                name="categoryId"
                required
                defaultValue={product.categoryId || product.category?.id || ''}
              >
                <option value="">Select fabric…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Piece Type</label>
              <select
                className="select"
                name="pieceType"
                required
                defaultValue={
                  product.pieceType === 'ONE_PIECE'
                    ? '1-piece'
                    : product.pieceType === 'TWO_PIECE'
                      ? '2-piece'
                      : product.pieceType === 'DUPATTA'
                        ? 'dupatta'
                        : product.pieceType === 'THREE_PIECE'
                          ? '3-piece'
                          : product.tags?.includes('2-piece')
                            ? '2-piece'
                            : product.tags?.includes('1-piece')
                              ? '1-piece'
                              : product.tags?.includes('dupatta')
                                ? 'dupatta'
                                : '3-piece'
                }
              >
                <option value="">Select piece type…</option>
                <option value="1-piece">1 Piece</option>
                <option value="2-piece">2 Piece</option>
                <option value="3-piece">3 Piece</option>
                <option value="dupatta">Dupatta</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Color</label>
            <input
              className="input"
              name="color"
              placeholder="Color"
              defaultValue={product.variants[0]?.attributeValues?.color || ''}
            />
          </div>
          <label className="row"><input type="checkbox" name="featured" defaultChecked={product.featured} /> Featured</label>
          <input className="input" name="tags" placeholder="tags (comma separated)" defaultValue={product.tags?.join(', ')} />
          <ProductImageFields initialUrls={(product.media || []).map((m) => m.url).join('\n')} />
        </div>

        <div className="card stack">
          <h2>SEO</h2>
          <input className="input" name="seoTitle" placeholder="SEO title" defaultValue={product.seoTitle || ''} />
          <textarea className="textarea" name="seoDescription" rows={3} placeholder="SEO description" defaultValue={product.seoDescription || ''} />
        </div>

        <div className="card table-scroll">
          <h2>Variants & inventory</h2>
          <table className="table">
            <thead>
              <tr><th>SKU</th><th>Options</th><th>Price</th><th>Compare</th><th>Qty</th></tr>
            </thead>
            <tbody>
              {product.variants.map((v, i) => (
                <tr key={v.id}>
                  <td><input className="input" name={`sku_${i}`} defaultValue={v.sku} /></td>
                  <td className="muted">{Object.entries(v.attributeValues).map(([k, val]) => `${k}:${val}`).join(' · ')}</td>
                  <td><input className="input" name={`price_${i}`} type="number" step="0.01" defaultValue={(v.priceCents / 100).toFixed(2)} /></td>
                  <td><input className="input" name={`compare_${i}`} type="number" step="0.01" defaultValue={v.compareAtCents ? (v.compareAtCents / 100).toFixed(2) : ''} /></td>
                  <td><input className="input" name={`qty_${i}`} type="number" defaultValue={v.inventory[0]?.quantity ?? 0} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn">Save product</button>
      </form>
    </>
  );
}
