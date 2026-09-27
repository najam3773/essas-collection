'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, money } from '@/lib/api';
import { getCompare, toggleCompare } from '@/lib/recently-viewed';

type Product = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  media: Array<{ url: string }>;
  variants: Array<{ priceCents: number; attributeValues: Record<string, string>; inventory: Array<{ quantity: number }> }>;
  avgRating?: number;
  category?: { name: string } | null;
};

export default function ComparePage() {
  const { tenant } = useParams<{ tenant: string }>();
  const [ids, setIds] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const list = getCompare(tenant);
    setIds(list);
    Promise.all(
      list.map((id) =>
        api<{ items: Product[] }>(`/storefront/catalog?limit=50`, {  }).then((c) =>
          c.items.find((p) => p.id === id),
        ),
      ),
    ).then(async (found) => {
      // catalog may not include inventory details — fetch details for accuracy
      const details = await Promise.all(
        list.map(async (id) => {
          const fromCatalog = found.find((p) => p?.id === id);
          if (!fromCatalog) return null;
          try {
            return await api<Product>(`/storefront/products/${fromCatalog.slug}/detail`, {  });
          } catch {
            return fromCatalog as Product;
          }
        }),
      );
      setProducts(details.filter(Boolean) as Product[]);
    });
  }, [tenant]);

  function remove(id: string) {
    const next = toggleCompare(tenant, id);
    setIds(next);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <main className="shell-wide">
      <h1>Compare products</h1>
      <p className="muted">Select up to 4 products from the shop using Compare.</p>
      {!products.length && (
        <p className="muted" style={{ marginTop: 20 }}>
          Nothing to compare yet. <Link href={'/shop'}>Browse products</Link>
        </p>
      )}
      {!!products.length && (
        <div style={{ overflowX: 'auto', marginTop: 20 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Attribute</th>
                {products.map((p) => (
                  <th key={p.id}>
                    <div className="stack">
                      <div
                        className="product-media"
                        style={{
                          width: 140,
                          aspectRatio: '1',
                          backgroundImage: p.media?.[0]?.url ? `url(${p.media[0].url})` : undefined,
                        }}
                      />
                      <Link href={`/product/${p.slug}`}>{p.name}</Link>
                      <button className="btn sm secondary" onClick={() => remove(p.id)}>Remove</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Price</td>
                {products.map((p) => (
                  <td key={p.id}>{p.variants[0] ? money(p.variants[0].priceCents) : '—'}</td>
                ))}
              </tr>
              <tr>
                <td>Category</td>
                {products.map((p) => (
                  <td key={p.id}>{p.category?.name || '—'}</td>
                ))}
              </tr>
              <tr>
                <td>Rating</td>
                {products.map((p) => (
                  <td key={p.id}>{p.avgRating || '—'}</td>
                ))}
              </tr>
              <tr>
                <td>In stock</td>
                {products.map((p) => (
                  <td key={p.id}>
                    {(p.variants[0]?.inventory?.[0]?.quantity ?? 0) > 0 ? 'Yes' : 'No'}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Options</td>
                {products.map((p) => (
                  <td key={p.id}>
                    {Object.entries(p.variants[0]?.attributeValues || {})
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ') || '—'}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Photos</td>
                {products.map((p) => (
                  <td key={p.id}>{p.media?.length || 0}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="muted" style={{ marginTop: 12 }}>Selected: {ids.length}/4</p>
    </main>
  );
}
