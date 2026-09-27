'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, getCartSession } from '@/lib/api';
import { getCustomerToken } from '@/lib/store-auth';
import { getRecentlyViewed, pushRecentlyViewed } from '@/lib/recently-viewed';
import type { ProductCardData } from '@/components/ProductCard';

export type ProductDetail = {
  id: string;
  name: string;
  description?: string;
  media: Array<{ url: string; alt?: string }>;
  tags?: string[];
  pieceType?: string | null;
  vendor?: string | null;
  avgRating: number;
  reviewCount: number;
  salePercent?: number;
  onSale?: boolean;
  fromPriceCents?: number;
  originalPriceCents?: number;
  category?: { name: string; slug?: string } | null;
  variants: Array<{
    id: string;
    sku: string;
    priceCents: number;
    compareAtCents?: number | null;
    salePriceCents?: number;
    saleOriginalCents?: number;
    salePercent?: number;
    attributeValues: Record<string, string>;
    inventory: Array<{ quantity: number }>;
  }>;
  reviews: Array<{
    id: string;
    authorName: string;
    rating: number;
    title?: string;
    body?: string;
    createdAt: string;
  }>;
  related: ProductCardData[];
};

export function variantLabel(v: ProductDetail['variants'][0]) {
  const attrs = Object.entries(v.attributeValues || {});
  if (!attrs.length) return v.sku;
  return attrs.map(([, val]) => val).join(' · ');
}

/** Shared product-detail data/actions — themes own the markup. */
export function useProductDetail() {
  const { tenant, slug } = useParams<{ tenant: string; slug: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [variantId, setVariantId] = useState('');
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [sizeGuide, setSizeGuide] = useState(false);
  const [recent, setRecent] = useState<ReturnType<typeof getRecentlyViewed>>([]);
  const [token, setToken] = useState<string | null>(null);
  const [addedPulse, setAddedPulse] = useState(false);

  useEffect(() => {
    setToken(getCustomerToken(tenant));
    api<ProductDetail>(`/storefront/products/${slug}/detail`, {  }).then((p) => {
      setProduct(p);
      setVariantId(p.variants[0]?.id || '');
      pushRecentlyViewed(tenant, {
        id: p.id,
        slug,
        name: p.name,
        image: p.media?.[0]?.url,
        priceCents: p.variants[0]?.salePriceCents ?? p.variants[0]?.priceCents,
      });
      setRecent(getRecentlyViewed(tenant).filter((x) => x.slug !== slug));
    });
  }, [tenant, slug]);

  const selected = useMemo(() => product?.variants.find((v) => v.id === variantId), [product, variantId]);
  const displayPrice = selected?.salePriceCents ?? selected?.priceCents;
  const displayOriginal =
    selected?.saleOriginalCents && displayPrice != null && selected.saleOriginalCents > displayPrice
      ? selected.saleOriginalCents
      : selected?.compareAtCents && displayPrice != null && selected.compareAtCents > displayPrice
        ? selected.compareAtCents
        : null;
  const salePercent = selected?.salePercent || product?.salePercent || 0;
  const stock = selected?.inventory?.[0]?.quantity ?? 0;
  const images = (product?.media || []).filter((m) => m.url);
  const attrKeys = useMemo(() => {
    if (!product) return [] as string[];
    const keys = new Set<string>();
    product.variants.forEach((v) => Object.keys(v.attributeValues || {}).forEach((k) => keys.add(k)));
    return [...keys];
  }, [product]);

  async function addToCart() {
    await api('/storefront/cart/items', {
      cartSession: getCartSession(),
      body: { variantId, quantity: qty },
    });
    setMessage('Added to bag');
    setAddedPulse(true);
    setTimeout(() => setAddedPulse(false), 1200);
  }

  async function addWishlist() {
    if (!token) return router.push('/login');
    await api(`/storefront/wishlist/${product!.id}`, { token, method: 'POST', body: {} });
    setMessage('Saved to wishlist');
  }

  async function submitReview(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api(`/storefront/products/${product!.id}/reviews`, {
      token,
      body: {
        authorName: fd.get('authorName'),
        rating,
        title: fd.get('title'),
        body: fd.get('body'),
      },
    });
    const refreshed = await api<ProductDetail>(`/storefront/products/${slug}/detail`, {  });
    setProduct(refreshed);
    setMessage('Review submitted');
    e.currentTarget.reset();
  }

  async function notifyStock() {
    await api('/storefront/stock-notify', {
      body: { variantId, email: notifyEmail },
    });
    setMessage('We’ll notify you when it’s back in stock');
  }

  function share(network: 'copy' | 'x' | 'facebook') {
    if (!product) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (network === 'copy') {
      navigator.clipboard?.writeText(url);
      setMessage('Link copied');
      return;
    }
    const text = encodeURIComponent(product.name);
    const u = encodeURIComponent(url);
    const href =
      network === 'x'
        ? `https://twitter.com/intent/tweet?text=${text}&url=${u}`
        : `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    window.open(href, '_blank', 'noopener,noreferrer');
  }

  return {
    tenant,
    slug,
    product,
    variantId,
    setVariantId,
    qty,
    setQty,
    message,
    rating,
    setRating,
    notifyEmail,
    setNotifyEmail,
    sizeGuide,
    setSizeGuide,
    recent,
    addedPulse,
    selected,
    displayPrice,
    displayOriginal,
    salePercent,
    stock,
    images,
    attrKeys,
    addToCart,
    addWishlist,
    submitReview,
    notifyStock,
    share,
  };
}
