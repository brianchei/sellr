import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import path from 'path';

const monorepoRoot = path.resolve(process.cwd(), '../..');

const nextConfig: NextConfig = {
  turbopack: {
    root: monorepoRoot,
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
