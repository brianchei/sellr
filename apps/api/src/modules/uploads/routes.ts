import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyPluginCallback } from 'fastify';
import {
  LISTING_IMAGE_MAX_BYTES,
  LISTING_IMAGE_MIME_TYPES,
  LISTING_IMAGE_UPLOAD_PATH_PREFIX,
} from '@sellr/shared';
import { ok } from '../../lib/response';
import { verifyJWT } from '../../middleware/auth';

const MIME_TO_EXTENSION: Record<
  (typeof LISTING_IMAGE_MIME_TYPES)[number],
  string
> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function uploadRoot(): string {
  return process.env.SELLR_UPLOAD_DIR ?? path.resolve(process.cwd(), 'uploads');
}

function listingImagesDir(): string {
  return path.join(uploadRoot(), 'listing-images');
}

function isSupportedMimeType(
  mimetype: string,
): mimetype is (typeof LISTING_IMAGE_MIME_TYPES)[number] {
  return LISTING_IMAGE_MIME_TYPES.includes(
    mimetype as (typeof LISTING_IMAGE_MIME_TYPES)[number],
  );
}

function listingImagePath(filename: string): string | null {
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(filename)) {
    return null;
  }
  return path.join(listingImagesDir(), filename);
}

const plugin: FastifyPluginCallback = (fastify, _opts, done) => {
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

      if (!isSupportedMimeType(file.mimetype)) {
        return reply.code(400).send({
          error: 'Upload a JPG, PNG, or WebP image',
        });
      }

      const buffer = await file.toBuffer();
      if (file.file.truncated) {
        return reply.code(413).send({ error: 'Keep each image under 3 MB' });
      }

      const extension = MIME_TO_EXTENSION[file.mimetype];
      const filename = `${randomUUID()}.${extension}`;
      await mkdir(listingImagesDir(), { recursive: true });
      await writeFile(path.join(listingImagesDir(), filename), buffer, {
        flag: 'wx',
      });

      return reply
        .code(201)
        .send(ok({ url: `${LISTING_IMAGE_UPLOAD_PATH_PREFIX}${filename}` }));
    },
  );

  fastify.get(
    '/listing-images/:filename',
    { preHandler: verifyJWT },
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

      const extension = path.extname(filename).toLowerCase();
      const mimetype =
        extension === '.png'
          ? 'image/png'
          : extension === '.webp'
            ? 'image/webp'
            : 'image/jpeg';

      return reply
        .type(mimetype)
        .header('Cache-Control', 'private, max-age=604800')
        .send(createReadStream(filePath));
    },
  );

  done();
};

export const uploadRoutes = plugin;
