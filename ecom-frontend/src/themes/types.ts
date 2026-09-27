import type { ComponentType, ReactNode } from 'react';

/** Branding tokens from ThemeConfig — colors/fonts stay editable without a new UI pack. */
export type ThemeBranding = {
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor?: string;
  fontHeading?: string;
  fontBody?: string;
  customCss?: string | null;
  logoUrl?: string | null;
  theme?: { themeKey: string; name: string } | null;
};

export type StorefrontContext = {
  tenant: { name: string; slug: string };
  branding: ThemeBranding | null;
  entitlements: string[];
  pages?: Record<string, Array<{ type: string; settings?: Record<string, unknown> }>>;
};

export type ThemeLayoutProps = {
  tenant: string;
  children: ReactNode;
  context: StorefrontContext | null;
};

export type ThemePageName =
  | 'home'
  | 'shop'
  | 'product'
  | 'collection'
  | 'cart'
  | 'account'
  | 'login'
  | 'wishlist'
  | 'compare'
  | 'content';

/**
 * A theme pack is a full storefront UI attached to the same storefront APIs.
 * Add a new look by creating a folder under src/themes/ and registering it —
 * do not edit store routes or commerce APIs.
 */
export type StoreTheme = {
  key: string;
  name: string;
  version: string;
  /** Prefer dark ink fallbacks when deriving surfaces */
  dark?: boolean;
  /** Optional CSS module or side-effect import applied when pack loads */
  Layout: ComponentType<ThemeLayoutProps>;
  pages: Partial<Record<ThemePageName, ComponentType>>;
};
