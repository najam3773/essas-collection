import type { StoreTheme } from './types';

/**
 * Compile-time theme registry.
 * To add a new UI: create src/themes/<key>/, export a StoreTheme, and register it here.
 * Switching tenants between packs is a ThemeConfig.themeKey change — no route edits.
 */
const loaders: Record<string, () => Promise<{ default: StoreTheme }>> = {
  default: () => import('./default'),
  'luxury-minimal': () => import('./luxury-minimal'),
  'fashion-bold': () => import('./fashion-bold'),
  '3d-fashion': () => import('./3d-fashion'),
  essa: () => import('./essa'),
};

const cache = new Map<string, StoreTheme>();

export function listRegisteredThemeKeys() {
  return Object.keys(loaders);
}

export async function loadThemePack(themeKey?: string | null): Promise<StoreTheme> {
  const key = themeKey && loaders[themeKey] ? themeKey : 'default';
  if (process.env.NODE_ENV === 'production') {
    const hit = cache.get(key);
    if (hit) return hit;
  }
  const mod = await loaders[key]();
  if (process.env.NODE_ENV === 'production') cache.set(key, mod.default);
  return mod.default;
}
