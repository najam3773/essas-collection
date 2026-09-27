'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ProductCard, type ProductCardData } from '@/components/ProductCard';

export default function CollectionPage() {
  const { tenant, slug } = useParams<{ tenant: string; slug: string }>();
  const [data, setData] = useState<{
    collection: { name: string; description?: string | null };
    products: ProductCardData[];
  } | null>(null);

  useEffect(() => {
    api<typeof data>(`/storefront/collections/${slug}`, {  }).then(setData);
  }, [tenant, slug]);

  if (!data) return <main className="shell">Loading collection…</main>;

  const bg = data.products.find((p) => p.media?.[0]?.url)?.media?.[0]?.url || '';

  return (
    <main className="shell-wide">
      <div
        className="page-hero"
        style={
          bg
            ? { backgroundImage: `url(${bg})` }
            : {
                background: `linear-gradient(135deg, color-mix(in srgb, var(--color-secondary) 55%, #14110f), color-mix(in srgb, var(--color-primary) 45%, #3d2b1f))`,
              }
        }
      >
        <p className="eyebrow" style={{ color: 'rgba(255,255,255,.75)' }}>Collection</p>
        <h1>{data.collection.name}</h1>
        {data.collection.description && (
          <p style={{ margin: '8px 0 0', maxWidth: 480, opacity: 0.92 }}>{data.collection.description}</p>
        )}
        <p style={{ margin: '10px 0 0', opacity: 0.8 }}>{data.products.length} products</p>
      </div>

      <div className="section-head" style={{ marginTop: 8 }}>
        <div>
          <p className="eyebrow">The edit</p>
          <h2>Curated pieces</h2>
        </div>
        <Link href={'/shop'} className="btn secondary sm">
          Shop all
        </Link>
      </div>

      <div className="grid-3">
        {data.products.map((p) => (
          <ProductCard key={p.id} tenant={tenant} product={p} />
        ))}
      </div>
      {!data.products.length && <p className="muted">No products in this collection yet.</p>}
    </main>
  );
}
