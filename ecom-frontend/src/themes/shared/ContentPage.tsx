'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

type Page = { title: string; bodyHtml?: string | null; slug: string };

const FALLBACKS: Record<string, Page> = {
  about: {
    title: 'About us',
    slug: 'about',
    bodyHtml:
      '<p>Essa’s Collection is a Pakistani women’s unstitched clothing house — lawn, khaddar, linen, viscose and carefully chosen occasion fabrics, sold as 1, 2 and 3 piece ensembles and standalone dupattas.</p>',
  },
  shipping: {
    title: 'Shipping & Delivery',
    slug: 'shipping',
    bodyHtml:
      '<p>Orders are packed within 1–2 working days. Standard delivery across Pakistan takes 2–5 working days. Complimentary delivery on orders over PKR 8,000.</p>',
  },
  returns: {
    title: 'Returns & Exchange',
    slug: 'returns',
    bodyHtml:
      '<p>Unstitched pieces may be exchanged within 7 days if unused, uncut and in original packing.</p>',
  },
  contact: {
    title: 'Contact Us',
    slug: 'contact',
    bodyHtml: '<p>Write to hello@essascollection.com for fabric advice, orders and delivery updates.</p>',
  },
  'fabric-guide': {
    title: 'Size & Fabric Guide',
    slug: 'fabric-guide',
    bodyHtml:
      '<p>Lawn for summer, khaddar and linen for cooler months, viscose and cotton for everyday, chiffon, silk and organza for dupattas and evenings. All pieces are unstitched.</p>',
  },
  faqs: {
    title: 'FAQs',
    slug: 'faqs',
    bodyHtml:
      '<p>Everything is unstitched. A 3 piece typically includes shirt, trouser and dupatta. A 2 piece includes shirt and trouser.</p>',
  },
};

export default function ContentPageView() {
  const { tenant, slug } = useParams<{ tenant: string; slug: string }>();
  const [page, setPage] = useState<Page | null>(null);

  useEffect(() => {
    api<Page>(`/storefront/pages/${slug}`, {  })
      .then(setPage)
      .catch(() => setPage(FALLBACKS[slug] || { title: slug, slug, bodyHtml: '<p>Page coming soon.</p>' }));
  }, [tenant, slug]);

  if (!page) return <main className="shell">Loading…</main>;

  return (
    <main className="shell" style={{ maxWidth: 760 }}>
      <h1>{page.title}</h1>
      <div
        className="card"
        style={{ marginTop: 20, lineHeight: 1.7 }}
        dangerouslySetInnerHTML={{ __html: page.bodyHtml || '' }}
      />
    </main>
  );
}
