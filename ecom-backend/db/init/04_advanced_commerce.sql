-- Shopify / WooCommerce-style advanced commerce fields

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vendor TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS weight_grams INTEGER;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS gift_note TEXT,
  ADD COLUMN IF NOT EXISTS discount_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT;

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS store_settings (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                     UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  announcement_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
  announcement_text             TEXT,
  free_shipping_threshold_cents INTEGER,
  low_stock_threshold           INTEGER NOT NULL DEFAULT 5,
  gift_notes_enabled            BOOLEAN NOT NULL DEFAULT TRUE,
  support_email                 TEXT,
  currency                      TEXT NOT NULL DEFAULT 'USD',
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discount_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('percent_off_order', 'fixed_off_order', 'free_shipping')),
  value           INTEGER NOT NULL DEFAULT 0,
  min_subtotal_cents INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  variant_id    UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  email         CITEXT NOT NULL,
  notified      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, variant_id, email)
);

CREATE TABLE IF NOT EXISTS product_upsells (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  upsell_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (product_id, upsell_product_id)
);
