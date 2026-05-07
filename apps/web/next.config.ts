import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import path from 'path';

const monorepoRoot = path.resolve(process.cwd(), '../..');

const nextConfig: NextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
  images: {
    // Listing photos are stored as same-origin paths
    // (`/api/v1/uploads/listing-images/<uuid>.<ext>`) which are forwarded to
    // the Fastify uploads route by the rewrite below — same-origin sources do
    // not need to be allow-listed. Seed data and any future external CDN
    // sources do; extend `remotePatterns` when uploads move to Cloudflare R2.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  /** Same-origin `/api/v1` → Fastify so the browser can use httpOnly cookies (see auth). */
  async rewrites() {
    const api =
      process.env.INTERNAL_API_URL ?? 'http://127.0.0.1:3001';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${api}/api/v1/:path*`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  telemetry: false,
  sourcemaps: {
    disable: true,
  },
});
