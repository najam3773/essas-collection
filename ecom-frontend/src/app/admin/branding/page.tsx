'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type Branding = {
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor?: string;
  fontHeading: string;
  fontBody: string;
  logoUrl?: string;
  customCss?: string;
  theme?: { themeKey: string; name: string } | null;
};

export default function BrandingPage() {
  const router = useRouter();
  const [branding, setBranding] = useState<Branding | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('staff_token');
    if (!token) return router.replace('/admin/login');
    api<Branding>('/admin/branding', { token }).then(setBranding).catch((e) => setError(e.message));
  }, [router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = localStorage.getItem('staff_token')!;
    const fd = new FormData(e.currentTarget);
    try {
      const updated = await api<Branding>('/admin/branding', {
        token,
        method: 'PUT',
        body: {
          brandName: fd.get('brandName'),
          primaryColor: fd.get('primaryColor'),
          secondaryColor: fd.get('secondaryColor'),
          backgroundColor: fd.get('backgroundColor'),
          fontHeading: fd.get('fontHeading'),
          fontBody: fd.get('fontBody'),
          logoUrl: fd.get('logoUrl') || undefined,
          customCss: fd.get('customCss') || undefined,
        },
      });
      setBranding(updated);
      setMessage('Branding saved — brand name updates on the storefront immediately');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  if (!branding) return <p>{error || 'Loading…'}</p>;

  return (
    <>
      <h1>Theme & branding</h1>
      <p className="muted">
        Colors, fonts, and logo overlay your active UI theme pack
        {branding.theme?.name ? ` (${branding.theme.name})` : ''}. Layout and page structure come from the
        pack — switch packs in Platform → Tenants.
      </p>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
      <form className="card stack" style={{ marginTop: 16, maxWidth: 720 }} onSubmit={onSubmit}>
        <div>
          <label className="label">Brand name</label>
          <input className="input" name="brandName" defaultValue={branding.brandName} />
        </div>
        <div className="grid-2">
          <div>
            <label className="label">Primary color</label>
            <input className="input" name="primaryColor" type="color" defaultValue={branding.primaryColor || '#0f766e'} />
          </div>
          <div>
            <label className="label">Secondary color</label>
            <input className="input" name="secondaryColor" type="color" defaultValue={branding.secondaryColor || '#134e4a'} />
          </div>
        </div>
        <div>
          <label className="label">Background color</label>
          <input
            className="input"
            name="backgroundColor"
            type="color"
            defaultValue={branding.backgroundColor || '#fbf8f2'}
          />
          <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            Page background for your store. Theme pack still controls layout style (luxury / bold / default).
          </p>
        </div>
        <div className="grid-2">
          <div>
            <label className="label">Heading font</label>
            <input className="input" name="fontHeading" defaultValue={branding.fontHeading} />
          </div>
          <div>
            <label className="label">Body font</label>
            <input className="input" name="fontBody" defaultValue={branding.fontBody} />
          </div>
        </div>
        <div>
          <label className="label">Logo URL</label>
          <input className="input" name="logoUrl" defaultValue={branding.logoUrl || ''} />
        </div>
        <div>
          <label className="label">Custom CSS (Enterprise entitlement)</label>
          <textarea className="textarea" name="customCss" rows={4} defaultValue={branding.customCss || ''} />
        </div>
        <button className="btn">Save branding</button>
      </form>
    </>
  );
}
