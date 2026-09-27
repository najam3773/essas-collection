'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { ProductCardData } from '@/components/ProductCard';
import { FbProductTile } from './ProductTile';

export default function FashionCollection() {
  const { tenant, slug } = useParams<{ tenant: string; slug: string }>();
  const [data, setData] = useState<{
    collection: { name: string; description?: string | null };
    products: ProductCardData[];
  } | null>(null);

  useEffect(() => {
    api<typeof data>(`/storefront/collections/${slug}`, {  }).then(setData);
  }, [tenant, slug]);

  if (!data) return <main className="fb-shop">LOADING…</main>;

  const bg = data.products.find((p) => p.media?.[0]?.url)?.media?.[0]?.url || '';

  return (
    <main className="fb-collection">
      <header className="fb-collection-hero" style={bg ? { backgroundImage: `url(${bg})` } : undefined}>
        <p className="fb-kicker">COLLECTION</p>
        <h1>{data.collection.name.toUpperCase()}</h1>
        {data.collection.description && <p>{data.collection.description}</p>}
        <span>{data.products.length} PIECES</span>
      </header>

      <section className="fb-wall">
        <div className="fb-wall-head">
          <h2>THE EDIT</h2>
          <Link href={'/shop'}>ALL</Link>
        </div>
        <div className="fb-wall-grid">
          {data.products.map((p) => (
            <FbProductTile key={p.id} tenant={tenant} product={p} />
          ))}
        </div>
        {!data.products.length && <p className="muted">EMPTY FOR NOW.</p>}
      </section>
    </main>
  );
}
