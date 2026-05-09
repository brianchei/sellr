import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  LISTING_IMAGE_MIME_TYPES,
  LISTING_IMAGE_UPLOAD_PATH_PREFIX,
} from '@sellr/shared';

export type ListingImageMimeType = (typeof LISTING_IMAGE_MIME_TYPES)[number];

export type StoredListingImage = {
  filename: string;
  key: string;
  url: string;
};

export type ListingImageStorage = {
  store(
    buffer: Buffer,
    mimetype: ListingImageMimeType,
  ): Promise<StoredListingImage>;
};

const MIME_TO_EXTENSION: Record<ListingImageMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const ONE_YEAR_IMMUTABLE = 'public, max-age=31536000, immutable';

export function isListingImageMimeType(
  mimetype: string,
): mimetype is ListingImageMimeType {
  return LISTING_IMAGE_MIME_TYPES.includes(mimetype as ListingImageMimeType);
}

export function listingImageUploadRoot(): string {
  return process.env.SELLR_UPLOAD_DIR ?? path.resolve(process.cwd(), 'uploads');
}

export function listingImagesDir(): string {
  return path.join(listingImageUploadRoot(), 'listing-images');
}

export function listingImagePath(filename: string): string | null {
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(filename)) {
    return null;
  }
  return path.join(listingImagesDir(), filename);
}

export function listingImageMimeTypeForFilename(
  filename: string,
): ListingImageMimeType {
  const extension = path.extname(filename).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function createFilename(mimetype: ListingImageMimeType): string {
  return `${randomUUID()}.${MIME_TO_EXTENSION[mimetype]}`;
}

function createListingImageKey(filename: string): string {
  return `listing-images/${filename}`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for R2 listing image storage`);
  }
  return value;
}

function requirePublicBaseUrl(): string {
  const value = trimTrailingSlash(requireEnv('CLOUDFLARE_CDN_URL'));
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('CLOUDFLARE_CDN_URL must be an http(s) URL');
  }
  return value;
}

function shouldUseR2Storage(): boolean {
  const explicitDriver = process.env.LISTING_IMAGE_STORAGE_DRIVER?.trim();
  if (explicitDriver === 'r2') return true;
  if (explicitDriver === 'local') return false;
  if (explicitDriver) {
    throw new Error(
      'LISTING_IMAGE_STORAGE_DRIVER must be either "local" or "r2"',
    );
  }
  return process.env.NODE_ENV === 'production';
}

function createLocalListingImageStorage(): ListingImageStorage {
  return {
    async store(buffer, mimetype) {
      const filename = createFilename(mimetype);
      await mkdir(listingImagesDir(), { recursive: true });
      await writeFile(path.join(listingImagesDir(), filename), buffer, {
        flag: 'wx',
      });

      return {
        filename,
        key: createListingImageKey(filename),
        url: `${LISTING_IMAGE_UPLOAD_PATH_PREFIX}${filename}`,
      };
    },
  };
}

function createR2ListingImageStorage(): ListingImageStorage {
  const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
  const bucket = requireEnv('R2_BUCKET_NAME');
  const publicBaseUrl = requirePublicBaseUrl();

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
  });

  return {
    async store(buffer, mimetype) {
      const filename = createFilename(mimetype);
      const key = createListingImageKey(filename);

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: mimetype,
          CacheControl: ONE_YEAR_IMMUTABLE,
        }),
      );

      return {
        filename,
        key,
        url: `${publicBaseUrl}/${key}`,
      };
    },
  };
}

export function createListingImageStorage(): ListingImageStorage {
  if (shouldUseR2Storage()) {
    return createR2ListingImageStorage();
  }
  return createLocalListingImageStorage();
}

export const LISTING_IMAGE_CACHE_CONTROL = ONE_YEAR_IMMUTABLE;
