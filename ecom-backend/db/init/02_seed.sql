-- Seed: plans, features, themes, permissions, 2 demo tenants
-- Password for all demo users: Password123!
-- bcrypt hash generated for Password123!

DO $$
DECLARE
  v_pwd TEXT := '$2b$10$rQZ8K5Y5Y5Y5Y5Y5Y5Y5YuGKxVxVxVxVxVxVxVxVxVxVxVxVxVxVx'; -- placeholder, replaced by API seed
BEGIN
  NULL;
END $$;

-- Features catalog
INSERT INTO features (key, name, category, description) VALUES
  ('catalog.products', 'Products & variants', 'Catalog', 'Products & variants'),
  ('catalog.categories', 'Category management', 'Catalog', 'Category management'),
  ('catalog.attributes', 'Custom attributes', 'Catalog', 'Custom attributes'),
  ('catalog.bulk_import', 'Bulk product import', 'Catalog', 'Bulk product import'),
  ('inventory.tracking', 'Stock tracking', 'Inventory', 'Stock tracking'),
  ('inventory.multi_warehouse', 'Multi-warehouse', 'Inventory', 'Multi-warehouse'),
  ('orders.management', 'Order management', 'Orders', 'Order management'),
  ('orders.refunds', 'Refunds', 'Orders', 'Refunds'),
  ('customers.crm', 'Customer management', 'Customers', 'Customer management'),
  ('marketing.coupons', 'Discount coupons', 'Marketing', 'Discount coupons'),
  ('marketing.abandoned_cart', 'Abandoned cart emails', 'Marketing', 'Abandoned cart emails'),
  ('content.cms', 'CMS pages', 'Content', 'CMS pages'),
  ('content.page_builder', 'Homepage builder', 'Content', 'Homepage builder'),
  ('storefront.reviews', 'Product reviews', 'Storefront', 'Product reviews'),
  ('storefront.wishlist', 'Wishlist', 'Storefront', 'Wishlist'),
  ('reports.basic', 'Basic analytics', 'Reports', 'Basic analytics'),
  ('reports.advanced', 'Advanced analytics', 'Reports', 'Advanced analytics'),
  ('integrations.api', 'REST API access', 'Integrations', 'REST API access'),
  ('integrations.webhooks', 'Webhooks', 'Integrations', 'Webhooks'),
  ('branding.custom_domain', 'Custom domain', 'Branding', 'Custom domain'),
  ('branding.custom_css', 'Custom CSS', 'Branding', 'Custom CSS'),
  ('themes.basic', '2 default themes', 'Themes', '2 default themes'),
  ('themes.full_catalog', 'All published themes', 'Themes', 'All published themes'),
  ('features.outfit_combiner', 'Outfit Combination Studio', 'Features', 'Outfit Combination Studio'),
  ('features.virtual_checkout', 'Virtual Checkout', 'Features', 'Virtual Checkout');

-- Plans
INSERT INTO subscription_plans (id, key, name, description, price_monthly_cents) VALUES
  ('11111111-1111-1111-1111-111111111001', 'starter', 'Starter', 'Subdomain, 2 themes, 100 products, 2 staff', 2900),
  ('11111111-1111-1111-1111-111111111002', 'professional', 'Professional', 'Custom domain, CMS, coupons, 10 staff', 9900),
  ('11111111-1111-1111-1111-111111111003', 'enterprise', 'Enterprise', 'Custom CSS, API, feature services, SLA', 29900);

-- Plan features (starter)
INSERT INTO plan_features (plan_id, feature_key, enabled, limit_value)
SELECT '11111111-1111-1111-1111-111111111001', key, TRUE, NULL
FROM features WHERE key IN (
  'catalog.products','catalog.categories','inventory.tracking',
  'orders.management','customers.crm','themes.basic','reports.basic'
);

INSERT INTO plan_features (plan_id, feature_key, enabled, limit_value) VALUES
  ('11111111-1111-1111-1111-111111111001', 'catalog.products', TRUE, 100);

-- Professional plan features
INSERT INTO plan_features (plan_id, feature_key, enabled, limit_value)
SELECT '11111111-1111-1111-1111-111111111002', key, TRUE, NULL
FROM features WHERE key IN (
  'catalog.products','catalog.categories','catalog.attributes','inventory.tracking',
  'orders.management','orders.refunds','customers.crm','marketing.coupons',
  'content.cms','content.page_builder','themes.basic','themes.full_catalog',
  'branding.custom_domain','reports.basic','storefront.reviews'
);

-- Enterprise: all features
INSERT INTO plan_features (plan_id, feature_key, enabled, limit_value)
SELECT '11111111-1111-1111-1111-111111111003', key, TRUE, NULL FROM features;

-- Themes
INSERT INTO themes (id, theme_key, name, version, industry_tags, layouts, sections, settings_schema, is_published) VALUES
  ('22222222-2222-2222-2222-222222222001', 'default', 'Default Store', '1.0.0',
   ARRAY['general'], ARRAY['home','collection','product','cart','page'],
   ARRAY['hero-banner','featured-products','newsletter'],
   '{"hero_style":{"type":"select","options":["full-bleed","split"]}}'::jsonb, TRUE),
  ('22222222-2222-2222-2222-222222222002', 'luxury-minimal', 'Luxury Minimal', '1.2.0',
   ARRAY['jewelry','beauty','fashion'], ARRAY['home','collection','product','cart','page'],
   ARRAY['hero-split','image-with-text','testimonials','featured-collection'],
   '{"hero_style":{"type":"select","options":["full-bleed","split"]},"product_card_style":{"type":"select","options":["minimal","overlay"]}}'::jsonb, TRUE),
  ('22222222-2222-2222-2222-222222222003', 'fashion-bold', 'Fashion Bold', '1.0.0',
   ARRAY['fashion','apparel'], ARRAY['home','collection','product','cart','page'],
   ARRAY['hero-video','lookbook','featured-collection'],
   '{}'::jsonb, TRUE);

-- Permissions
INSERT INTO permissions (key, name, category) VALUES
  ('products.read', 'View products', 'Catalog'),
  ('products.write', 'Create/edit products', 'Catalog'),
  ('products.delete', 'Delete products', 'Catalog'),
  ('categories.write', 'Manage categories', 'Catalog'),
  ('orders.read', 'View orders', 'Orders'),
  ('orders.write', 'Update orders', 'Orders'),
  ('orders.refund', 'Refund orders', 'Orders'),
  ('customers.read', 'View customers', 'Customers'),
  ('customers.write', 'Edit customers', 'Customers'),
  ('coupons.write', 'Manage coupons', 'Marketing'),
  ('content.write', 'Manage CMS', 'Content'),
  ('branding.write', 'Edit branding', 'Branding'),
  ('staff.write', 'Manage staff', 'Staff'),
  ('reports.view', 'View reports', 'Reports'),
  ('settings.write', 'Tenant settings', 'Settings');

-- Feature service stubs
INSERT INTO feature_services (service_key, name, entitlement_key, required_core_features, platform_api_scopes, storefront_extensions) VALUES
  ('outfit-combiner', 'Outfit Combination Studio', 'features.outfit_combiner',
   ARRAY['catalog.products','storefront.cart'],
   ARRAY['products.read','cart.write','tenant.read'],
   '[{"slot":"product.detail.actions","bundle":"/widgets/outfit-combiner.js"}]'::jsonb),
  ('virtual-checkout', 'Virtual Checkout', 'features.virtual_checkout',
   ARRAY['storefront.cart','orders.management'],
   ARRAY['cart.read','orders.write'],
   '[{"slot":"checkout.alternatives","bundle":"/widgets/virtual-checkout.js"}]'::jsonb);

-- Platform super admin (password set by seed script)
INSERT INTO platform_users (id, email, password_hash, full_name, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@platform.com',
   '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQsWuXxpFqJqHqHqHqHqHqHqHqHqHq', -- replaced by seed runner
   'Platform Super Admin', 'super_admin');
