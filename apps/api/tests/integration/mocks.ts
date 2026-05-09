/**
 * Module-boundary mocks for integration tests.
 *
 * Loaded via `setupFiles` so `vi.mock` calls hoist into every test file in
 * the worker. Real Postgres stays in play; everything else (Redis, BullMQ
 * queues, Socket.IO emit, Expo push HTTP) is replaced with deterministic,
 * in-memory fakes.
 */

import { vi } from 'vitest';
import type * as expoPushModule from '../../src/lib/expoPush';

/* ------------------------------- Redis ----------------------------------- */
/** Tiny in-memory subset of `ioredis` used by `lib/redis`. */
class FakeRedis {
  private kv = new Map<string, string>();
  private expirations = new Map<string, number>();

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.kv.get(key) ?? null);
  }
  set(key: string, value: string): Promise<'OK'> {
    this.kv.set(key, value);
    return Promise.resolve('OK');
  }
  setex(key: string, _ttl: number, value: string): Promise<'OK'> {
    this.kv.set(key, value);
    return Promise.resolve('OK');
  }
  incr(key: string): Promise<number> {
    const next = Number.parseInt(this.kv.get(key) ?? '0', 10) + 1;
    this.kv.set(key, String(next));
    return Promise.resolve(next);
  }
  expire(key: string, ttlSec: number): Promise<number> {
    if (!this.kv.has(key)) return Promise.resolve(0);
    this.expirations.set(key, ttlSec);
    return Promise.resolve(1);
  }
  del(key: string): Promise<number> {
    return Promise.resolve(this.kv.delete(key) ? 1 : 0);
  }
  on(): void {
    /* no-op */
  }
  flushAll(): void {
    this.kv.clear();
    this.expirations.clear();
  }
}

const fakeRedis = new FakeRedis();

vi.mock('../../src/lib/redis', () => ({
  redis: fakeRedis,
}));

export function clearFakeRedis(): void {
  fakeRedis.flushAll();
}

/* ------------------------ BullMQ queues + workers ------------------------ */

vi.mock('../../src/lib/queues', () => {
  const noopQueue = { add: vi.fn(() => Promise.resolve(undefined)) };
  return {
    aiQueue: noopQueue,
    searchSyncQueue: noopQueue,
    notificationQueue: noopQueue,
    savedSearchQueue: noopQueue,
    quickReplyQueue: noopQueue,
    mediaCleanupQueue: noopQueue,
  };
});

vi.mock('../../src/lib/queue', () => ({
  initBullMQ: () => undefined,
}));

/* -------------------------- Expo push HTTP -------------------------------- */

vi.mock('../../src/lib/expoPush', async () => {
  const actual = await vi.importActual<typeof expoPushModule>(
    '../../src/lib/expoPush',
  );
  return {
    ...actual,
    sendExpoPush: vi.fn(() => Promise.resolve({ ok: true as const })),
  };
});

/* ------------------------------- Socket.IO ------------------------------- */

type EmittedEvent = {
  userIds: string[];
  event: string;
  payload: unknown;
};

const emittedEvents: EmittedEvent[] = [];

vi.mock('../../src/lib/socket', () => ({
  initSocketIO: () => undefined,
  emitToUsers: (userIds: string[], event: string, payload: unknown) => {
    emittedEvents.push({ userIds, event, payload });
  },
}));

export function getEmittedEvents(): readonly EmittedEvent[] {
  return emittedEvents;
}

export function clearEmittedEvents(): void {
  emittedEvents.length = 0;
}

/* ------------------------------- Sentry ---------------------------------- */
// `lib/sentry` calls `Sentry.init` at import time. Avoid it in tests.

vi.mock('../../src/lib/sentry', () => ({}));
