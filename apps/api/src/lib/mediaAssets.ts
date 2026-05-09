import { mediaCleanupQueue } from './queues';
import { prisma } from './prisma';
import type { StoredListingImage } from './listingImageStorage';
import { listingImageStorageReferenceFromUrl } from './listingImageStorage';

type MediaAssetDb = {
  mediaAsset: typeof prisma.mediaAsset;
};

export const MEDIA_ASSET_STATUS = {
  Pending: 'pending',
  Attached: 'attached',
  DeletionQueued: 'deletion_queued',
  Deleted: 'deleted',
  DeleteFailed: 'delete_failed',
} as const;

export type MediaAssetStatus =
  (typeof MEDIA_ASSET_STATUS)[keyof typeof MEDIA_ASSET_STATUS];

export type MediaDeletionReason =
  | 'abandoned_upload'
  | 'listing_deleted'
  | 'listing_photo_removed'
  | 'moderation_listing_removed'
  | 'manual_retry';

export type MediaAssetHealthRecord = {
  id: string;
  ownerId: string | null;
  listingId: string | null;
  url: string;
  storageKey: string;
  storageProvider: string;
  status: string;
  expiresAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MediaCleanupHealth = {
  generatedAt: string;
  countsByStatus: Record<MediaAssetStatus, number>;
  otherStatusCounts: Record<string, number>;
  expiredPendingCount: number;
  expiredPending: MediaAssetHealthRecord[];
  deleteFailedCount: number;
  deleteFailed: MediaAssetHealthRecord[];
};

export type MediaCleanupQueueResult = {
  matched: number;
  queued: number;
  dryRun: boolean;
  assetIds: string[];
};

type MediaAssetGroupByStatusRow = {
  status: string;
  _count: { _all: number };
};

type MediaAssetQueueRecord = {
  id: string;
};

type MediaOpsDb = {
  mediaAsset: {
    groupBy(args: {
      by: ['status'];
      _count: { _all: true };
    }): Promise<MediaAssetGroupByStatusRow[]>;
    count(args: {
      where: {
        status: string;
        expiresAt?: { lte: Date };
      };
    }): Promise<number>;
    findMany(args: {
      where: {
        status: string;
        expiresAt?: { lte: Date };
      };
      select?: Record<string, boolean>;
      take: number;
      orderBy: Record<string, 'asc' | 'desc'>;
    }): Promise<MediaAssetHealthRecord[] | MediaAssetQueueRecord[]>;
  };
};

type MediaCleanupQueueLike = {
  add(
    name: string,
    data: { mediaAssetId: string; reason: MediaDeletionReason },
    opts?: { jobId?: string },
  ): Promise<unknown>;
};

const ABANDONED_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

const MEDIA_HEALTH_RECORD_SELECT = {
  id: true,
  ownerId: true,
  listingId: true,
  url: true,
  storageKey: true,
  storageProvider: true,
  status: true,
  expiresAt: true,
  lastError: true,
  createdAt: true,
  updatedAt: true,
};

function expiresAtForPendingUpload(): Date {
  return new Date(Date.now() + ABANDONED_UPLOAD_TTL_MS);
}

function stringsFromPhotoUrls(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function sellrOwnedPhotoRefs(value: unknown) {
  const seenStorageKeys = new Set<string>();
  return stringsFromPhotoUrls(value).flatMap((url) => {
    const reference = listingImageStorageReferenceFromUrl(url);
    if (!reference || seenStorageKeys.has(reference.storageKey)) {
      return [];
    }
    seenStorageKeys.add(reference.storageKey);
    return [{ url, ...reference }];
  });
}

export async function queueMediaAssetDeletion(
  mediaAssetId: string,
  reason: MediaDeletionReason,
  queue: MediaCleanupQueueLike = mediaCleanupQueue,
  jobId = `media-delete-${mediaAssetId}`,
): Promise<void> {
  await queue.add('delete', { mediaAssetId, reason }, { jobId });
}

export async function recordPendingListingImageUpload({
  ownerId,
  storedImage,
}: {
  ownerId: string;
  storedImage: StoredListingImage;
}): Promise<void> {
  const expiresAt = expiresAtForPendingUpload();
  const asset = await prisma.mediaAsset.upsert({
    where: { storageKey: storedImage.key },
    update: {
      ownerId,
      listingId: null,
      url: storedImage.url,
      storageProvider: storedImage.storageProvider,
      status: MEDIA_ASSET_STATUS.Pending,
      expiresAt,
      attachedAt: null,
      deletedAt: null,
      lastError: null,
    },
    create: {
      ownerId,
      url: storedImage.url,
      storageKey: storedImage.key,
      storageProvider: storedImage.storageProvider,
      status: MEDIA_ASSET_STATUS.Pending,
      expiresAt,
    },
    select: { id: true },
  });

  await mediaCleanupQueue.add(
    'expire-pending',
    { mediaAssetId: asset.id, reason: 'abandoned_upload' },
    {
      delay: ABANDONED_UPLOAD_TTL_MS,
      jobId: `media-expire-${asset.id}`,
    },
  );
}

export async function attachListingMediaAssets({
  ownerId,
  listingId,
  photoUrls,
  db = prisma,
}: {
  ownerId: string;
  listingId: string;
  photoUrls: unknown;
  db?: MediaAssetDb;
}): Promise<void> {
  const refs = sellrOwnedPhotoRefs(photoUrls);
  if (refs.length === 0) return;

  const attachedAt = new Date();
  await Promise.all(
    refs.map((ref) =>
      db.mediaAsset.upsert({
        where: { storageKey: ref.storageKey },
        update: {
          ownerId,
          listingId,
          url: ref.url,
          storageProvider: ref.storageProvider,
          status: MEDIA_ASSET_STATUS.Attached,
          expiresAt: null,
          attachedAt,
          deletedAt: null,
          lastError: null,
        },
        create: {
          ownerId,
          listingId,
          url: ref.url,
          storageKey: ref.storageKey,
          storageProvider: ref.storageProvider,
          status: MEDIA_ASSET_STATUS.Attached,
          attachedAt,
        },
      }),
    ),
  );
}

export async function queueListingPhotoUrlDeletion({
  listingId,
  photoUrls,
  reason,
}: {
  listingId?: string;
  photoUrls: unknown;
  reason: MediaDeletionReason;
}): Promise<void> {
  const refs = sellrOwnedPhotoRefs(photoUrls);
  if (refs.length === 0) return;

  const assets = await Promise.all(
    refs.map((ref) =>
      prisma.mediaAsset.upsert({
        where: { storageKey: ref.storageKey },
        update: {
          listingId: listingId ?? null,
          url: ref.url,
          storageProvider: ref.storageProvider,
          status: MEDIA_ASSET_STATUS.DeletionQueued,
          expiresAt: null,
          lastError: null,
        },
        create: {
          listingId: listingId ?? null,
          url: ref.url,
          storageKey: ref.storageKey,
          storageProvider: ref.storageProvider,
          status: MEDIA_ASSET_STATUS.DeletionQueued,
        },
        select: { id: true },
      }),
    ),
  );

  await Promise.all(
    assets.map((asset) => queueMediaAssetDeletion(asset.id, reason)),
  );
}

export async function queueRemovedListingPhotoDeletion({
  listingId,
  previousPhotoUrls,
  nextPhotoUrls,
}: {
  listingId: string;
  previousPhotoUrls: unknown;
  nextPhotoUrls: unknown;
}): Promise<void> {
  const nextStorageKeys = new Set(
    sellrOwnedPhotoRefs(nextPhotoUrls).map((ref) => ref.storageKey),
  );
  const removedRefs = sellrOwnedPhotoRefs(previousPhotoUrls).filter(
    (ref) => !nextStorageKeys.has(ref.storageKey),
  );
  if (removedRefs.length === 0) return;

  await queueListingPhotoUrlDeletion({
    listingId,
    photoUrls: removedRefs.map((ref) => ref.url),
    reason: 'listing_photo_removed',
  });
}

function emptyStatusCounts(): Record<MediaAssetStatus, number> {
  return {
    [MEDIA_ASSET_STATUS.Pending]: 0,
    [MEDIA_ASSET_STATUS.Attached]: 0,
    [MEDIA_ASSET_STATUS.DeletionQueued]: 0,
    [MEDIA_ASSET_STATUS.Deleted]: 0,
    [MEDIA_ASSET_STATUS.DeleteFailed]: 0,
  };
}

function isKnownMediaAssetStatus(status: string): status is MediaAssetStatus {
  return Object.values(MEDIA_ASSET_STATUS).includes(status as MediaAssetStatus);
}

export async function getMediaCleanupHealth({
  limit = 20,
  now = new Date(),
  db = prisma,
}: {
  limit?: number;
  now?: Date;
  db?: MediaOpsDb;
} = {}): Promise<MediaCleanupHealth> {
  const [statusGroups, expiredPendingCount, deleteFailedCount] =
    await Promise.all([
      db.mediaAsset.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      db.mediaAsset.count({
        where: {
          status: MEDIA_ASSET_STATUS.Pending,
          expiresAt: { lte: now },
        },
      }),
      db.mediaAsset.count({
        where: {
          status: MEDIA_ASSET_STATUS.DeleteFailed,
        },
      }),
    ]);

  const countsByStatus = emptyStatusCounts();
  const otherStatusCounts: Record<string, number> = {};

  for (const group of statusGroups) {
    if (isKnownMediaAssetStatus(group.status)) {
      countsByStatus[group.status] = group._count._all;
    } else {
      otherStatusCounts[group.status] = group._count._all;
    }
  }

  const [expiredPending, deleteFailed] = await Promise.all([
    db.mediaAsset.findMany({
      where: {
        status: MEDIA_ASSET_STATUS.Pending,
        expiresAt: { lte: now },
      },
      select: MEDIA_HEALTH_RECORD_SELECT,
      take: limit,
      orderBy: { expiresAt: 'asc' },
    }) as Promise<MediaAssetHealthRecord[]>,
    db.mediaAsset.findMany({
      where: {
        status: MEDIA_ASSET_STATUS.DeleteFailed,
      },
      select: MEDIA_HEALTH_RECORD_SELECT,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }) as Promise<MediaAssetHealthRecord[]>,
  ]);

  return {
    generatedAt: now.toISOString(),
    countsByStatus,
    otherStatusCounts,
    expiredPendingCount,
    expiredPending,
    deleteFailedCount,
    deleteFailed,
  };
}

export async function queueExpiredPendingMediaCleanupBatch({
  limit = 100,
  dryRun = false,
  now = new Date(),
  db = prisma,
  queue = mediaCleanupQueue,
}: {
  limit?: number;
  dryRun?: boolean;
  now?: Date;
  db?: MediaOpsDb;
  queue?: MediaCleanupQueueLike;
} = {}): Promise<MediaCleanupQueueResult> {
  const assets = (await db.mediaAsset.findMany({
    where: {
      status: MEDIA_ASSET_STATUS.Pending,
      expiresAt: { lte: now },
    },
    select: { id: true },
    take: limit,
    orderBy: { expiresAt: 'asc' },
  })) as MediaAssetQueueRecord[];

  if (!dryRun) {
    await Promise.all(
      assets.map((asset) =>
        queueMediaAssetDeletion(asset.id, 'abandoned_upload', queue),
      ),
    );
  }

  return {
    matched: assets.length,
    queued: dryRun ? 0 : assets.length,
    dryRun,
    assetIds: assets.map((asset) => asset.id),
  };
}

export async function retryFailedMediaCleanup({
  limit = 100,
  dryRun = false,
  db = prisma,
  queue = mediaCleanupQueue,
}: {
  limit?: number;
  dryRun?: boolean;
  db?: MediaOpsDb;
  queue?: MediaCleanupQueueLike;
} = {}): Promise<MediaCleanupQueueResult> {
  const assets = (await db.mediaAsset.findMany({
    where: {
      status: MEDIA_ASSET_STATUS.DeleteFailed,
    },
    select: { id: true },
    take: limit,
    orderBy: { updatedAt: 'asc' },
  })) as MediaAssetQueueRecord[];

  if (!dryRun) {
    await Promise.all(
      assets.map((asset) =>
        queueMediaAssetDeletion(
          asset.id,
          'manual_retry',
          queue,
          `media-delete-${asset.id}-retry-${String(Date.now())}`,
        ),
      ),
    );
  }

  return {
    matched: assets.length,
    queued: dryRun ? 0 : assets.length,
    dryRun,
    assetIds: assets.map((asset) => asset.id),
  };
}

export async function queueExpiredPendingMediaCleanup(
  limit = 100,
): Promise<number> {
  const result = await queueExpiredPendingMediaCleanupBatch({ limit });
  return result.queued;
}
