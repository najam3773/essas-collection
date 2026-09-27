'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { ProductCardData } from '@/components/ProductCard';
import { LookCard } from './LookCard';

export default function VirtualBoutiqueShop() {
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
    p.set('limit', '16');
    return p.toString();
  }, [q, category, sort, page]);

  useEffect(() => {
    api<Array<{ name: string; slug: string }>>('/storefront/categories', {  }).then(setCategories);
  }, [tenant]);

  useEffect(() => {
    api<typeof data>(`/storefront/catalog?${query}`, {  }).then(setData);
  }, [tenant, query]);

  return (
    <main className="vx-page">
      <header className="vx-page-head">
        <p className="vx-kicker">Looks</p>
        <h1>Shop the edit</h1>
        <p>{data.total} pieces styled for the boutique floor</p>
      </header>

      <div className="vx-tools">
        <div className="vx-chips">
          <button
            type="button"
            className={!category ? 'on' : ''}
            onClick={() => {
              setCategory('');
              setPage(1);
            }}
          >
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
        <div className="vx-filters">
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search looks…"
          />
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
            <option value="rating">Top rated</option>
          </select>
        </div>
      </div>

      <div className="vx-look-grid">
        {data.items.map((p) => (
          <LookCard key={p.id} tenant={tenant} product={p} />
        ))}
      </div>

      {!data.items.length && <p className="vx-empty">No looks match.</p>}

      <div className="vx-pager">
        <button type="button" className="vx-btn ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Prev
        </button>
        <span>
          {page} / {data.totalPages || 1}
        </span>
        <button
          type="button"
          className="vx-btn ghost"
          disabled={page >= (data.totalPages || 1)}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </main>
  );
}
