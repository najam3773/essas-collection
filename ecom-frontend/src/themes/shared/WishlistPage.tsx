'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, money } from '@/lib/api';
import { getCustomerToken } from '@/lib/store-auth';

type Wishlist = {
  items: Array<{
    productId: string;
    product: {
      id: string;
      name: string;
      slug: string;
      media?: Array<{ url: string }>;
      variants: Array<{ priceCents: number }>;
    };
  }>;
};

export default function WishlistPage() {
  const { tenant } = useParams<{ tenant: string }>();
  const router = useRouter();
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);

  async function load(token: string) {
    setWishlist(await api<Wishlist>('/storefront/wishlist', { token }));
  }

  useEffect(() => {
    const token = getCustomerToken(tenant);
    if (!token) {
      router.replace('/login');
      return;
    }
    load(token);
  }, [tenant, router]);

  async function remove(productId: string) {
    const token = getCustomerToken(tenant)!;
    await api(`/storefront/wishlist/${productId}`, {
      token,
      method: 'DELETE',
    });
    await load(token);
  }

  if (!wishlist) return <main className="shell">Loading…</main>;

  return (
    <main className="shell">
      <h1>Wishlist</h1>
      <div className="grid-3" style={{ marginTop: 20 }}>
        {wishlist.items.map((item) => (
          <div key={item.productId} className="card stack">
            <div
              className="product-media"
              style={{
                backgroundImage: item.product.media?.[0]?.url
                  ? `url(${item.product.media[0].url})`
                  : undefined,
              }}
            />
            <Link href={`/product/${item.product.slug}`}>
              <strong>{item.product.name}</strong>
            </Link>
            <span>{item.product.variants[0] ? money(item.product.variants[0].priceCents) : ''}</span>
            <button className="btn secondary sm" onClick={() => remove(item.productId)}>Remove</button>
          </div>
        ))}
      </div>
      {!wishlist.items.length && (
        <p className="muted">No saved items. <Link href={'/shop'}>Browse the shop</Link></p>
      )}
    </main>
  );
}
