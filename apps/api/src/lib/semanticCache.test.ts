import { describe, it, expect, vi } from 'vitest';

/** In-memory stand-in for Redis — keeps `pnpm test` green without a local Redis daemon. */
vi.mock('./redis', () => {
  const store = new Map<string, string>();
  return {
    redis: {
      get: (key: string) => Promise.resolve(store.get(key) ?? null),
      setex: (key: string, _ttl: number, value: string) => {
        store.set(key, value);
        return Promise.resolve('OK' as const);
      },
      del: (key: string) => {
        store.delete(key);
        return Promise.resolve(1);
      },
      on: () => undefined,
    },
  };
});

import {
  getCachedLLMResponse,
  setCachedLLMResponse,
  hashPrompt,
} from './semanticCache';
import { redis } from './redis';

describe('semanticCache', () => {
  it('roundtrips get/set with a dummy key (llm:cache:* contract)', async () => {
    const dummyHash = hashPrompt('sellr:phase0:semantic-cache-verify');
    const payload = '{"phase0":true}';

    await setCachedLLMResponse(dummyHash, payload, 120);
    expect(await getCachedLLMResponse(dummyHash)).toBe(payload);

    await redis.del(`llm:cache:${dummyHash}`);
    expect(await getCachedLLMResponse(dummyHash)).toBeNull();
  });
});
