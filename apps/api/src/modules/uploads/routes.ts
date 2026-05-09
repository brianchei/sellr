import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { FastifyPluginCallback } from 'fastify';
import { LISTING_IMAGE_MAX_BYTES } from '@sellr/shared';
import {
  createListingImageStorage,
  deleteListingImageObject,
  isListingImageMimeType,
  LISTING_IMAGE_CACHE_CONTROL,
  listingImageMimeTypeForFilename,
  listingImagePath,
  type ListingImageStorage,
  type StoredListingImage,
} from '../../lib/listingImageStorage';
import { ok } from '../../lib/response';
import { verifyJWT } from '../../middleware/auth';

type MediaTracker = {
  recordPendingUpload(args: {
    ownerId: string;
    storedImage: StoredListingImage;
  }): Promise<void>;
};

type UploadRoutesOptions = {
  storage?: ListingImageStorage;
  mediaTracker?: MediaTracker;
};

async function defaultMediaTracker(): Promise<MediaTracker> {
  const { recordPendingListingImageUpload } =
    await import('../../lib/mediaAssets.js');
  return {
    recordPendingUpload: recordPendingListingImageUpload,
  };
}

const plugin: FastifyPluginCallback<UploadRoutesOptions> = (
  fastify,
  opts,
  done,
) => {
  const storage = opts.storage ?? createListingImageStorage();

  fastify.post(
    '/listing-images',
    { preHandler: verifyJWT },
    async (request, reply) => {
      const file = await request.file({
        throwFileSizeLimit: false,
        limits: {
          fileSize: LISTING_IMAGE_MAX_BYTES,
          files: 1,
        },
      });

      if (!file) {
        return reply.code(400).send({ error: 'Choose an image to upload' });
      }

      if (!isListingImageMimeType(file.mimetype)) {
        return reply.code(400).send({
          error: 'Upload a JPG, PNG, or WebP image',
        });
      }

      const buffer = await file.toBuffer();
      if (file.file.truncated) {
        return reply.code(413).send({ error: 'Keep each image under 3 MB' });
      }

      let storedImage: StoredListingImage;
      try {
        storedImage = await storage.store(buffer, file.mimetype);
      } catch (error) {
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
      } catch (error) {
        request.log.error({ err: error }, 'listing image tracking failed');
        try {
          await deleteListingImageObject({
            storageKey: storedImage.key,
            storageProvider: storedImage.storageProvider,
          });
        } catch (deleteError) {
          request.log.error(
            { err: deleteError },
            'untracked listing image cleanup failed',
          );
        }
        return reply
          .code(502)
          .send({ error: 'Could not upload this image. Try again.' });
      }

      return reply.code(201).send(ok({ url: storedImage.url }));
    },
  );

  // Listing photos are served publicly so the Next.js Image Optimizer (which
  // fetches server-side without the user's session cookie) can pull them, and
  // so any community member can render them without an extra auth round-trip.
  // Filenames are random UUIDs, files are content-addressable / immutable, and
  // listings inside a community are otherwise discoverable by members anyway.
  // R2/CDN uploads return absolute CDN URLs, but this route remains for older
  // same-origin upload paths and for local development/test storage.
  fastify.get(
    '/listing-images/:filename',
    { config: { rateLimit: false } },
    async (request, reply) => {
      const { filename } = request.params as { filename: string };
      const filePath = listingImagePath(filename);
      if (!filePath) {
        return await reply.code(404).send({ error: 'Image not found' });
      }

      try {
        const imageStat = await stat(filePath);
        if (!imageStat.isFile()) {
          return await reply.code(404).send({ error: 'Image not found' });
        }
      } catch {
        return reply.code(404).send({ error: 'Image not found' });
      }

      return reply
        .type(listingImageMimeTypeForFilename(filename))
        .header('Cache-Control', LISTING_IMAGE_CACHE_CONTROL)
        .send(createReadStream(filePath));
    },
  );

  done();
};

export const uploadRoutes = plugin;
