'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setStoreCurrency } from '@/lib/api';
import { brandingCssVars, googleFontsHref } from './branding-style';
import { ThemeRuntimeContext } from './context';
import { loadThemePack } from './registry';
import type { StoreTheme, StorefrontContext } from './types';

export function ThemeHostLayout({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<StorefrontContext | null>(null);
  const [pack, setPack] = useState<StoreTheme | null>(null);
  const [mounted, setMounted] = useState(false);

  const themeKey = context?.branding?.theme?.themeKey || 'essa';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    api<StorefrontContext>('/storefront/context')
      .then(setContext)
      .catch(console.error);
    api<{ currency?: string }>('/storefront/settings')
      .then((s) => {
        if (s.currency) setStoreCurrency(s.currency);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadThemePack(themeKey).then((p) => {
      if (!cancelled) setPack(p);
    });
    return () => {
      cancelled = true;
    };
  }, [themeKey]);

  const branding = useMemo(
    () => brandingCssVars(context?.branding, themeKey, pack?.dark),
    [
      context?.branding?.primaryColor,
      context?.branding?.secondaryColor,
      context?.branding?.backgroundColor,
      context?.branding?.fontHeading,
      context?.branding?.fontBody,
      context?.branding?.brandName,
      themeKey,
      pack?.dark,
    ],
  );
  const fontQuery = googleFontsHref(branding.headingFont, branding.bodyFont);

  useEffect(() => {
    if (!fontQuery) return;
    const id = 'store-google-fonts';
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?${fontQuery}&display=swap`;
  }, [fontQuery]);

  useEffect(() => {
    const root = document.documentElement;
    const entries = Object.entries(branding.vars);
    for (const [key, value] of entries) root.style.setProperty(key, value);
    return () => {
      for (const [key] of entries) root.style.removeProperty(key);
    };
  }, [branding.vars]);

  if (!mounted || !pack) {
    return (
      <div className="store-root" style={{ minHeight: '40vh', display: 'grid', placeItems: 'center' }}>
        <p className="muted">Loading store…</p>
      </div>
    );
  }

  const Layout = pack.Layout;
  const tenant = context?.tenant?.slug || 'essas-collection';

  return (
    <ThemeRuntimeContext.Provider value={{ tenant, themeKey, pack, context }}>
      <div
        className={`store-root theme-pack-${pack.key}${branding.surfaces.isDark ? ' theme-dark' : ''}`}
        data-theme={pack.key}
        style={branding.vars}
      >
        {context?.branding?.customCss ? <style>{context.branding.customCss}</style> : null}
        <Layout tenant={tenant} context={context}>
          {children}
        </Layout>
      </div>
    </ThemeRuntimeContext.Provider>
  );
}
