"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRoutes = void 0;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const shared_1 = require("@sellr/shared");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
const MIME_TO_EXTENSION = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};
function uploadRoot() {
    return process.env.SELLR_UPLOAD_DIR ?? node_path_1.default.resolve(process.cwd(), 'uploads');
}
function listingImagesDir() {
    return node_path_1.default.join(uploadRoot(), 'listing-images');
}
function isSupportedMimeType(mimetype) {
    return shared_1.LISTING_IMAGE_MIME_TYPES.includes(mimetype);
}
function listingImagePath(filename) {
    if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(filename)) {
        return null;
    }
    return node_path_1.default.join(listingImagesDir(), filename);
}
const plugin = (fastify, _opts, done) => {
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
        const filename = `${(0, node_crypto_1.randomUUID)()}.${extension}`;
        await (0, promises_1.mkdir)(listingImagesDir(), { recursive: true });
        await (0, promises_1.writeFile)(node_path_1.default.join(listingImagesDir(), filename), buffer, {
            flag: 'wx',
        });
        return reply
            .code(201)
            .send((0, response_1.ok)({ url: `${shared_1.LISTING_IMAGE_UPLOAD_PATH_PREFIX}${filename}` }));
    });
    fastify.get('/listing-images/:filename', { preHandler: auth_1.verifyJWT }, async (request, reply) => {
        const { filename } = request.params;
        const filePath = listingImagePath(filename);
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
        const extension = node_path_1.default.extname(filename).toLowerCase();
        const mimetype = extension === '.png'
            ? 'image/png'
            : extension === '.webp'
                ? 'image/webp'
                : 'image/jpeg';
        return reply
            .type(mimetype)
            .header('Cache-Control', 'private, max-age=604800')
            .send((0, node_fs_1.createReadStream)(filePath));
    });
    done();
};
exports.uploadRoutes = plugin;
