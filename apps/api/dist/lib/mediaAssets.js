"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEDIA_ASSET_STATUS = void 0;
exports.recordPendingListingImageUpload = recordPendingListingImageUpload;
exports.attachListingMediaAssets = attachListingMediaAssets;
exports.queueListingPhotoUrlDeletion = queueListingPhotoUrlDeletion;
exports.queueRemovedListingPhotoDeletion = queueRemovedListingPhotoDeletion;
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
async function queueMediaAssetDeletion(mediaAssetId, reason) {
    await queues_1.mediaCleanupQueue.add('delete', { mediaAssetId, reason }, { jobId: `media-delete-${mediaAssetId}` });
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
async function queueExpiredPendingMediaCleanup(limit = 100) {
    const assets = await prisma_1.prisma.mediaAsset.findMany({
        where: {
            status: exports.MEDIA_ASSET_STATUS.Pending,
            expiresAt: { lte: new Date() },
        },
        select: { id: true },
        take: limit,
        orderBy: { expiresAt: 'asc' },
    });
    await Promise.all(assets.map((asset) => queueMediaAssetDeletion(asset.id, 'abandoned_upload')));
    return assets.length;
}
