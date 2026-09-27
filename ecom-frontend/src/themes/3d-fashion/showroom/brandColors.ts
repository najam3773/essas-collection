'use client';

import { useEffect, useState } from 'react';

export type BrandColors = {
  primary: string;
  secondary: string;
  background: string;
  ink: string;
  paper: string;
};

const FALLBACK: BrandColors = {
  primary: '#c9894a',
  secondary: '#e8a87c',
  background: '#f6ebe3',
  ink: '#2a1812',
  paper: '#fffaf6',
};

function readCssVar(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Live brand tokens from admin settings (applied on :root / .store-root). */
export function useBrandColors(): BrandColors {
  const [colors, setColors] = useState<BrandColors>(FALLBACK);

  useEffect(() => {
    const sync = () => {
      setColors({
        primary: readCssVar('--color-primary', FALLBACK.primary),
        secondary: readCssVar('--color-secondary', FALLBACK.secondary),
        background: readCssVar('--bg', FALLBACK.background),
        ink: readCssVar('--ink', FALLBACK.ink),
        paper: readCssVar('--paper', FALLBACK.paper),
      });
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    const root = document.querySelector('.store-root');
    if (root) obs.observe(root, { attributes: true, attributeFilter: ['style'] });
    return () => obs.disconnect();
  }, []);

  return colors;
}

export function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
  });
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [breakpoint]);
  return mobile;
}

/** Mix hex toward white/black for room materials. */
export function mixHex(hex: string, toward: '#ffffff' | '#000000', amount: number) {
  const parse = (h: string) => {
    const raw = h.replace('#', '');
    if (raw.length < 6) return null;
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
    };
  };
  const a = parse(hex);
  const b = parse(toward);
  if (!a || !b) return hex;
  const t = Math.max(0, Math.min(1, amount));
  const ch = (x: number, y: number) => Math.round(x + (y - x) * t);
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(ch(a.r, b.r))}${h(ch(a.g, b.g))}${h(ch(a.b, b.b))}`;
}
