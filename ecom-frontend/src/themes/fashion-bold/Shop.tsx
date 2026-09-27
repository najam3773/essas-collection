'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { ProductCardData } from '@/components/ProductCard';
import { FbProductTile } from './ProductTile';

export default function FashionShop() {
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
    <main className="fb-shop">
      <h1>SHOP</h1>
      <p className="fb-shop-count">{data.total} PIECES</p>

      <div className="fb-chips">
        <button type="button" className={!category ? 'on' : ''} onClick={() => { setCategory(''); setPage(1); }}>
          ALL
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
            {c.name.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="fb-shop-tools">
        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder="SEARCH"
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">NEWEST</option>
          <option value="price_asc">PRICE ↑</option>
          <option value="price_desc">PRICE ↓</option>
          <option value="rating">TOP RATED</option>
        </select>
      </div>

      <div className="fb-wall-grid">
        {data.items.map((p) => (
          <FbProductTile key={p.id} tenant={tenant} product={p} />
        ))}
      </div>
      {!data.items.length && <p className="muted">NO MATCHES.</p>}

      <div className="fb-pager">
        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          PREV
        </button>
        <span>
          {page}/{data.totalPages || 1}
        </span>
        <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
          NEXT
        </button>
      </div>
    </main>
  );
}
