import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  LISTING_IMAGE_MIME_TYPES,
  LISTING_IMAGE_UPLOAD_PATH_PREFIX,
  PROFILE_AVATAR_UPLOAD_PATH_PREFIX,
} from '@sellr/shared';
import { logger } from './logger';
import { captureOperationalError } from './observability';

export type ListingImageMimeType = (typeof LISTING_IMAGE_MIME_TYPES)[number];

export type StoredListingImage = {
  filename: string;
  key: string;
  url: string;
  storageProvider: ListingImageStorageProvider;
};

export type ListingImageStorageProvider = 'local' | 'r2';

export type ListingImageStorageReference = {
  storageKey: string;
  storageProvider: ListingImageStorageProvider;
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

export function profileAvatarsDir(): string {
  return path.join(listingImageUploadRoot(), 'profile-avatars');
}

export function listingImagePath(filename: string): string | null {
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(filename)) {
    return null;
  }
  return path.join(listingImagesDir(), filename);
}

export function profileAvatarPath(filename: string): string | null {
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(filename)) {
    return null;
  }
  return path.join(profileAvatarsDir(), filename);
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

function createProfileAvatarKey(filename: string): string {
  return `profile-avatars/${filename}`;
}

function filenameFromListingImageKey(storageKey: string): string | null {
  const match = /^listing-images\/([a-f0-9-]+\.(jpg|png|webp))$/i.exec(
    storageKey,
  );
  return match?.[1] ?? null;
}

function filenameFromProfileAvatarKey(storageKey: string): string | null {
  const match = /^profile-avatars\/([a-f0-9-]+\.(jpg|png|webp))$/i.exec(
    storageKey,
  );
  return match?.[1] ?? null;
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

function configuredPublicBaseUrl(): string | null {
  const value = process.env.CLOUDFLARE_CDN_URL?.trim();
  return value ? trimTrailingSlash(value) : null;
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
        storageProvider: 'local',
      };
    },
  };
}

function createLocalProfileAvatarStorage(): ListingImageStorage {
  return {
    async store(buffer, mimetype) {
      const filename = createFilename(mimetype);
      await mkdir(profileAvatarsDir(), { recursive: true });
      await writeFile(path.join(profileAvatarsDir(), filename), buffer, {
        flag: 'wx',
      });

      return {
        filename,
        key: createProfileAvatarKey(filename),
        url: `${PROFILE_AVATAR_UPLOAD_PATH_PREFIX}${filename}`,
        storageProvider: 'local',
      };
    },
  };
}

function createR2Client() {
  const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
  });
}

function createR2ListingImageStorage(): ListingImageStorage {
  const bucket = requireEnv('R2_BUCKET_NAME');
  const publicBaseUrl = requirePublicBaseUrl();
  const s3 = createR2Client();

  return {
    async store(buffer, mimetype) {
      const filename = createFilename(mimetype);
      const key = createListingImageKey(filename);

      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: mimetype,
            CacheControl: ONE_YEAR_IMMUTABLE,
          }),
        );
      } catch (error) {
        logger.error(
          {
            err: error,
            operation: 'r2.put_object',
            bucket,
            storageKey: key,
            contentType: mimetype,
          },
          'R2 listing image upload failed',
        );
        captureOperationalError(error, {
          component: 'r2',
          operation: 'put_object',
          extra: {
            bucket,
            storageKey: key,
            contentType: mimetype,
          },
        });
        throw error;
      }

      return {
        filename,
        key,
        url: `${publicBaseUrl}/${key}`,
        storageProvider: 'r2',
      };
    },
  };
}

function createR2ProfileAvatarStorage(): ListingImageStorage {
  const bucket = requireEnv('R2_BUCKET_NAME');
  const publicBaseUrl = requirePublicBaseUrl();
  const s3 = createR2Client();

  return {
    async store(buffer, mimetype) {
      const filename = createFilename(mimetype);
      const key = createProfileAvatarKey(filename);

      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: mimetype,
            CacheControl: ONE_YEAR_IMMUTABLE,
          }),
        );
      } catch (error) {
        logger.error(
          {
            err: error,
            operation: 'r2.put_object',
            bucket,
            storageKey: key,
            contentType: mimetype,
          },
          'R2 profile avatar upload failed',
        );
        captureOperationalError(error, {
          component: 'r2',
          operation: 'put_object',
          extra: {
            bucket,
            storageKey: key,
            contentType: mimetype,
          },
        });
        throw error;
      }

      return {
        filename,
        key,
        url: `${publicBaseUrl}/${key}`,
        storageProvider: 'r2',
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

export function createProfileAvatarStorage(): ListingImageStorage {
  if (shouldUseR2Storage()) {
    return createR2ProfileAvatarStorage();
  }
  return createLocalProfileAvatarStorage();
}

export const LISTING_IMAGE_CACHE_CONTROL = ONE_YEAR_IMMUTABLE;

export function listingImageStorageReferenceFromUrl(
  url: string,
): ListingImageStorageReference | null {
  if (url.startsWith(LISTING_IMAGE_UPLOAD_PATH_PREFIX)) {
    const filename = url.slice(LISTING_IMAGE_UPLOAD_PATH_PREFIX.length);
    if (!filenameFromListingImageKey(createListingImageKey(filename))) {
      return null;
    }
    return {
      storageKey: createListingImageKey(filename),
      storageProvider: 'local',
    };
  }

  const publicBaseUrl = configuredPublicBaseUrl();
  if (!publicBaseUrl) return null;

  let parsedUrl: URL;
  let parsedBase: URL;
  try {
    parsedUrl = new URL(url);
    parsedBase = new URL(publicBaseUrl);
  } catch {
    return null;
  }

  if (
    parsedUrl.protocol !== parsedBase.protocol ||
    parsedUrl.hostname !== parsedBase.hostname ||
    parsedUrl.port !== parsedBase.port
  ) {
    return null;
  }

  const basePath = parsedBase.pathname.replace(/\/$/, '');
  const pathPrefix = basePath ? `${basePath}/` : '/';
  if (!parsedUrl.pathname.startsWith(pathPrefix)) return null;

  const storageKey = decodeURIComponent(
    parsedUrl.pathname.slice(pathPrefix.length),
  );
  if (!filenameFromListingImageKey(storageKey)) return null;

  return {
    storageKey,
    storageProvider: 'r2',
  };
}

export function profileAvatarStorageReferenceFromUrl(
  url: string,
): ListingImageStorageReference | null {
  if (url.startsWith(PROFILE_AVATAR_UPLOAD_PATH_PREFIX)) {
    const filename = url.slice(PROFILE_AVATAR_UPLOAD_PATH_PREFIX.length);
    if (!filenameFromProfileAvatarKey(createProfileAvatarKey(filename))) {
      return null;
    }
    return {
      storageKey: createProfileAvatarKey(filename),
      storageProvider: 'local',
    };
  }

  const publicBaseUrl = configuredPublicBaseUrl();
  if (!publicBaseUrl) return null;

  let parsedUrl: URL;
  let parsedBase: URL;
  try {
    parsedUrl = new URL(url);
    parsedBase = new URL(publicBaseUrl);
  } catch {
    return null;
  }

  if (
    parsedUrl.protocol !== parsedBase.protocol ||
    parsedUrl.hostname !== parsedBase.hostname ||
    parsedUrl.port !== parsedBase.port
  ) {
    return null;
  }

  const basePath = parsedBase.pathname.replace(/\/$/, '');
  const pathPrefix = basePath ? `${basePath}/` : '/';
  if (!parsedUrl.pathname.startsWith(pathPrefix)) return null;

  const storageKey = decodeURIComponent(
    parsedUrl.pathname.slice(pathPrefix.length),
  );
  if (!filenameFromProfileAvatarKey(storageKey)) return null;

  return {
    storageKey,
    storageProvider: 'r2',
  };
}

export async function deleteListingImageObject(
  reference: ListingImageStorageReference,
): Promise<void> {
  if (reference.storageProvider === 'local') {
    const filename = filenameFromListingImageKey(reference.storageKey);
    if (!filename) return;
    const filePath = listingImagePath(filename);
    if (!filePath) return;
    try {
      await unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
    return;
  }

  const bucket = requireEnv('R2_BUCKET_NAME');
  try {
    await createR2Client().send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: reference.storageKey,
      }),
    );
  } catch (error) {
    logger.error(
      {
        err: error,
        operation: 'r2.delete_object',
        bucket,
        storageKey: reference.storageKey,
      },
      'R2 listing image deletion failed',
    );
    captureOperationalError(error, {
      component: 'r2',
      operation: 'delete_object',
      extra: {
        bucket,
        storageKey: reference.storageKey,
      },
    });
    throw error;
  }
}
