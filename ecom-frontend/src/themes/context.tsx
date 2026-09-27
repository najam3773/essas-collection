'use client';

import { createContext, useContext } from 'react';
import type { StoreTheme, StorefrontContext } from './types';

export type ThemeRuntime = {
  tenant: string;
  themeKey: string;
  pack: StoreTheme;
  context: StorefrontContext | null;
};

export const ThemeRuntimeContext = createContext<ThemeRuntime | null>(null);

export function useThemeRuntime() {
  const ctx = useContext(ThemeRuntimeContext);
  if (!ctx) throw new Error('useThemeRuntime must be used inside ThemeHost');
  return ctx;
}

export function useThemeRuntimeOptional() {
  return useContext(ThemeRuntimeContext);
}
