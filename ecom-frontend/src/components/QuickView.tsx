'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getCartSession, money } from '@/lib/api';
import { ProductGallery } from '@/components/ProductGallery';

type Detail = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  media: Array<{ url: string; alt?: string }>;
  variants: Array<{
    id: string;
    priceCents: number;
    compareAtCents?: number | null;
    attributeValues: Record<string, string>;
    inventory: Array<{ quantity: number }>;
  }>;
};

export function QuickView({
  tenant,
  slug,
  onClose,
}: {
  tenant: string;
  slug: string;
  onClose: () => void;
}) {
  const [product, setProduct] = useState<Detail | null>(null);
  const [variantId, setVariantId] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api<Detail>(`/storefront/products/${slug}/detail`, {  })
      .then((p) => {
        setProduct(p);
        setVariantId(p.variants[0]?.id || '');
      })
      .catch((e) => setMsg(e instanceof Error ? e.message : 'Failed to load'));
  }, [tenant, slug]);

  if (!product) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-card">{msg || 'Loading…'}</div>
      </div>
    );
  }

  const selected = product.variants.find((v) => v.id === variantId);
  const stock = selected?.inventory?.[0]?.quantity ?? 0;

  async function add() {
    await api('/storefront/cart/items', {
      cartSession: getCartSession(),
      body: { variantId, quantity: 1 },
    });
    setMsg('Added to cart');
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>{product.name}</h2>
          <button className="btn secondary sm" onClick={onClose}>Close</button>
        </div>
        <div className="grid-2" style={{ marginTop: 16, alignItems: 'start' }}>
          <ProductGallery images={product.media || []} alt={product.name} />
          <div className="stack">
            <div style={{ fontSize: '1.35rem' }}>
              {selected ? money(selected.priceCents) : ''}
              {selected?.compareAtCents && selected.compareAtCents > selected.priceCents && (
                <span className="compare">{money(selected.compareAtCents)}</span>
              )}
            </div>
            <p className="muted">{product.description}</p>
            <select className="select" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
              {product.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {Object.entries(v.attributeValues).map(([k, val]) => `${k}: ${val}`).join(' · ') || 'Default'}
                </option>
              ))}
            </select>
            <button className="btn" disabled={stock < 1} onClick={add}>Add to cart</button>
            <Link href={`/product/${product.slug}`} onClick={onClose}>
              View full details →
            </Link>
            {msg && <p className="success">{msg}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
