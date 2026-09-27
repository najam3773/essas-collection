-- Fixes drift between prisma/schema.prisma and the initial schema files.

ALTER TABLE theme_configs
  ADD COLUMN IF NOT EXISTS background_color TEXT NOT NULL DEFAULT '#fbf8f2';

CREATE TABLE IF NOT EXISTS sales (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  percent_off  INTEGER NOT NULL,
  scope        TEXT NOT NULL,
  product_id   UUID REFERENCES products(id) ON DELETE CASCADE,
  category_id  UUID REFERENCES categories(id) ON DELETE CASCADE,
  starts_at    TIMESTAMPTZ,
  ends_at      TIMESTAMPTZ,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sales_tenant_active_idx ON sales (tenant_id, is_active);
CREATE INDEX IF NOT EXISTS sales_tenant_scope_idx  ON sales (tenant_id, scope);

CREATE TRIGGER trg_sales_updated BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
