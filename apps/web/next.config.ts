import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import path from 'path';

const monorepoRoot = path.resolve(process.cwd(), '../..');

const nextConfig: NextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
};

export default withSentryConfig(nextConfig, {
  telemetry: false,
  sourcemaps: {
    disable: true,
  },
});
