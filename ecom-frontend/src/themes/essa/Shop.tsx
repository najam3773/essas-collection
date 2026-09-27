'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { ProductCardData } from '@/components/ProductCard';
import { COLOR_FILTERS, FABRIC_FILTERS, PIECE_FILTERS } from '@/lib/unstitched';
import { EssaProductTile } from './ProductTile';

type CatalogProduct = ProductCardData & { tags?: string[] };

export default function EssaShop() {
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || '');
  const [category, setCategory] = useState(sp.get('category') || '');
  const [pieces, setPieces] = useState(sp.get('pieces') || sp.get('tag') || '');
  const [color, setColor] = useState(sp.get('color') || '');
  const [minPrice, setMinPrice] = useState(sp.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(sp.get('maxPrice') || '');
  const [sort, setSort] = useState(sp.get('sort') || 'newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ items: CatalogProduct[]; total: number; totalPages: number }>({
    items: [],
    total: 0,
    totalPages: 1,
  });

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (category) p.set('category', category);
    if (pieces) p.set('pieces', pieces);
    if (color) p.set('color', color);
    if (sort) p.set('sort', sort);
    if (minPrice) p.set('minPrice', minPrice);
    if (maxPrice) p.set('maxPrice', maxPrice);
    p.set('page', String(page));
    p.set('limit', '12');
    return p.toString();
  }, [q, category, pieces, color, sort, minPrice, maxPrice, page]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<typeof data>(`/storefront/catalog?${query}`)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <main className="essa-shop">
      <header className="essa-shop-hero">
        <p className="essa-eyebrow">The collection</p>
        <h1>Shop unstitched</h1>
        <p>{loading ? 'Loading the collection…' : `${data.total} pieces in lawn, khaddar, linen, viscose and more`}</p>
      </header>

      <div className="essa-shop-layout">
        <aside className="essa-filters">
          <label>
            Search
            <input
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="lawn, 3 piece, embroidered…"
            />
          </label>
          <fieldset>
            <legend>Fabric</legend>
            <button type="button" className={!category ? 'on' : ''} onClick={() => { setCategory(''); setPage(1); }}>
              All
            </button>
            {FABRIC_FILTERS.map((f) => (
              <button
                key={f.slug}
                type="button"
                className={category === f.slug ? 'on' : ''}
                onClick={() => {
                  setCategory(f.slug);
                  setPage(1);
                }}
              >
                {f.name}
              </button>
            ))}
          </fieldset>
          <fieldset>
            <legend>Piece Type</legend>
            <button type="button" className={!pieces ? 'on' : ''} onClick={() => { setPieces(''); setPage(1); }}>
              All
            </button>
            {PIECE_FILTERS.map((p) => (
              <button
                key={p.slug}
                type="button"
                className={pieces === p.slug ? 'on' : ''}
                onClick={() => {
                  setPieces(p.slug);
                  setPage(1);
                }}
              >
                {p.name}
              </button>
            ))}
          </fieldset>
          <fieldset>
            <legend>Color</legend>
            <button type="button" className={!color ? 'on' : ''} onClick={() => { setColor(''); setPage(1); }}>
              All
            </button>
            {COLOR_FILTERS.map((c) => (
              <button
                key={c}
                type="button"
                className={color === c ? 'on' : ''}
                onClick={() => {
                  setColor(c);
                  setPage(1);
                }}
              >
                {c.replace(/-/g, ' ')}
              </button>
            ))}
          </fieldset>
          <div className="essa-price-fields">
            <legend>Price (PKR)</legend>
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => {
                setMinPrice(e.target.value);
                setPage(1);
              }}
            />
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </aside>

        <div>
          <div className="essa-shop-bar">
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest</option>
              <option value="price_asc">Price ↑</option>
              <option value="price_desc">Price ↓</option>
              <option value="name">Name</option>
            </select>
          </div>
          <div className="essa-product-grid">
            {data.items.map((p) => (
              <EssaProductTile key={p.id} tenant="" product={p} />
            ))}
          </div>
          {!loading && !data.items.length && <p className="muted">No products match these filters.</p>}
          <div className="essa-pager">
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
        </div>
      </div>
    </main>
  );
}
