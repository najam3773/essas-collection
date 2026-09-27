/** Default branding applied when a theme is assigned to a tenant. */
export const THEME_PRESETS: Record<
  string,
  {
    fonts: { heading: string; body: string };
    colors: { primary: string; secondary: string; background: string };
  }
> = {
  default: {
    fonts: { heading: 'Cormorant Garamond', body: 'Outfit' },
    colors: { primary: '#0f766e', secondary: '#134e4a', background: '#fbf8f2' },
  },
  'luxury-minimal': {
    fonts: { heading: 'Cormorant Garamond', body: 'Libre Franklin' },
    colors: { primary: '#1c1917', secondary: '#78716c', background: '#f7f5f2' },
  },
  'fashion-bold': {
    fonts: { heading: 'Bebas Neue', body: 'DM Sans' },
    colors: { primary: '#e11d48', secondary: '#fb7185', background: '#0a0a0a' },
  },
  '3d-fashion': {
    fonts: { heading: 'Cormorant Garamond', body: 'Outfit' },
    colors: { primary: '#c9894a', secondary: '#e8a87c', background: '#f6ebe3' },
  },
  essa: {
    fonts: { heading: 'Cormorant Garamond', body: 'Outfit' },
    colors: { primary: '#4A1C28', secondary: '#B08968', background: '#F6F0E8' },
  },
};

export function getThemePreset(themeKey?: string | null) {
  return THEME_PRESETS[themeKey || ''] || THEME_PRESETS.default;
}
