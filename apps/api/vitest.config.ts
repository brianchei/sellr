import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    // Integration tests share a single Postgres database; run files
    // sequentially so they don't truncate each other's data mid-run.
    fileParallelism: false,
    // env.ts must run before mocks.ts so DATABASE_URL/JWT_SECRET are set
    // before any module that reads them at import time gets pulled in.
    setupFiles: [
      './tests/integration/env.ts',
      './tests/integration/mocks.ts',
    ],
    testTimeout: 15_000,
  },
});
