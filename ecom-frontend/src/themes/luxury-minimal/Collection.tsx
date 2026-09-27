'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { ProductCardData } from '@/components/ProductCard';
import { LuxProductTile } from './ProductTile';

export default function LuxuryCollection() {
  const { tenant, slug } = useParams<{ tenant: string; slug: string }>();
  const [data, setData] = useState<{
    collection: { name: string; description?: string | null };
    products: ProductCardData[];
  } | null>(null);

  useEffect(() => {
    api<typeof data>(`/storefront/collections/${slug}`, {  }).then(setData);
  }, [tenant, slug]);

  if (!data) return <main className="lux-shop">Loading collection…</main>;

  const bg = data.products.find((p) => p.media?.[0]?.url)?.media?.[0]?.url || '';

  return (
    <main className="lux-collection">
      <header className="lux-collection-hero" style={bg ? { backgroundImage: `url(${bg})` } : undefined}>
        <div>
          <p className="lux-eyebrow">Collection</p>
          <h1>{data.collection.name}</h1>
          {data.collection.description && <p>{data.collection.description}</p>}
          <span>{data.products.length} pieces</span>
        </div>
      </header>

      <div className="lux-section">
        <div className="lux-section-head">
          <div>
            <p className="lux-eyebrow">The edit</p>
            <h2>Curated pieces</h2>
          </div>
          <Link href={'/shop'}>Shop all</Link>
        </div>
        <div className="lux-shop-grid">
          {data.products.map((p) => (
            <LuxProductTile key={p.id} tenant={tenant} product={p} />
          ))}
        </div>
        {!data.products.length && <p className="muted">No products in this collection yet.</p>}
      </div>
    </main>
  );
}
