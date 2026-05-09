"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEDIA_ASSET_STATUS = void 0;
exports.queueMediaAssetDeletion = queueMediaAssetDeletion;
exports.recordPendingListingImageUpload = recordPendingListingImageUpload;
exports.attachListingMediaAssets = attachListingMediaAssets;
exports.queueListingPhotoUrlDeletion = queueListingPhotoUrlDeletion;
exports.queueRemovedListingPhotoDeletion = queueRemovedListingPhotoDeletion;
exports.getMediaCleanupHealth = getMediaCleanupHealth;
exports.queueExpiredPendingMediaCleanupBatch = queueExpiredPendingMediaCleanupBatch;
exports.retryFailedMediaCleanup = retryFailedMediaCleanup;
exports.queueExpiredPendingMediaCleanup = queueExpiredPendingMediaCleanup;
const queues_1 = require("./queues");
const prisma_1 = require("./prisma");
const listingImageStorage_1 = require("./listingImageStorage");
exports.MEDIA_ASSET_STATUS = {
    Pending: 'pending',
    Attached: 'attached',
    DeletionQueued: 'deletion_queued',
    Deleted: 'deleted',
    DeleteFailed: 'delete_failed',
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
function expiresAtForPendingUpload() {
    return new Date(Date.now() + ABANDONED_UPLOAD_TTL_MS);
}
function stringsFromPhotoUrls(value) {
    return Array.isArray(value)
        ? value.filter((item) => typeof item === 'string')
        : [];
}
function sellrOwnedPhotoRefs(value) {
    const seenStorageKeys = new Set();
    return stringsFromPhotoUrls(value).flatMap((url) => {
        const reference = (0, listingImageStorage_1.listingImageStorageReferenceFromUrl)(url);
        if (!reference || seenStorageKeys.has(reference.storageKey)) {
            return [];
        }
        seenStorageKeys.add(reference.storageKey);
        return [{ url, ...reference }];
    });
}
async function queueMediaAssetDeletion(mediaAssetId, reason, queue = queues_1.mediaCleanupQueue, jobId = `media-delete-${mediaAssetId}`) {
    await queue.add('delete', { mediaAssetId, reason }, { jobId });
}
async function recordPendingListingImageUpload({ ownerId, storedImage, }) {
    const expiresAt = expiresAtForPendingUpload();
    const asset = await prisma_1.prisma.mediaAsset.upsert({
        where: { storageKey: storedImage.key },
        update: {
            ownerId,
            listingId: null,
            url: storedImage.url,
            storageProvider: storedImage.storageProvider,
            status: exports.MEDIA_ASSET_STATUS.Pending,
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
            status: exports.MEDIA_ASSET_STATUS.Pending,
            expiresAt,
        },
        select: { id: true },
    });
    await queues_1.mediaCleanupQueue.add('expire-pending', { mediaAssetId: asset.id, reason: 'abandoned_upload' }, {
        delay: ABANDONED_UPLOAD_TTL_MS,
        jobId: `media-expire-${asset.id}`,
    });
}
async function attachListingMediaAssets({ ownerId, listingId, photoUrls, db = prisma_1.prisma, }) {
    const refs = sellrOwnedPhotoRefs(photoUrls);
    if (refs.length === 0)
        return;
    const attachedAt = new Date();
    await Promise.all(refs.map((ref) => db.mediaAsset.upsert({
        where: { storageKey: ref.storageKey },
        update: {
            ownerId,
            listingId,
            url: ref.url,
            storageProvider: ref.storageProvider,
            status: exports.MEDIA_ASSET_STATUS.Attached,
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
            status: exports.MEDIA_ASSET_STATUS.Attached,
            attachedAt,
        },
    })));
}
async function queueListingPhotoUrlDeletion({ listingId, photoUrls, reason, }) {
    const refs = sellrOwnedPhotoRefs(photoUrls);
    if (refs.length === 0)
        return;
    const assets = await Promise.all(refs.map((ref) => prisma_1.prisma.mediaAsset.upsert({
        where: { storageKey: ref.storageKey },
        update: {
            listingId: listingId ?? null,
            url: ref.url,
            storageProvider: ref.storageProvider,
            status: exports.MEDIA_ASSET_STATUS.DeletionQueued,
            expiresAt: null,
            lastError: null,
        },
        create: {
            listingId: listingId ?? null,
            url: ref.url,
            storageKey: ref.storageKey,
            storageProvider: ref.storageProvider,
            status: exports.MEDIA_ASSET_STATUS.DeletionQueued,
        },
        select: { id: true },
    })));
    await Promise.all(assets.map((asset) => queueMediaAssetDeletion(asset.id, reason)));
}
async function queueRemovedListingPhotoDeletion({ listingId, previousPhotoUrls, nextPhotoUrls, }) {
    const nextStorageKeys = new Set(sellrOwnedPhotoRefs(nextPhotoUrls).map((ref) => ref.storageKey));
    const removedRefs = sellrOwnedPhotoRefs(previousPhotoUrls).filter((ref) => !nextStorageKeys.has(ref.storageKey));
    if (removedRefs.length === 0)
        return;
    await queueListingPhotoUrlDeletion({
        listingId,
        photoUrls: removedRefs.map((ref) => ref.url),
        reason: 'listing_photo_removed',
    });
}
function emptyStatusCounts() {
    return {
        [exports.MEDIA_ASSET_STATUS.Pending]: 0,
        [exports.MEDIA_ASSET_STATUS.Attached]: 0,
        [exports.MEDIA_ASSET_STATUS.DeletionQueued]: 0,
        [exports.MEDIA_ASSET_STATUS.Deleted]: 0,
        [exports.MEDIA_ASSET_STATUS.DeleteFailed]: 0,
    };
}
function isKnownMediaAssetStatus(status) {
    return Object.values(exports.MEDIA_ASSET_STATUS).includes(status);
}
async function getMediaCleanupHealth({ limit = 20, now = new Date(), db = prisma_1.prisma, } = {}) {
    const [statusGroups, expiredPendingCount, deleteFailedCount] = await Promise.all([
        db.mediaAsset.groupBy({
            by: ['status'],
            _count: { _all: true },
        }),
        db.mediaAsset.count({
            where: {
                status: exports.MEDIA_ASSET_STATUS.Pending,
                expiresAt: { lte: now },
            },
        }),
        db.mediaAsset.count({
            where: {
                status: exports.MEDIA_ASSET_STATUS.DeleteFailed,
            },
        }),
    ]);
    const countsByStatus = emptyStatusCounts();
    const otherStatusCounts = {};
    for (const group of statusGroups) {
        if (isKnownMediaAssetStatus(group.status)) {
            countsByStatus[group.status] = group._count._all;
        }
        else {
            otherStatusCounts[group.status] = group._count._all;
        }
    }
    const [expiredPending, deleteFailed] = await Promise.all([
        db.mediaAsset.findMany({
            where: {
                status: exports.MEDIA_ASSET_STATUS.Pending,
                expiresAt: { lte: now },
            },
            select: MEDIA_HEALTH_RECORD_SELECT,
            take: limit,
            orderBy: { expiresAt: 'asc' },
        }),
        db.mediaAsset.findMany({
            where: {
                status: exports.MEDIA_ASSET_STATUS.DeleteFailed,
            },
            select: MEDIA_HEALTH_RECORD_SELECT,
            take: limit,
            orderBy: { updatedAt: 'desc' },
        }),
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
async function queueExpiredPendingMediaCleanupBatch({ limit = 100, dryRun = false, now = new Date(), db = prisma_1.prisma, queue = queues_1.mediaCleanupQueue, } = {}) {
    const assets = (await db.mediaAsset.findMany({
        where: {
            status: exports.MEDIA_ASSET_STATUS.Pending,
            expiresAt: { lte: now },
        },
        select: { id: true },
        take: limit,
        orderBy: { expiresAt: 'asc' },
    }));
    if (!dryRun) {
        await Promise.all(assets.map((asset) => queueMediaAssetDeletion(asset.id, 'abandoned_upload', queue)));
    }
    return {
        matched: assets.length,
        queued: dryRun ? 0 : assets.length,
        dryRun,
        assetIds: assets.map((asset) => asset.id),
    };
}
async function retryFailedMediaCleanup({ limit = 100, dryRun = false, db = prisma_1.prisma, queue = queues_1.mediaCleanupQueue, } = {}) {
    const assets = (await db.mediaAsset.findMany({
        where: {
            status: exports.MEDIA_ASSET_STATUS.DeleteFailed,
        },
        select: { id: true },
        take: limit,
        orderBy: { updatedAt: 'asc' },
    }));
    if (!dryRun) {
        await Promise.all(assets.map((asset) => queueMediaAssetDeletion(asset.id, 'manual_retry', queue, `media-delete-${asset.id}-retry-${String(Date.now())}`)));
    }
    return {
        matched: assets.length,
        queued: dryRun ? 0 : assets.length,
        dryRun,
        assetIds: assets.map((asset) => asset.id),
    };
}
async function queueExpiredPendingMediaCleanup(limit = 100) {
    const result = await queueExpiredPendingMediaCleanupBatch({ limit });
    return result.queued;
}
