import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueueAdd = (
  name: string,
  data: { mediaAssetId: string; reason: string },
  opts?: { jobId?: string },
) => Promise<void>;

const mocks = vi.hoisted(() => ({
  queueAdd: vi.fn<QueueAdd>(() => Promise.resolve()),
  mediaAsset: {
    groupBy: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    mediaAsset: mocks.mediaAsset,
  },
}));

vi.mock('../src/lib/queues', () => ({
  mediaCleanupQueue: {
    add: mocks.queueAdd,
  },
}));

import {
  getMediaCleanupHealth,
  MEDIA_ASSET_STATUS,
  queueExpiredPendingMediaCleanupBatch,
  retryFailedMediaCleanup,
} from '../src/lib/mediaAssets';

const now = new Date('2026-05-09T06:00:00.000Z');

function mediaRecord(overrides: {
  id: string;
  status: string;
  storageKey?: string;
  expiresAt?: Date | null;
  lastError?: string | null;
}) {
  return {
    id: overrides.id,
    ownerId: '11111111-1111-1111-1111-111111111111',
    listingId: '22222222-2222-2222-2222-222222222222',
    url: `https://cdn.sellr.test/${overrides.storageKey ?? 'listing-images/test.jpg'}`,
    storageKey: overrides.storageKey ?? 'listing-images/test.jpg',
    storageProvider: 'r2',
    status: overrides.status,
    expiresAt: overrides.expiresAt ?? null,
    lastError: overrides.lastError ?? null,
    createdAt: new Date('2026-05-08T06:00:00.000Z'),
    updatedAt: new Date('2026-05-09T05:00:00.000Z'),
  };
}

beforeEach(() => {
  mocks.queueAdd.mockClear();
  mocks.mediaAsset.groupBy.mockReset();
  mocks.mediaAsset.count.mockReset();
  mocks.mediaAsset.findMany.mockReset();
});

describe('media cleanup ops helpers', () => {
  it('summarizes media assets by status and surfaces problem records', async () => {
    const expired = mediaRecord({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      status: MEDIA_ASSET_STATUS.Pending,
      storageKey: 'listing-images/expired.jpg',
      expiresAt: new Date('2026-05-08T06:00:00.000Z'),
    });
    const failed = mediaRecord({
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      status: MEDIA_ASSET_STATUS.DeleteFailed,
      storageKey: 'listing-images/failed.jpg',
      lastError: 'R2 unavailable',
    });

    mocks.mediaAsset.groupBy.mockResolvedValue([
      { status: MEDIA_ASSET_STATUS.Pending, _count: { _all: 2 } },
      { status: MEDIA_ASSET_STATUS.Attached, _count: { _all: 5 } },
      { status: 'unexpected', _count: { _all: 1 } },
    ]);
    mocks.mediaAsset.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    mocks.mediaAsset.findMany
      .mockResolvedValueOnce([expired])
      .mockResolvedValueOnce([failed]);

    const health = await getMediaCleanupHealth({ now, limit: 10 });

    expect(health.generatedAt).toBe('2026-05-09T06:00:00.000Z');
    expect(health.countsByStatus.pending).toBe(2);
    expect(health.countsByStatus.attached).toBe(5);
    expect(health.countsByStatus.delete_failed).toBe(0);
    expect(health.otherStatusCounts).toEqual({ unexpected: 1 });
    expect(health.expiredPendingCount).toBe(1);
    expect(health.expiredPending).toEqual([expired]);
    expect(health.deleteFailedCount).toBe(1);
    expect(health.deleteFailed).toEqual([failed]);
  });

  it('queues expired pending assets unless dry-run is enabled', async () => {
    mocks.mediaAsset.findMany.mockResolvedValue([
      { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
      { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
    ]);

    const result = await queueExpiredPendingMediaCleanupBatch({
      now,
      limit: 2,
    });

    expect(result).toEqual({
      matched: 2,
      queued: 2,
      dryRun: false,
      assetIds: [
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      ],
    });
    expect(mocks.queueAdd).toHaveBeenCalledWith(
      'delete',
      {
        mediaAssetId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        reason: 'abandoned_upload',
      },
      { jobId: 'media-delete-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    );
    expect(mocks.queueAdd).toHaveBeenCalledTimes(2);
  });

  it('supports dry-run for failed cleanup retries', async () => {
    mocks.mediaAsset.findMany.mockResolvedValue([
      { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' },
    ]);

    const result = await retryFailedMediaCleanup({
      dryRun: true,
      limit: 1,
    });

    expect(result).toEqual({
      matched: 1,
      queued: 0,
      dryRun: true,
      assetIds: ['cccccccc-cccc-cccc-cccc-cccccccccccc'],
    });
    expect(mocks.queueAdd).not.toHaveBeenCalled();
  });

  it('queues failed cleanup retries with a manual retry reason', async () => {
    mocks.mediaAsset.findMany.mockResolvedValue([
      { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd' },
    ]);

    const result = await retryFailedMediaCleanup({ limit: 1 });

    expect(result.queued).toBe(1);
    const retryCall = mocks.queueAdd.mock.calls[0];
    expect(retryCall[0]).toBe('delete');
    expect(retryCall[1]).toEqual({
      mediaAssetId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      reason: 'manual_retry',
    });
    expect(retryCall[2]?.jobId).toMatch(
      /^media-delete-dddddddd-dddd-dddd-dddd-dddddddddddd-retry-\d+$/,
    );
  });
});
