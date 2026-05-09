import type { Job } from 'bullmq';
import {
  deleteListingImageObject,
  type ListingImageStorageProvider,
} from '../lib/listingImageStorage';
import { MEDIA_ASSET_STATUS } from '../lib/mediaAssets';
import type { MediaCleanupJob } from '../lib/jobTypes';
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
    await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        status: MEDIA_ASSET_STATUS.DeleteFailed,
        lastError: `Unsupported storage provider: ${asset.storageProvider}`,
      },
    });
    throw new Error(`Unsupported storage provider: ${asset.storageProvider}`);
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
    throw error;
  }
}
