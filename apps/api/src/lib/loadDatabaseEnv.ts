import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

/**
 * Load `.env` from `apps/api` and monorepo root (matches `prisma.config.ts`).
 */
export function loadDatabaseEnv(): void {
  for (const p of [
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env.local'),
    resolve(process.cwd(), '../../.env'),
  ]) {
    if (existsSync(p)) {
      config({ path: p });
    }
  }
}
