'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { ProductCardData } from '@/components/ProductCard';
import { EssaProductTile } from './ProductTile';

type CatalogProduct = ProductCardData & { tags?: string[] };

export default function EssaCollection() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<{
    collection: { name: string; description?: string | null };
    products: CatalogProduct[];
  } | null>(null);

  useEffect(() => {
    api<typeof data>(`/storefront/collections/${slug}`).then(setData);
  }, [slug]);

  if (!data) return <main className="essa-shop">Loading collection…</main>;

  return (
    <main className="essa-collection">
      <header className="essa-shop-hero">
        <p className="essa-eyebrow">Collection</p>
        <h1>{data.collection.name}</h1>
        {data.collection.description ? <p>{data.collection.description}</p> : null}
        <span>{data.products.length} pieces</span>
      </header>
      <div className="essa-section">
        <div className="essa-product-grid">
          {data.products.map((p) => (
            <EssaProductTile key={p.id} tenant="" product={p} />
          ))}
        </div>
        {!data.products.length && <p className="muted">No products in this collection yet.</p>}
        <p className="essa-shop-foot">
          <Link href="/shop">Browse the full collection</Link>
        </p>
      </div>
    </main>
  );
}
