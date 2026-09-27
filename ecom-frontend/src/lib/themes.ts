/**
 * Branding defaults per themeKey (colors/fonts).
 * Full UI packs live in src/themes/<key>/ — this file does not define layout.
 */
export type ThemePreset = {
  key: string;
  name: string;
  tagline: string;
  fonts: { heading: string; body: string };
  colors: { primary: string; secondary: string; background: string };
  heroStyle: 'full-bleed' | 'split' | 'bold';
  productCard: 'standard' | 'minimal' | 'overlay';
  density: 'comfortable' | 'airy' | 'compact';
  /** When true, theme uses light text on dark surfaces */
  dark: boolean;
};

export const THEME_PRESETS: Record<string, ThemePreset> = {
  default: {
    key: 'default',
    name: 'Default Store',
    tagline: 'Est. boutique',
    fonts: { heading: 'Cormorant Garamond', body: 'Outfit' },
    colors: { primary: '#0f766e', secondary: '#134e4a', background: '#fbf8f2' },
    heroStyle: 'full-bleed',
    productCard: 'standard',
    density: 'comfortable',
    dark: false,
  },
  'luxury-minimal': {
    key: 'luxury-minimal',
    name: 'Luxury Minimal',
    tagline: 'Fine craft',
    fonts: { heading: 'Cormorant Garamond', body: 'Libre Franklin' },
    colors: { primary: '#8a6a3d', secondary: '#5c4a32', background: '#f7f5f2' },
    heroStyle: 'split',
    productCard: 'minimal',
    density: 'airy',
    dark: false,
  },
  'fashion-bold': {
    key: 'fashion-bold',
    name: 'Fashion Bold',
    tagline: 'New season',
    fonts: { heading: 'Bebas Neue', body: 'DM Sans' },
    colors: { primary: '#e11d48', secondary: '#fb7185', background: '#0a0a0a' },
    heroStyle: 'bold',
    productCard: 'overlay',
    density: 'compact',
    dark: true,
  },
  '3d-fashion': {
    key: '3d-fashion',
    name: '3D Fashion',
    tagline: 'Virtual boutique',
    fonts: { heading: 'Cormorant Garamond', body: 'Outfit' },
    colors: { primary: '#c9894a', secondary: '#e8a87c', background: '#f6ebe3' },
    heroStyle: 'bold',
    productCard: 'overlay',
    density: 'comfortable',
    dark: false,
  },
  essa: {
    key: 'essa',
    name: "Essa's Collection",
    tagline: 'Women’s unstitched elegance',
    fonts: { heading: 'Cormorant Garamond', body: 'Outfit' },
    colors: { primary: '#4A1C28', secondary: '#B08968', background: '#F6F0E8' },
    heroStyle: 'split',
    productCard: 'minimal',
    density: 'airy',
    dark: false,
  },
};

export function getThemePreset(themeKey?: string | null): ThemePreset {
  if (themeKey && THEME_PRESETS[themeKey]) return THEME_PRESETS[themeKey];
  return THEME_PRESETS.default;
}

function parseHex(color: string): { r: number; g: number; b: number } | null {
  const raw = (color || '').trim().replace('#', '');
  if (raw.length === 3) {
    const r = parseInt(raw[0] + raw[0], 16);
    const g = parseInt(raw[1] + raw[1], 16);
    const b = parseInt(raw[2] + raw[2], 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b };
  }
  if (raw.length < 6) return null;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return { r, g, b };
}

function toHex(r: number, g: number, b: number) {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function luminanceOf(color: string) {
  const rgb = parseHex(color);
  if (!rgb) return 0.5;
  // Approximate relative luminance (sRGB channel weights)
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

/** WCAG-style contrast ratio between two hex colors (1–21). */
export function contrastRatio(a: string, b: string) {
  const L1 = luminanceOf(a);
  const L2 = luminanceOf(b);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Mix two hex colors; amount is 0..1 toward `b`. */
export function mixHex(a: string, b: string, amount: number) {
  const A = parseHex(a);
  const B = parseHex(b);
  if (!A || !B) return a || b;
  const t = Math.max(0, Math.min(1, amount));
  return toHex(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t);
}

/** Pick readable ink color from a background hex */
export function inkForBackground(bg: string, preferDarkTheme = false) {
  const lum = luminanceOf(bg || '#fbf8f2');
  if (Number.isNaN(lum)) return preferDarkTheme ? '#fafafa' : '#14110f';
  return lum < 0.55 ? '#fafafa' : '#14110f';
}

/** Keep brand color when contrast vs bg is OK; otherwise darken/lighten brand, then ink. */
export function readableOn(fg: string, bg: string, preferDark = false) {
  if (contrastRatio(fg, bg) >= 4.5) return fg;
  const bgLum = luminanceOf(bg);
  const toward = bgLum >= 0.55 ? '#000000' : '#ffffff';
  for (let a = 0.25; a <= 0.9; a += 0.1) {
    const tuned = mixHex(fg, toward, a);
    if (contrastRatio(tuned, bg) >= 4.5) return tuned;
  }
  return inkForBackground(bg, preferDark);
}

/** Ensure button fill vs label meets WCAG-ish contrast; darken fill if needed. */
export function buttonPair(fill: string, preferDark = false) {
  let bg = fill;
  let fg = inkForBackground(bg, preferDark);
  if (contrastRatio(fg, bg) >= 4.5) return { bg, fg };
  // Fill too light/dark for its label — push fill toward opposite extreme
  const toward = luminanceOf(bg) >= 0.55 ? '#000000' : '#ffffff';
  for (let a = 0.15; a <= 0.75; a += 0.1) {
    bg = mixHex(fill, toward, a);
    fg = inkForBackground(bg, preferDark);
    if (contrastRatio(fg, bg) >= 4.5) return { bg, fg };
  }
  return { bg: preferDark ? '#fafafa' : '#14110f', fg: preferDark ? '#14110f' : '#fafafa' };
}

/** Surfaces + contrast inks derived from brand background / accents. */
export function deriveThemeSurfaces(bg: string, primary: string, secondary: string, preferDark = false) {
  const ink = inkForBackground(bg, preferDark);
  const isDark = ink === '#fafafa';
  const lift = isDark ? '#ffffff' : '#000000';
  const paper = mixHex(bg, lift, isDark ? 0.08 : 0.04);
  const paper2 = mixHex(bg, lift, isDark ? 0.12 : 0.08);
  const card = mixHex(bg, lift, isDark ? 0.1 : 0.06);
  // Stronger muted so body copy doesn't disappear into bg
  const muted = mixHex(ink, bg, isDark ? 0.32 : 0.28);
  const inkSoft = mixHex(ink, bg, 0.12);
  const placeholder = mixHex(bg, ink, isDark ? 0.22 : 0.16);
  const footerBg = isDark
    ? mixHex(bg, '#000000', 0.35)
    : mixHex(mixHex('#14110f', secondary, 0.28), '#0a0908', 0.15);
  const footerInk = inkForBackground(footerBg);
  const footerMuted = mixHex(footerInk, footerBg, 0.35);
  const btn = buttonPair(primary, preferDark);

  return {
    bg,
    ink,
    isDark,
    paper,
    paper2,
    card,
    muted,
    inkSoft,
    placeholder,
    footerBg,
    footerInk,
    footerMuted,
    onPrimary: btn.fg,
    onSecondary: inkForBackground(secondary, preferDark),
    onInk: inkForBackground(ink, preferDark),
    primaryText: readableOn(primary, bg, preferDark),
    secondaryText: readableOn(secondary, bg, preferDark),
    btnBg: btn.bg,
    btnFg: btn.fg,
    line: isDark ? mixHex(bg, '#ffffff', 0.18) : mixHex(bg, ink, 0.16),
    lineStrong: isDark ? mixHex(bg, '#ffffff', 0.28) : mixHex(bg, ink, 0.24),
  };
}

