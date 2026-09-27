const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/commerce?schema=public',
  });
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS sales (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      percent_off INT NOT NULL,
      scope TEXT NOT NULL,
      product_id UUID REFERENCES products(id) ON DELETE CASCADE,
      category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
      starts_at TIMESTAMPTZ,
      ends_at TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS sales_tenant_active_idx ON sales(tenant_id, is_active);
    CREATE INDEX IF NOT EXISTS sales_tenant_scope_idx ON sales(tenant_id, scope);
  `);
  console.log('sales table ready');
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
