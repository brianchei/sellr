import type { Job } from 'bullmq';
import {
  deleteListingImageObject,
  type ListingImageStorageProvider,
} from '../lib/listingImageStorage';
import { MEDIA_ASSET_STATUS } from '../lib/mediaAssets';
import type { MediaCleanupJob } from '../lib/jobTypes';
import { logger } from '../lib/logger';
import { captureOperationalError } from '../lib/observability';
import { prisma } from '../lib/prisma';

function isStorageProvider(
  value: string,
): value is ListingImageStorageProvider {
  return value === 'local' || value === 'r2';
}

export async function mediaCleanupWorker(
  job: Job<MediaCleanupJob>,
): Promise<void> {
  if (job.name !== 'delete' && job.name !== 'expire-pending') {
    await job.log(`skip: unknown job name ${job.name}`);
    return;
  }

  const asset = await prisma.mediaAsset.findUnique({
    where: { id: job.data.mediaAssetId },
  });
  if (!asset || asset.status === MEDIA_ASSET_STATUS.Deleted) {
    return;
  }

  if (job.name === 'expire-pending') {
    if (asset.status !== MEDIA_ASSET_STATUS.Pending) {
      return;
    }
    if (asset.expiresAt && asset.expiresAt.getTime() > Date.now()) {
      return;
    }
  }

  if (!isStorageProvider(asset.storageProvider)) {
    const error = new Error(
      `Unsupported storage provider: ${asset.storageProvider}`,
    );
    await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        status: MEDIA_ASSET_STATUS.DeleteFailed,
        lastError: error.message,
      },
    });
    logger.error(
      {
        err: error,
        operation: 'media_cleanup.delete',
        jobId: job.id,
        mediaAssetId: asset.id,
        storageKey: asset.storageKey,
        storageProvider: asset.storageProvider,
        reason: job.data.reason,
      },
      'Media cleanup job failed',
    );
    captureOperationalError(error, {
      component: 'media_cleanup',
      operation: 'delete',
      tags: {
        reason: job.data.reason,
        storageProvider: asset.storageProvider,
      },
      extra: {
        jobId: job.id,
        mediaAssetId: asset.id,
        storageKey: asset.storageKey,
      },
      userId: asset.ownerId ?? undefined,
    });
    throw error;
  }

  await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: {
      status: MEDIA_ASSET_STATUS.DeletionQueued,
      lastError: null,
    },
  });

  try {
    await deleteListingImageObject({
      storageKey: asset.storageKey,
      storageProvider: asset.storageProvider,
    });

    await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        status: MEDIA_ASSET_STATUS.Deleted,
        deletedAt: new Date(),
        expiresAt: null,
        lastError: null,
      },
    });
  } catch (error) {
    await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        status: MEDIA_ASSET_STATUS.DeleteFailed,
        lastError: error instanceof Error ? error.message : String(error),
      },
    });
    logger.error(
      {
        err: error,
        operation: 'media_cleanup.delete',
        jobId: job.id,
        mediaAssetId: asset.id,
        storageKey: asset.storageKey,
        storageProvider: asset.storageProvider,
        reason: job.data.reason,
        attemptsMade: job.attemptsMade,
      },
      'Media cleanup job failed',
    );
    captureOperationalError(error, {
      component: 'media_cleanup',
      operation: 'delete',
      tags: {
        reason: job.data.reason,
        storageProvider: asset.storageProvider,
      },
      extra: {
        jobId: job.id,
        mediaAssetId: asset.id,
        storageKey: asset.storageKey,
        attemptsMade: job.attemptsMade,
      },
      userId: asset.ownerId ?? undefined,
    });
    throw error;
  }
}
