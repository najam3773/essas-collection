'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ProductCard, type ProductCardData } from '@/components/ProductCard';

export default function ShopPage() {
  const { tenant } = useParams<{ tenant: string }>();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || '');
  const [category, setCategory] = useState(sp.get('category') || '');
  const [sort, setSort] = useState(sp.get('sort') || 'newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
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
    if (minPrice) p.set('minPrice', minPrice);
    if (maxPrice) p.set('maxPrice', maxPrice);
    p.set('page', String(page));
    p.set('limit', '12');
    return p.toString();
  }, [q, category, sort, minPrice, maxPrice, page]);

  useEffect(() => {
    api<Array<{ name: string; slug: string }>>('/storefront/categories', {  }).then(setCategories);
  }, [tenant]);

  useEffect(() => {
    api<typeof data>(`/storefront/catalog?${query}`, {  }).then(setData);
  }, [tenant, query]);

  return (
    <main className="shell-wide">
      <div
        className="page-hero"
        style={
          data.items[0]?.media?.[0]?.url
            ? { backgroundImage: `url(${data.items[0].media[0].url})` }
            : {
                background: `linear-gradient(135deg, color-mix(in srgb, var(--color-secondary) 55%, #14110f), color-mix(in srgb, var(--color-primary) 45%, #3d2b1f))`,
              }
        }
      >
        <p className="eyebrow" style={{ color: 'rgba(255,255,255,.75)' }}>Catalog</p>
        <h1>Shop all</h1>
        <p style={{ margin: '8px 0 0', maxWidth: 420, opacity: 0.9 }}>
          Filter by collection, price, and rating — {data.total} pieces available.
        </p>
      </div>

      <div className="shop-layout">
        <aside className="filters">
          <div>
            <h3>Search</h3>
            <input
              className="input"
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Search the edit…"
            />
          </div>
          <div className="filter-group">
            <h3>Category</h3>
            <select
              className="select"
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
            <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              <button className={`btn sm ${!category ? 'gold' : 'secondary'}`} type="button" onClick={() => { setCategory(''); setPage(1); }}>
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  className={`btn sm ${category === c.slug ? 'gold' : 'secondary'}`}
                  onClick={() => {
                    setCategory(c.slug);
                    setPage(1);
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <h3>Price</h3>
            <div className="row">
              <input className="input" type="number" placeholder="Min" value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} />
              <input className="input" type="number" placeholder="Max" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} />
            </div>
          </div>
          <div className="filter-group">
            <h3>Sort</h3>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to high</option>
              <option value="price_desc">Price: High to low</option>
              <option value="rating">Top rated</option>
              <option value="name">Name</option>
            </select>
          </div>
        </aside>

        <section>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18 }}>
            <p className="muted" style={{ margin: 0 }}>{data.total} products</p>
          </div>
          <div className="grid-3">
            {data.items.map((p) => (
              <ProductCard key={p.id} tenant={tenant} product={p} />
            ))}
          </div>
          {!data.items.length && <p className="muted" style={{ marginTop: 24 }}>No products match your filters.</p>}
          <div className="row" style={{ marginTop: 28, justifyContent: 'center' }}>
            <button className="btn secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span className="muted">Page {page} / {data.totalPages || 1}</span>
            <button className="btn secondary" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </section>
      </div>
    </main>
  );
}
