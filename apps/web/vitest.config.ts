import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**'],
    // Default to node for pure-logic tests; component test files opt into
    // jsdom with a `// @vitest-environment jsdom` directive at the top.
    environment: 'node',
    // `globals: true` so React Testing Library auto-cleans the rendered
    // tree between tests (it relies on a global `afterEach`).
    globals: true,
  },
});
