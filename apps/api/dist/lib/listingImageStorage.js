"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LISTING_IMAGE_CACHE_CONTROL = void 0;
exports.isListingImageMimeType = isListingImageMimeType;
exports.listingImageUploadRoot = listingImageUploadRoot;
exports.listingImagesDir = listingImagesDir;
exports.listingImagePath = listingImagePath;
exports.listingImageMimeTypeForFilename = listingImageMimeTypeForFilename;
exports.createListingImageStorage = createListingImageStorage;
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const client_s3_1 = require("@aws-sdk/client-s3");
const shared_1 = require("@sellr/shared");
const MIME_TO_EXTENSION = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};
const ONE_YEAR_IMMUTABLE = 'public, max-age=31536000, immutable';
function isListingImageMimeType(mimetype) {
    return shared_1.LISTING_IMAGE_MIME_TYPES.includes(mimetype);
}
function listingImageUploadRoot() {
    return process.env.SELLR_UPLOAD_DIR ?? node_path_1.default.resolve(process.cwd(), 'uploads');
}
function listingImagesDir() {
    return node_path_1.default.join(listingImageUploadRoot(), 'listing-images');
}
function listingImagePath(filename) {
    if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(filename)) {
        return null;
    }
    return node_path_1.default.join(listingImagesDir(), filename);
}
function listingImageMimeTypeForFilename(filename) {
    const extension = node_path_1.default.extname(filename).toLowerCase();
    if (extension === '.png')
        return 'image/png';
    if (extension === '.webp')
        return 'image/webp';
    return 'image/jpeg';
}
function createFilename(mimetype) {
    return `${(0, node_crypto_1.randomUUID)()}.${MIME_TO_EXTENSION[mimetype]}`;
}
function createListingImageKey(filename) {
    return `listing-images/${filename}`;
}
function trimTrailingSlash(value) {
    return value.replace(/\/+$/, '');
}
function requireEnv(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is required for R2 listing image storage`);
    }
    return value;
}
function requirePublicBaseUrl() {
    const value = trimTrailingSlash(requireEnv('CLOUDFLARE_CDN_URL'));
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error('CLOUDFLARE_CDN_URL must be an http(s) URL');
    }
    return value;
}
function shouldUseR2Storage() {
    const explicitDriver = process.env.LISTING_IMAGE_STORAGE_DRIVER?.trim();
    if (explicitDriver === 'r2')
        return true;
    if (explicitDriver === 'local')
        return false;
    if (explicitDriver) {
        throw new Error('LISTING_IMAGE_STORAGE_DRIVER must be either "local" or "r2"');
    }
    return process.env.NODE_ENV === 'production';
}
function createLocalListingImageStorage() {
    return {
        async store(buffer, mimetype) {
            const filename = createFilename(mimetype);
            await (0, promises_1.mkdir)(listingImagesDir(), { recursive: true });
            await (0, promises_1.writeFile)(node_path_1.default.join(listingImagesDir(), filename), buffer, {
                flag: 'wx',
            });
            return {
                filename,
                key: createListingImageKey(filename),
                url: `${shared_1.LISTING_IMAGE_UPLOAD_PATH_PREFIX}${filename}`,
            };
        },
    };
}
function createR2ListingImageStorage() {
    const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
    const bucket = requireEnv('R2_BUCKET_NAME');
    const publicBaseUrl = requirePublicBaseUrl();
    const s3 = new client_s3_1.S3Client({
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
            await s3.send(new client_s3_1.PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: buffer,
                ContentType: mimetype,
                CacheControl: ONE_YEAR_IMMUTABLE,
            }));
            return {
                filename,
                key,
                url: `${publicBaseUrl}/${key}`,
            };
        },
    };
}
function createListingImageStorage() {
    if (shouldUseR2Storage()) {
        return createR2ListingImageStorage();
    }
    return createLocalListingImageStorage();
}
exports.LISTING_IMAGE_CACHE_CONTROL = ONE_YEAR_IMMUTABLE;
