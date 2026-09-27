-- Paid Shopify / WooCommerce-style commerce features

-- Product commerce flags
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_preorder BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_digital BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_shipping BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS min_qty INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_qty INTEGER,
  ADD COLUMN IF NOT EXISTS download_url TEXT;

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS min_qty INTEGER,
  ADD COLUMN IF NOT EXISTS max_qty INTEGER;

ALTER TABLE discount_rules DROP CONSTRAINT IF EXISTS discount_rules_type_check;
ALTER TABLE discount_rules
  ADD CONSTRAINT discount_rules_type_check
  CHECK (type IN ('percent_off_order', 'fixed_off_order', 'free_shipping', 'bogo', 'percent_off_product'));

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fulfillment_method TEXT NOT NULL DEFAULT 'ship'
    CHECK (fulfillment_method IN ('ship', 'pickup', 'local_delivery')),
  ADD COLUMN IF NOT EXISTS gift_card_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS store_credit_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_points_redeemed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_code TEXT;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS store_credit_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_group_id UUID,
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by TEXT,
  ADD COLUMN IF NOT EXISTS membership_tier_id UUID;

ALTER TABLE carts
  ADD COLUMN IF NOT EXISTS abandoned_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recovery_token TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS gift_cards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  initial_cents   INTEGER NOT NULL,
  balance_cents   INTEGER NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'USD',
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  note            TEXT,
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  gift_card_id  UUID NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  amount_cents  INTEGER NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('issue', 'redeem', 'refund', 'adjust')),
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_bundles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT,
  price_cents     INTEGER NOT NULL,
  compare_at_cents INTEGER,
  image_url       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS product_bundle_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bundle_id     UUID NOT NULL REFERENCES product_bundles(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id    UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity      INTEGER NOT NULL DEFAULT 1,
  UNIQUE (bundle_id, product_id, variant_id)
);

CREATE TABLE IF NOT EXISTS product_addons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  price_cents   INTEGER NOT NULL DEFAULT 0,
  is_required   BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS quantity_breaks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_qty       INTEGER NOT NULL,
  max_qty       INTEGER,
  percent_off   INTEGER NOT NULL DEFAULT 0,
  price_cents   INTEGER,
  UNIQUE (product_id, min_qty)
);

CREATE TABLE IF NOT EXISTS loyalty_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  enabled               BOOLEAN NOT NULL DEFAULT TRUE,
  points_per_dollar     INTEGER NOT NULL DEFAULT 1,
  redeem_rate_cents     INTEGER NOT NULL DEFAULT 1,
  min_redeem_points     INTEGER NOT NULL DEFAULT 100,
  welcome_points        INTEGER NOT NULL DEFAULT 50
);

CREATE TABLE IF NOT EXISTS loyalty_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  points        INTEGER NOT NULL,
  reason        TEXT NOT NULL,
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  discount_percent INTEGER NOT NULL DEFAULT 0,
  is_b2b        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS group_prices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_group_id UUID NOT NULL REFERENCES customer_groups(id) ON DELETE CASCADE,
  variant_id      UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  price_cents     INTEGER NOT NULL,
  UNIQUE (customer_group_id, variant_id)
);

CREATE TABLE IF NOT EXISTS store_currencies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  rate_to_base    NUMERIC(12,6) NOT NULL DEFAULT 1,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS fulfillment_options (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('pickup', 'local_delivery', 'ship')),
  name            TEXT NOT NULL,
  description     TEXT,
  price_cents     INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  meta            JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS membership_tiers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  price_cents     INTEGER NOT NULL DEFAULT 0,
  billing_period  TEXT NOT NULL DEFAULT 'month' CHECK (billing_period IN ('month', 'year')),
  discount_percent INTEGER NOT NULL DEFAULT 0,
  perks           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS selling_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  interval_days   INTEGER NOT NULL DEFAULT 30,
  discount_percent INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS customer_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  selling_plan_id UUID NOT NULL REFERENCES selling_plans(id) ON DELETE CASCADE,
  variant_id      UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  next_order_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  referrer_points   INTEGER NOT NULL DEFAULT 200,
  referee_coupon_percent INTEGER NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS email_automations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('abandoned_cart', 'welcome', 'order_confirm', 'winback', 'back_in_stock')),
  name          TEXT NOT NULL,
  subject       TEXT NOT NULL,
  body_template TEXT NOT NULL,
  delay_minutes INTEGER NOT NULL DEFAULT 60,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (tenant_id, type)
);

CREATE TABLE IF NOT EXISTS email_outbox (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  to_email      CITEXT NOT NULL,
  subject       TEXT NOT NULL,
  body          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  meta          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cart_item_addons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cart_item_id  UUID NOT NULL REFERENCES cart_items(id) ON DELETE CASCADE,
  addon_id      UUID NOT NULL REFERENCES product_addons(id) ON DELETE CASCADE,
  price_cents   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (cart_item_id, addon_id)
);

CREATE INDEX IF NOT EXISTS idx_gift_cards_tenant_code ON gift_cards(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON email_outbox(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_carts_updated ON carts(tenant_id, updated_at);

-- Seed defaults for existing tenants
INSERT INTO loyalty_settings (tenant_id)
SELECT id FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO referral_settings (tenant_id)
SELECT id FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO store_currencies (tenant_id, code, name, rate_to_base, is_default)
SELECT t.id, 'USD', 'US Dollar', 1, TRUE FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM store_currencies sc WHERE sc.tenant_id = t.id AND sc.code = 'USD');

INSERT INTO store_currencies (tenant_id, code, name, rate_to_base, is_default)
SELECT t.id, 'EUR', 'Euro', 0.92, FALSE FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM store_currencies sc WHERE sc.tenant_id = t.id AND sc.code = 'EUR');

INSERT INTO store_currencies (tenant_id, code, name, rate_to_base, is_default)
SELECT t.id, 'GBP', 'British Pound', 0.79, FALSE FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM store_currencies sc WHERE sc.tenant_id = t.id AND sc.code = 'GBP');

INSERT INTO fulfillment_options (tenant_id, type, name, description, price_cents)
SELECT t.id, 'ship', 'Standard shipping', 'Tracked delivery', 0 FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM fulfillment_options f WHERE f.tenant_id = t.id AND f.type = 'ship');

INSERT INTO fulfillment_options (tenant_id, type, name, description, price_cents)
SELECT t.id, 'pickup', 'Store pickup', 'Collect from boutique', 0 FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM fulfillment_options f WHERE f.tenant_id = t.id AND f.type = 'pickup');

INSERT INTO fulfillment_options (tenant_id, type, name, description, price_cents)
SELECT t.id, 'local_delivery', 'Local delivery', 'Same-day within 15 miles', 900 FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM fulfillment_options f WHERE f.tenant_id = t.id AND f.type = 'local_delivery');

INSERT INTO email_automations (tenant_id, type, name, subject, body_template, delay_minutes)
SELECT t.id, 'abandoned_cart', 'Abandoned cart', 'You left something behind',
  'Hi {{email}}, your cart is waiting. Complete checkout: {{recovery_url}}', 60
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM email_automations e WHERE e.tenant_id = t.id AND e.type = 'abandoned_cart');

INSERT INTO email_automations (tenant_id, type, name, subject, body_template, delay_minutes)
SELECT t.id, 'welcome', 'Welcome series', 'Welcome to {{brand}}',
  'Thanks for joining {{brand}}. Enjoy early access to drops.', 0
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM email_automations e WHERE e.tenant_id = t.id AND e.type = 'welcome');

INSERT INTO membership_tiers (tenant_id, name, price_cents, billing_period, discount_percent, perks)
SELECT t.id, 'Insider', 1500, 'month', 5, 'Early access + free shipping'
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM membership_tiers m WHERE m.tenant_id = t.id AND m.name = 'Insider');

INSERT INTO customer_groups (tenant_id, name, discount_percent, is_b2b)
SELECT t.id, 'Wholesale', 20, TRUE FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM customer_groups g WHERE g.tenant_id = t.id AND g.name = 'Wholesale');

INSERT INTO customer_groups (tenant_id, name, discount_percent, is_b2b)
SELECT t.id, 'Retail', 0, FALSE FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM customer_groups g WHERE g.tenant_id = t.id AND g.name = 'Retail');
