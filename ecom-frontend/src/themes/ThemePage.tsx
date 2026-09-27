'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { useThemeRuntimeOptional } from './context';
import { loadThemePack } from './registry';
import type { ThemePageName } from './types';

/**
 * Renders a named page from the active theme pack.
 * Falls back to the default pack if the active pack omits that page.
 */
export function ThemePage({ name }: { name: ThemePageName }) {
  const runtime = useThemeRuntimeOptional();
  const [Fallback, setFallback] = useState<ComponentType | null>(null);

  const Page = runtime?.pack.pages[name];

  useEffect(() => {
    if (Page || !runtime) return;
    let cancelled = false;
    loadThemePack('default').then((pack) => {
      if (!cancelled) setFallback(() => pack.pages[name] || null);
    });
    return () => {
      cancelled = true;
    };
  }, [Page, runtime, name]);

  const Resolved = Page || Fallback;
  if (!Resolved) {
    return (
      <main className="shell" style={{ minHeight: '40vh', display: 'grid', placeItems: 'center' }}>
        <p className="muted">Loading…</p>
      </main>
    );
  }
  return <Resolved />;
}
