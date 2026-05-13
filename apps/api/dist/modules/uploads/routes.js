"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRoutes = void 0;
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const shared_1 = require("@sellr/shared");
const listingImageStorage_1 = require("../../lib/listingImageStorage");
const observability_1 = require("../../lib/observability");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
async function defaultMediaTracker() {
    const { recordPendingListingImageUpload } = await import('../../lib/mediaAssets.js');
    return {
        recordPendingUpload: recordPendingListingImageUpload,
    };
}
const plugin = (fastify, opts, done) => {
    const storage = opts.storage ?? (0, listingImageStorage_1.createListingImageStorage)();
    const profileStorage = opts.profileStorage ?? (0, listingImageStorage_1.createProfileAvatarStorage)();
    fastify.post('/listing-images', { preHandler: auth_1.verifyJWT }, async (request, reply) => {
        const file = await request.file({
            throwFileSizeLimit: false,
            limits: {
                fileSize: shared_1.LISTING_IMAGE_MAX_BYTES,
                files: 1,
            },
        });
        if (!file) {
            return reply.code(400).send({ error: 'Choose an image to upload' });
        }
        if (!(0, listingImageStorage_1.isListingImageMimeType)(file.mimetype)) {
            return reply.code(400).send({
                error: 'Upload a JPG, PNG, or WebP image',
            });
        }
        const buffer = await file.toBuffer();
        if (file.file.truncated) {
            return reply.code(413).send({ error: 'Keep each image under 3 MB' });
        }
        let storedImage;
        try {
            storedImage = await storage.store(buffer, file.mimetype);
        }
        catch (error) {
            request.log.error({ err: error }, 'listing image upload failed');
            return reply
                .code(502)
                .send({ error: 'Could not upload this image. Try again.' });
        }
        try {
            const mediaTracker = opts.mediaTracker ?? (await defaultMediaTracker());
            await mediaTracker.recordPendingUpload({
                ownerId: request.user.sub,
                storedImage,
            });
        }
        catch (error) {
            request.log.error({ err: error }, 'listing image tracking failed');
            (0, observability_1.captureOperationalError)(error, {
                component: 'media_assets',
                operation: 'record_pending_upload',
                extra: {
                    storageKey: storedImage.key,
                    storageProvider: storedImage.storageProvider,
                },
                userId: request.user.sub,
            });
            try {
                await (0, listingImageStorage_1.deleteListingImageObject)({
                    storageKey: storedImage.key,
                    storageProvider: storedImage.storageProvider,
                });
            }
            catch (deleteError) {
                request.log.error({ err: deleteError }, 'untracked listing image cleanup failed');
                (0, observability_1.captureOperationalError)(deleteError, {
                    component: 'media_assets',
                    operation: 'cleanup_untracked_upload',
                    extra: {
                        storageKey: storedImage.key,
                        storageProvider: storedImage.storageProvider,
                    },
                    userId: request.user.sub,
                });
            }
            return reply
                .code(502)
                .send({ error: 'Could not upload this image. Try again.' });
        }
        return reply.code(201).send((0, response_1.ok)({ url: storedImage.url }));
    });
    fastify.post('/profile-avatars', { preHandler: auth_1.verifyJWT }, async (request, reply) => {
        const file = await request.file({
            throwFileSizeLimit: false,
            limits: {
                fileSize: shared_1.PROFILE_AVATAR_MAX_BYTES,
                files: 1,
            },
        });
        if (!file) {
            return reply.code(400).send({ error: 'Choose an image to upload' });
        }
        if (!(0, listingImageStorage_1.isListingImageMimeType)(file.mimetype)) {
            return reply.code(400).send({
                error: 'Upload a JPG, PNG, or WebP image',
            });
        }
        const buffer = await file.toBuffer();
        if (file.file.truncated) {
            return reply.code(413).send({ error: 'Keep this image under 3 MB' });
        }
        try {
            const storedImage = await profileStorage.store(buffer, file.mimetype);
            return await reply.code(201).send((0, response_1.ok)({ url: storedImage.url }));
        }
        catch (error) {
            request.log.error({ err: error }, 'profile avatar upload failed');
            return reply
                .code(502)
                .send({ error: 'Could not upload this image. Try again.' });
        }
    });
    // Listing photos are served publicly so the Next.js Image Optimizer (which
    // fetches server-side without the user's session cookie) can pull them, and
    // so any community member can render them without an extra auth round-trip.
    // Filenames are random UUIDs, files are content-addressable / immutable, and
    // listings inside a community are otherwise discoverable by members anyway.
    // R2/CDN uploads return absolute CDN URLs, but this route remains for older
    // same-origin upload paths and for local development/test storage.
    fastify.get('/listing-images/:filename', { config: { rateLimit: false } }, async (request, reply) => {
        const { filename } = request.params;
        const filePath = (0, listingImageStorage_1.listingImagePath)(filename);
        if (!filePath) {
            return await reply.code(404).send({ error: 'Image not found' });
        }
        try {
            const imageStat = await (0, promises_1.stat)(filePath);
            if (!imageStat.isFile()) {
                return await reply.code(404).send({ error: 'Image not found' });
            }
        }
        catch {
            return reply.code(404).send({ error: 'Image not found' });
        }
        return reply
            .type((0, listingImageStorage_1.listingImageMimeTypeForFilename)(filename))
            .header('Cache-Control', listingImageStorage_1.LISTING_IMAGE_CACHE_CONTROL)
            .send((0, node_fs_1.createReadStream)(filePath));
    });
    fastify.get('/profile-avatars/:filename', { config: { rateLimit: false } }, async (request, reply) => {
        const { filename } = request.params;
        const filePath = (0, listingImageStorage_1.profileAvatarPath)(filename);
        if (!filePath) {
            return await reply.code(404).send({ error: 'Image not found' });
        }
        try {
            const imageStat = await (0, promises_1.stat)(filePath);
            if (!imageStat.isFile()) {
                return await reply.code(404).send({ error: 'Image not found' });
            }
        }
        catch {
            return reply.code(404).send({ error: 'Image not found' });
        }
        return reply
            .type((0, listingImageStorage_1.listingImageMimeTypeForFilename)(filename))
            .header('Cache-Control', listingImageStorage_1.LISTING_IMAGE_CACHE_CONTROL)
            .send((0, node_fs_1.createReadStream)(filePath));
    });
    done();
};
exports.uploadRoutes = plugin;
