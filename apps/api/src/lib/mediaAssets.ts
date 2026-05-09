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

export type MediaDeletionReason =
  | 'abandoned_upload'
  | 'listing_deleted'
  | 'listing_photo_removed'
  | 'moderation_listing_removed';

const ABANDONED_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

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

async function queueMediaAssetDeletion(
  mediaAssetId: string,
  reason: MediaDeletionReason,
): Promise<void> {
  await mediaCleanupQueue.add(
    'delete',
    { mediaAssetId, reason },
    { jobId: `media-delete-${mediaAssetId}` },
  );
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

export async function queueExpiredPendingMediaCleanup(
  limit = 100,
): Promise<number> {
  const assets = await prisma.mediaAsset.findMany({
    where: {
      status: MEDIA_ASSET_STATUS.Pending,
      expiresAt: { lte: new Date() },
    },
    select: { id: true },
    take: limit,
    orderBy: { expiresAt: 'asc' },
  });

  await Promise.all(
    assets.map((asset) =>
      queueMediaAssetDeletion(asset.id, 'abandoned_upload'),
    ),
  );

  return assets.length;
}
