import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

for (const p of [
  resolve(process.cwd(), '.env.local'),
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env.local'),
  resolve(process.cwd(), '../../.env'),
]) {
  if (existsSync(p)) {
    loadEnv({ path: p });
  }
}

// v6 used DIRECT_URL for migrate; pooler off locally both URLs match — align if only one is set
if (process.env.DATABASE_URL && !process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = 'postgresql://127.0.0.1:5432/sellr_placeholder?sslmode=disable';
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // CLI (migrate, studio, db push) — use direct / non-pooled connection in real envs
    url: env('DIRECT_URL'),
  },
});
