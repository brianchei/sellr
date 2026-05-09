"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaCleanupWorker = mediaCleanupWorker;
const listingImageStorage_1 = require("../lib/listingImageStorage");
const mediaAssets_1 = require("../lib/mediaAssets");
const logger_1 = require("../lib/logger");
const observability_1 = require("../lib/observability");
const prisma_1 = require("../lib/prisma");
function isStorageProvider(value) {
    return value === 'local' || value === 'r2';
}
async function mediaCleanupWorker(job) {
    if (job.name !== 'delete' && job.name !== 'expire-pending') {
        await job.log(`skip: unknown job name ${job.name}`);
        return;
    }
    const asset = await prisma_1.prisma.mediaAsset.findUnique({
        where: { id: job.data.mediaAssetId },
    });
    if (!asset || asset.status === mediaAssets_1.MEDIA_ASSET_STATUS.Deleted) {
        return;
    }
    if (job.name === 'expire-pending') {
        if (asset.status !== mediaAssets_1.MEDIA_ASSET_STATUS.Pending) {
            return;
        }
        if (asset.expiresAt && asset.expiresAt.getTime() > Date.now()) {
            return;
        }
    }
    if (!isStorageProvider(asset.storageProvider)) {
        const error = new Error(`Unsupported storage provider: ${asset.storageProvider}`);
        await prisma_1.prisma.mediaAsset.update({
            where: { id: asset.id },
            data: {
                status: mediaAssets_1.MEDIA_ASSET_STATUS.DeleteFailed,
                lastError: error.message,
            },
        });
        logger_1.logger.error({
            err: error,
            operation: 'media_cleanup.delete',
            jobId: job.id,
            mediaAssetId: asset.id,
            storageKey: asset.storageKey,
            storageProvider: asset.storageProvider,
            reason: job.data.reason,
        }, 'Media cleanup job failed');
        (0, observability_1.captureOperationalError)(error, {
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
    await prisma_1.prisma.mediaAsset.update({
        where: { id: asset.id },
        data: {
            status: mediaAssets_1.MEDIA_ASSET_STATUS.DeletionQueued,
            lastError: null,
        },
    });
    try {
        await (0, listingImageStorage_1.deleteListingImageObject)({
            storageKey: asset.storageKey,
            storageProvider: asset.storageProvider,
        });
        await prisma_1.prisma.mediaAsset.update({
            where: { id: asset.id },
            data: {
                status: mediaAssets_1.MEDIA_ASSET_STATUS.Deleted,
                deletedAt: new Date(),
                expiresAt: null,
                lastError: null,
            },
        });
    }
    catch (error) {
        await prisma_1.prisma.mediaAsset.update({
            where: { id: asset.id },
            data: {
                status: mediaAssets_1.MEDIA_ASSET_STATUS.DeleteFailed,
                lastError: error instanceof Error ? error.message : String(error),
            },
        });
        logger_1.logger.error({
            err: error,
            operation: 'media_cleanup.delete',
            jobId: job.id,
            mediaAssetId: asset.id,
            storageKey: asset.storageKey,
            storageProvider: asset.storageProvider,
            reason: job.data.reason,
            attemptsMade: job.attemptsMade,
        }, 'Media cleanup job failed');
        (0, observability_1.captureOperationalError)(error, {
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
