import type { NextConfig } from 'next';

const API_ORIGIN = process.env.INTERNAL_API_URL || 'http://127.0.0.1:4000';

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
    return [
      { source: '/api/:path*', destination: `${origin}/:path*` },
      { source: '/uploads/:path*', destination: `${origin}/uploads/:path*` },
      { source: '/health', destination: `${origin}/health` },
    ];
  },
};

export default nextConfig;
