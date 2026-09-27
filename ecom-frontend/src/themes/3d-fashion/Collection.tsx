'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { ProductCardData } from '@/components/ProductCard';
import { LookCard } from './LookCard';

export default function VirtualBoutiqueCollection() {
  const { tenant, slug } = useParams<{ tenant: string; slug: string }>();
  const [data, setData] = useState<{
    collection: { name: string; description?: string | null };
    products: ProductCardData[];
  } | null>(null);

  useEffect(() => {
    api<typeof data>(`/storefront/collections/${slug}`, {  }).then(setData);
  }, [tenant, slug]);

  if (!data) {
    return (
      <main className="vx-page">
        <div className="vx-loading" style={{ position: 'relative', minHeight: 240 }}>
          Loading collection…
        </div>
      </main>
    );
  }

  return (
    <main className="vx-page">
      <header className="vx-page-head">
        <p className="vx-kicker">Collection</p>
        <h1>{data.collection.name}</h1>
        {data.collection.description && <p>{data.collection.description}</p>}
        <p>{data.products.length} looks</p>
        <Link href={'/shop'} className="vx-btn ghost" style={{ width: 'fit-content' }}>
          All looks
        </Link>
      </header>

      <div className="vx-look-grid">
        {data.products.map((p) => (
          <LookCard key={p.id} tenant={tenant} product={p} />
        ))}
      </div>
      {!data.products.length && <p className="vx-empty">Empty for now.</p>}
    </main>
  );
}
