import { deriveThemeSurfaces, getThemePreset } from '@/lib/themes';
import type { ThemeBranding } from './types';

export function brandingCssVars(
  branding: ThemeBranding | null | undefined,
  themeKey: string,
  preferDark = false,
) {
  const preset = getThemePreset(themeKey);
  const primary = branding?.primaryColor || preset.colors.primary;
  const secondary = branding?.secondaryColor || preset.colors.secondary;
  const bg = branding?.backgroundColor || preset.colors.background;
  const headingFont = branding?.fontHeading || preset.fonts.heading;
  const bodyFont = branding?.fontBody || preset.fonts.body;
  const surfaces = deriveThemeSurfaces(bg, primary, secondary, preferDark || preset.dark);

  return {
    vars: {
      ['--color-primary' as string]: primary,
      ['--color-secondary' as string]: secondary,
      ['--bg' as string]: surfaces.bg,
      ['--cream' as string]: surfaces.bg,
      ['--paper' as string]: surfaces.paper,
      ['--paper-2' as string]: surfaces.paper2,
      ['--card' as string]: surfaces.card,
      ['--ink' as string]: surfaces.ink,
      ['--ink-soft' as string]: surfaces.inkSoft,
      ['--muted' as string]: surfaces.muted,
      ['--line' as string]: surfaces.line,
      ['--line-strong' as string]: surfaces.lineStrong,
      ['--placeholder' as string]: surfaces.placeholder,
      ['--on-primary' as string]: surfaces.onPrimary,
      ['--on-secondary' as string]: surfaces.onSecondary,
      ['--on-ink' as string]: surfaces.onInk,
      ['--primary-text' as string]: surfaces.primaryText,
      ['--secondary-text' as string]: surfaces.secondaryText,
      ['--btn-bg' as string]: surfaces.btnBg,
      ['--btn-fg' as string]: surfaces.btnFg,
      ['--footer-bg' as string]: surfaces.footerBg,
      ['--footer-ink' as string]: surfaces.footerInk,
      ['--footer-muted' as string]: surfaces.footerMuted,
      ['--font-heading' as string]: `'${headingFont}', Georgia, serif`,
      ['--font-display' as string]: `'${headingFont}', Georgia, serif`,
      ['--font-body' as string]: `'${bodyFont}', system-ui, sans-serif`,
    } as Record<string, string>,
    surfaces,
    headingFont,
    bodyFont,
    brand: branding?.brandName || '',
  };
}

export function googleFontsHref(headingFont: string, bodyFont: string) {
  return [headingFont, bodyFont]
    .filter(Boolean)
    .map((f) => {
      const family = encodeURIComponent(f).replace(/%20/g, '+');
      if (f === 'Bebas Neue') return `family=${family}`;
      return `family=${family}:wght@300;400;500;600;700`;
    })
    .join('&');
}
