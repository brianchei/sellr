/**
 * Integration test environment bootstrap.
 *
 * Loaded as a Vitest `setupFiles` entry, BEFORE any test file imports a route
 * (and therefore before `lib/prisma` reads `DATABASE_URL`). It:
 *
 *   1. Loads `.env` files via the same loader the API uses at boot.
 *   2. Promotes `TEST_DATABASE_URL` → `DATABASE_URL` if explicitly set, so we
 *      never accidentally truncate a developer's main dev DB.
 *   3. Sets sensible defaults for required env vars (JWT secret, etc.).
 *   4. Marks integration tests as runnable only when `DATABASE_URL` is set.
 *      Without it, individual test suites should `describe.skipIf(...)`.
 */

import { loadDatabaseEnv } from '../../src/lib/loadDatabaseEnv';

loadDatabaseEnv();

const explicitTestUrl = process.env.TEST_DATABASE_URL;
if (explicitTestUrl) {
  process.env.DATABASE_URL = explicitTestUrl;
  process.env.DIRECT_URL = process.env.TEST_DIRECT_URL ?? explicitTestUrl;
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'integration-test-secret';
}

// Force local OTP mode so `verifyOtpCode` accepts `000000` deterministically
// without a real Twilio account. (Matches `lib/otp.ts`'s placeholder check.)
process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? 'xxxx';
process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? 'xxxx';
process.env.TWILIO_VERIFY_SERVICE_SID =
  process.env.TWILIO_VERIFY_SERVICE_SID ?? 'xxxx';

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Tame BullMQ defaults during tests; queues are mocked but some import-time
// code paths still touch IORedis options.
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

/**
 * Safety guard: integration tests TRUNCATE every domain table. We refuse to
 * point Prisma at a database whose name doesn't clearly identify it as a
 * test DB, so a stray `pnpm test` cannot wipe a developer's dev DB.
 *
 * Acceptable forms:
 *   - `TEST_DATABASE_URL` is explicitly set (developer opted in).
 *   - `DATABASE_URL` ends in a database whose name contains `test`
 *     (CI default `sellr_test`, local `sellr_integration_test`, etc.).
 *
 * Otherwise we strip `DATABASE_URL` here and integration suites skip.
 */
function looksLikeTestDatabase(url: string): boolean {
  try {
    const parsed = new URL(url);
    const dbName = parsed.pathname.replace(/^\//, '');
    return /test/i.test(dbName);
  } catch {
    return false;
  }
}

if (process.env.DATABASE_URL && !explicitTestUrl) {
  if (!looksLikeTestDatabase(process.env.DATABASE_URL)) {
    console.warn(
      '[integration] DATABASE_URL does not look like a test database ' +
        '(name must contain "test"). Skipping integration suites.\n' +
        '  Set TEST_DATABASE_URL=postgresql://.../<name_with_test> to opt in.',
    );
    delete process.env.DATABASE_URL;
    delete process.env.DIRECT_URL;
  }
}

export const integrationDbAvailable = Boolean(process.env.DATABASE_URL);

if (!integrationDbAvailable) {
  console.warn(
    '[integration] DATABASE_URL not set; integration suites will be skipped.\n' +
      '  Set TEST_DATABASE_URL=postgresql://... (a *test* DB you are OK truncating).',
  );
}
