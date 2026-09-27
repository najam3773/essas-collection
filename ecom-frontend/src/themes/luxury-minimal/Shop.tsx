'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { ProductCardData } from '@/components/ProductCard';
import { LuxProductTile } from './ProductTile';

export default function LuxuryShop() {
  const { tenant } = useParams<{ tenant: string }>();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || '');
  const [category, setCategory] = useState(sp.get('category') || '');
  const [sort, setSort] = useState(sp.get('sort') || 'newest');
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<Array<{ name: string; slug: string }>>([]);
  const [data, setData] = useState<{ items: ProductCardData[]; total: number; totalPages: number }>({
    items: [],
    total: 0,
    totalPages: 1,
  });

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (category) p.set('category', category);
    if (sort) p.set('sort', sort);
    p.set('page', String(page));
    p.set('limit', '10');
    return p.toString();
  }, [q, category, sort, page]);

  useEffect(() => {
    api<Array<{ name: string; slug: string }>>('/storefront/categories', {  }).then(setCategories);
  }, [tenant]);

  useEffect(() => {
    api<typeof data>(`/storefront/catalog?${query}`, {  }).then(setData);
  }, [tenant, query]);

  return (
    <main className="lux-shop">
      <header className="lux-shop-hero">
        <p className="lux-eyebrow">Catalog</p>
        <h1>Shop</h1>
        <p>{data.total} pieces in the current edit</p>
      </header>

      <div className="lux-shop-bar">
        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder="Search the collection"
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="name">Name</option>
        </select>
      </div>

      <div className="lux-shop-cats">
        <button type="button" className={!category ? 'on' : ''} onClick={() => { setCategory(''); setPage(1); }}>
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            type="button"
            className={category === c.slug ? 'on' : ''}
            onClick={() => {
              setCategory(c.slug);
              setPage(1);
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="lux-shop-grid">
        {data.items.map((p) => (
          <LuxProductTile key={p.id} tenant={tenant} product={p} />
        ))}
      </div>
      {!data.items.length && <p className="muted">No products match.</p>}

      <div className="lux-pager">
        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>
          {page} / {data.totalPages || 1}
        </span>
        <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>

      <p className="lux-shop-foot">
        Prefer a quieter browse?{' '}
        <Link href={`/pages/about`}>Read our atelier story</Link>
      </p>
    </main>
  );
}
