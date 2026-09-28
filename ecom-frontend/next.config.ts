import type { NextConfig } from 'next';

const API_ORIGIN = process.env.INTERNAL_API_URL || 'http://127.0.0.1:4000';

/** Unmigrated Express routes. Used when STOREFRONT_API=workers so vinext
 *  Route Handlers serve health/auth/storefront reads instead of proxying all of /api. */
function expressFallbackRewrites(origin: string) {
  return [
    { source: '/api/admin/:path*', destination: `${origin}/admin/:path*` },
    { source: '/api/storefront/cart', destination: `${origin}/storefront/cart` },
    { source: '/api/storefront/cart/:path*', destination: `${origin}/storefront/cart/:path*` },
    { source: '/api/storefront/checkout', destination: `${origin}/storefront/checkout` },
    { source: '/api/storefront/checkout/:path*', destination: `${origin}/storefront/checkout/:path*` },
    { source: '/api/storefront/wishlist', destination: `${origin}/storefront/wishlist` },
    { source: '/api/storefront/wishlist/:path*', destination: `${origin}/storefront/wishlist/:path*` },
    { source: '/api/storefront/newsletter', destination: `${origin}/storefront/newsletter` },
    { source: '/api/storefront/account', destination: `${origin}/storefront/account` },
    { source: '/api/storefront/account/:path*', destination: `${origin}/storefront/account/:path*` },
    { source: '/api/storefront/orders', destination: `${origin}/storefront/orders` },
    { source: '/api/storefront/pages', destination: `${origin}/storefront/pages` },
    { source: '/api/storefront/pages/:path*', destination: `${origin}/storefront/pages/:path*` },
    { source: '/api/storefront/search/:path*', destination: `${origin}/storefront/search/:path*` },
    { source: '/api/storefront/stock-notify', destination: `${origin}/storefront/stock-notify` },
    { source: '/api/storefront/coupons/:path*', destination: `${origin}/storefront/coupons/:path*` },
    { source: '/api/storefront/gift-cards/:path*', destination: `${origin}/storefront/gift-cards/:path*` },
    { source: '/api/storefront/bundles', destination: `${origin}/storefront/bundles` },
    { source: '/api/storefront/bundles/:path*', destination: `${origin}/storefront/bundles/:path*` },
    { source: '/api/storefront/loyalty/:path*', destination: `${origin}/storefront/loyalty/:path*` },
    { source: '/api/storefront/currencies', destination: `${origin}/storefront/currencies` },
    { source: '/api/storefront/fulfillment-options', destination: `${origin}/storefront/fulfillment-options` },
    { source: '/api/storefront/memberships', destination: `${origin}/storefront/memberships` },
    { source: '/api/storefront/extensions', destination: `${origin}/storefront/extensions` },
    { source: '/api/storefront/resolve-host', destination: `${origin}/storefront/resolve-host` },
    { source: '/api/storefront/tags/:path*', destination: `${origin}/storefront/tags/:path*` },
    { source: '/api/storefront/products/:id/reviews', destination: `${origin}/storefront/products/:id/reviews` },
    { source: '/api/storefront/products/:id/commerce-extras', destination: `${origin}/storefront/products/:id/commerce-extras` },
    { source: '/api/auth/staff/bootstrap', destination: `${origin}/auth/staff/bootstrap` },
    { source: '/api/auth/tenant/bootstrap', destination: `${origin}/auth/tenant/bootstrap` },
  ];
}

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async rewrites() {
    const origin = process.env.INTERNAL_API_URL || API_ORIGIN;
    const workersApi = process.env.STOREFRONT_API === 'workers';
    return [
      ...(workersApi
        ? expressFallbackRewrites(origin)
        : [{ source: '/api/:path*', destination: `${origin}/:path*` }]),
      { source: '/uploads/:path*', destination: `${origin}/uploads/:path*` },
      { source: '/health', destination: `${origin}/health` },
    ];
  },
};

export default nextConfig;
