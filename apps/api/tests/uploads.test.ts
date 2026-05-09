import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cookiesPlugin } from '../src/plugins/cookies';
import { jwtPlugin } from '../src/plugins/jwt';
import { uploadRoutes } from '../src/modules/uploads/routes';
import {
  createListingImageStorage,
  isListingImageMimeType,
  listingImageStorageReferenceFromUrl,
  type ListingImageStorage,
} from '../src/lib/listingImageStorage';

const ENV_KEYS = [
  'NODE_ENV',
  'LISTING_IMAGE_STORAGE_DRIVER',
  'CLOUDFLARE_ACCOUNT_ID',
  'R2_BUCKET_NAME',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'CLOUDFLARE_CDN_URL',
] as const;

const originalEnv = new Map(
  ENV_KEYS.map((key) => [key, process.env[key]] as const),
);

function restoreEnv(): void {
  for (const key of ENV_KEYS) {
    const value = originalEnv.get(key);
    if (value == null) {
      Reflect.deleteProperty(process.env, key);
    } else {
      process.env[key] = value;
    }
  }
}

function multipartImagePayload({
  mimetype = 'image/jpeg',
  content = 'fake-image-bytes',
}: {
  mimetype?: string;
  content?: string;
} = {}) {
  const boundary = '----sellr-upload-test';
  const body = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="photo.jpg"`,
    `Content-Type: ${mimetype}`,
    '',
    content,
    `--${boundary}--`,
    '',
  ].join('\r\n');

  return {
    body: Buffer.from(body),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function buildUploadApp(
  storage: ListingImageStorage,
  recordPendingUpload = vi.fn(() => Promise.resolve()),
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(cookiesPlugin);
  await app.register(jwtPlugin);
  await app.register(multipart);
  await app.register(uploadRoutes, {
    prefix: '/api/v1/uploads',
    storage,
    mediaTracker: {
      recordPendingUpload,
    },
  });
  await app.ready();
  return app;
}

function authHeader(app: FastifyInstance) {
  const token = app.jwt.sign({
    sub: '11111111-1111-1111-1111-111111111111',
    communityIds: [],
    role: {},
  });
  return { authorization: `Bearer ${token}` };
}

afterEach(() => {
  restoreEnv();
  vi.restoreAllMocks();
});

describe('listing image upload route', () => {
  it('stores supported images and returns the storage URL', async () => {
    const store = vi.fn(() =>
      Promise.resolve({
        filename: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg',
        key: 'listing-images/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg',
        url: 'https://cdn.sellr.com/listing-images/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg',
        storageProvider: 'r2' as const,
      }),
    );
    const recordPendingUpload = vi.fn(() => Promise.resolve());
    const app = await buildUploadApp({ store }, recordPendingUpload);
    const payload = multipartImagePayload();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads/listing-images',
      headers: {
        ...authHeader(app),
        'content-type': payload.contentType,
      },
      payload: payload.body,
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      data: {
        url: 'https://cdn.sellr.com/listing-images/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg',
      },
    });
    expect(store).toHaveBeenCalledWith(expect.any(Buffer), 'image/jpeg');
    expect(recordPendingUpload).toHaveBeenCalledWith({
      ownerId: '11111111-1111-1111-1111-111111111111',
      storedImage: {
        filename: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg',
        key: 'listing-images/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg',
        url: 'https://cdn.sellr.com/listing-images/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg',
        storageProvider: 'r2',
      },
    });
    await app.close();
  });

  it('rejects unsupported image MIME types before storage', async () => {
    const store = vi.fn();
    const app = await buildUploadApp({ store });
    const payload = multipartImagePayload({ mimetype: 'image/gif' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads/listing-images',
      headers: {
        ...authHeader(app),
        'content-type': payload.contentType,
      },
      payload: payload.body,
    });

    expect(res.statusCode).toBe(400);
    expect(store).not.toHaveBeenCalled();
    await app.close();
  });

  it('returns a friendly error when durable storage fails', async () => {
    const app = await buildUploadApp({
      store: vi.fn(() => Promise.reject(new Error('R2 unavailable'))),
    });
    const payload = multipartImagePayload();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads/listing-images',
      headers: {
        ...authHeader(app),
        'content-type': payload.contentType,
      },
      payload: payload.body,
    });

    expect(res.statusCode).toBe(502);
    expect(res.json()).toEqual({
      error: 'Could not upload this image. Try again.',
    });
    await app.close();
  });
});

describe('listing image storage selection', () => {
  it('recognizes only the supported listing image MIME types', () => {
    expect(isListingImageMimeType('image/jpeg')).toBe(true);
    expect(isListingImageMimeType('image/png')).toBe(true);
    expect(isListingImageMimeType('image/webp')).toBe(true);
    expect(isListingImageMimeType('image/gif')).toBe(false);
  });

  it('keeps local storage as the default outside production', () => {
    process.env.NODE_ENV = 'test';
    Reflect.deleteProperty(process.env, 'LISTING_IMAGE_STORAGE_DRIVER');

    expect(() => createListingImageStorage()).not.toThrow();
  });

  it('requires R2 configuration in production', () => {
    process.env.NODE_ENV = 'production';
    Reflect.deleteProperty(process.env, 'LISTING_IMAGE_STORAGE_DRIVER');
    Reflect.deleteProperty(process.env, 'CLOUDFLARE_ACCOUNT_ID');

    expect(() => createListingImageStorage()).toThrow(
      /CLOUDFLARE_ACCOUNT_ID is required/,
    );
  });

  it('allows an explicit local storage driver', () => {
    process.env.NODE_ENV = 'production';
    process.env.LISTING_IMAGE_STORAGE_DRIVER = 'local';

    expect(() => createListingImageStorage()).not.toThrow();
  });

  it('identifies only Sellr-owned media URLs for cleanup', () => {
    process.env.CLOUDFLARE_CDN_URL = 'https://cdn.sellr.com';

    expect(
      listingImageStorageReferenceFromUrl(
        'https://cdn.sellr.com/listing-images/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg',
      ),
    ).toEqual({
      storageKey: 'listing-images/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg',
      storageProvider: 'r2',
    });
    expect(
      listingImageStorageReferenceFromUrl(
        '/api/v1/uploads/listing-images/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.png',
      ),
    ).toEqual({
      storageKey: 'listing-images/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.png',
      storageProvider: 'local',
    });
    expect(
      listingImageStorageReferenceFromUrl(
        'https://images.unsplash.com/photo-123.jpg',
      ),
    ).toBeNull();
  });
});
