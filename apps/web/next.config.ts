import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import path from 'path';

const monorepoRoot = path.resolve(process.cwd(), '../..');

function listingImageCdnPattern() {
  const value = process.env.NEXT_PUBLIC_LISTING_IMAGE_CDN_URL?.trim();
  if (!value) return null;

  const url = new URL(value);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('NEXT_PUBLIC_LISTING_IMAGE_CDN_URL must be an http(s) URL');
  }

  const basePath = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
  return {
    protocol: url.protocol === 'http:' ? 'http' : 'https',
    hostname: url.hostname,
    port: url.port,
    pathname: `${basePath}/**`,
  } as const;
}

const listingImageRemotePattern = listingImageCdnPattern();

const nextConfig: NextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
  images: {
    // Same-origin legacy upload paths are still served through the API rewrite.
    // New durable listing images are returned as CDN URLs and must be
    // allow-listed here for Next/Image optimization.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      ...(listingImageRemotePattern ? [listingImageRemotePattern] : []),
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
