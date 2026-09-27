# Storefront theme packs

Themes are **full UI packs** bound to the same storefront APIs. Branding
(colors, fonts, logo, custom CSS) stays on `ThemeConfig` and overlays any pack.

## Switch a store

Platform admin → tenant → **Theme** dropdown (`themeKey`). No code change.

## Add a new UI

1. Create `src/themes/<theme-key>/` with `Layout.tsx`, pages, `theme.css`, `index.ts`.
2. Export a `StoreTheme` from `index.ts` (see `types.ts`).
3. Register the pack in `registry.ts`.
4. Seed/publish a `Theme` row with the same `themeKey` (platform Themes page).
5. Assign it to a tenant.

Store routes under `app/store/[tenant]` stay thin hosts — do not put pack UI there.

## Structure

- `ThemeHostLayout` — loads context, branding CSS vars, resolves pack
- `ThemePage` — renders `pack.pages.<name>`
- `shared/` — commerce pages reused across packs (cart, PDP, account, …)
- `default` / `luxury-minimal` / `fashion-bold` / `3d-fashion` — distinct layouts & home/shop UIs
