"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listingRoutes = void 0;
const client_1 = require("../../generated/prisma/client");
const shared_1 = require("@sellr/shared");
const prisma_1 = require("../../lib/prisma");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
const repository_1 = require("./repository");
const queues_1 = require("../../lib/queues");
const plugin = (fastify, _opts, done) => {
    fastify.get('/nearby', {
        preHandler: auth_1.verifyJWT,
        schema: {
            querystring: shared_1.NearbyListingsQuerySchema,
        },
    }, async (request, reply) => {
        const { communityId, lat, lng, radiusM } = shared_1.NearbyListingsQuerySchema.parse(request.query);
        if (!request.user.communityIds.includes(communityId)) {
            return reply
                .code(403)
                .send({ error: 'Not a member of this community' });
        }
        const listings = await (0, repository_1.findListingsNearby)({
            communityId,
            lat,
            lng,
            radiusM,
        });
        return reply.send((0, response_1.ok)({ listings }));
    });
    fastify.get('/', {
        preHandler: auth_1.verifyJWT,
        schema: { querystring: shared_1.ListListingsQuerySchema },
    }, async (request, reply) => {
        const { communityId, limit } = shared_1.ListListingsQuerySchema.parse(request.query);
        if (!request.user.communityIds.includes(communityId)) {
            return reply
                .code(403)
                .send({ error: 'Not a member of this community' });
        }
        const listings = await prisma_1.prisma.listing.findMany({
            where: { communityId, status: 'active' },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return reply.send((0, response_1.ok)({ listings }));
    });
    fastify.get('/mine', {
        preHandler: auth_1.verifyJWT,
        schema: { querystring: shared_1.ListSellerListingsQuerySchema },
    }, async (request, reply) => {
        const { communityId, limit, status } = shared_1.ListSellerListingsQuerySchema.parse(request.query);
        if (!request.user.communityIds.includes(communityId)) {
            return reply
                .code(403)
                .send({ error: 'Not a member of this community' });
        }
        const listings = await prisma_1.prisma.listing.findMany({
            where: {
                communityId,
                sellerId: request.user.sub,
                ...(status !== undefined ? { status } : {}),
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
        });
        return reply.send((0, response_1.ok)({ listings }));
    });
    fastify.post('/', {
        preHandler: auth_1.verifyJWT,
        schema: { body: shared_1.CreateListingSchema },
    }, async (request, reply) => {
        const body = shared_1.CreateListingSchema.parse(request.body);
        if (!request.user.communityIds.includes(body.communityId)) {
            return reply
                .code(403)
                .send({ error: 'Not a member of this community' });
        }
        const listing = await prisma_1.prisma.listing.create({
            data: {
                communityId: body.communityId,
                sellerId: request.user.sub,
                title: body.title,
                description: body.description,
                category: body.category,
                subcategory: body.subcategory,
                condition: body.condition,
                conditionNote: body.conditionNote,
                price: new client_1.Prisma.Decimal(String(body.price)),
                negotiable: body.negotiable,
                locationNeighborhood: body.locationNeighborhood,
                locationRadiusM: body.locationRadiusM,
                availabilityWindows: body.availabilityWindows,
                photoUrls: body.photoUrls,
                aiGenerated: body.aiGenerated,
                status: 'draft',
            },
        });
        if (body.lat !== undefined && body.lng !== undefined) {
            await (0, repository_1.setListingLocationGeom)(listing.id, body.lat, body.lng);
        }
        return reply.code(201).send((0, response_1.ok)({ listing }));
    });
    fastify.post('/:listingId/publish', { preHandler: auth_1.verifyJWT }, async (request, reply) => {
        const { listingId } = request.params;
        const listing = await prisma_1.prisma.listing.findUnique({
            where: { id: listingId },
        });
        if (!listing) {
            return reply.code(404).send({ error: 'Listing not found' });
        }
        if (listing.sellerId !== request.user.sub) {
            return reply.code(403).send({ error: 'Only the seller can publish' });
        }
        if (!request.user.communityIds.includes(listing.communityId)) {
            return reply
                .code(403)
                .send({ error: 'Not a member of this community' });
        }
        const updated = await prisma_1.prisma.listing.update({
            where: { id: listingId },
            data: { status: 'active' },
        });
        await queues_1.searchSyncQueue.add('sync', {
            listingId: updated.id,
            action: 'upsert',
        });
        return reply.send((0, response_1.ok)({ listing: updated }));
    });
    fastify.post('/:listingId/unpublish', { preHandler: auth_1.verifyJWT }, async (request, reply) => {
        const { listingId } = request.params;
        const listing = await prisma_1.prisma.listing.findUnique({
            where: { id: listingId },
        });
        if (!listing) {
            return reply.code(404).send({ error: 'Listing not found' });
        }
        if (listing.sellerId !== request.user.sub) {
            return reply.code(403).send({ error: 'Only the seller can unpublish' });
        }
        if (!request.user.communityIds.includes(listing.communityId)) {
            return reply
                .code(403)
                .send({ error: 'Not a member of this community' });
        }
        const updated = await prisma_1.prisma.listing.update({
            where: { id: listingId },
            data: { status: 'draft' },
        });
        await queues_1.searchSyncQueue.add('sync', {
            listingId: updated.id,
            action: 'delete',
        });
        return reply.send((0, response_1.ok)({ listing: updated }));
    });
    fastify.delete('/:listingId', { preHandler: auth_1.verifyJWT }, async (request, reply) => {
        const { listingId } = request.params;
        const listing = await prisma_1.prisma.listing.findUnique({
            where: { id: listingId },
            include: {
                _count: {
                    select: {
                        conversations: true,
                        offers: true,
                    },
                },
            },
        });
        if (!listing) {
            return reply.code(404).send({ error: 'Listing not found' });
        }
        if (listing.sellerId !== request.user.sub) {
            return reply.code(403).send({ error: 'Only the seller can delete' });
        }
        if (!request.user.communityIds.includes(listing.communityId)) {
            return reply
                .code(403)
                .send({ error: 'Not a member of this community' });
        }
        if (listing._count.conversations > 0 || listing._count.offers > 0) {
            return reply.code(409).send({
                error: 'Listings with buyer activity cannot be deleted. Unpublish it instead.',
            });
        }
        await prisma_1.prisma.listing.delete({
            where: { id: listingId },
        });
        await queues_1.searchSyncQueue.add('sync', {
            listingId,
            action: 'delete',
        });
        return reply.send((0, response_1.ok)({ deleted: true }));
    });
    fastify.put('/:listingId', {
        preHandler: auth_1.verifyJWT,
        schema: { body: shared_1.UpdateListingSchema },
    }, async (request, reply) => {
        const { listingId } = request.params;
        const body = shared_1.UpdateListingSchema.parse(request.body);
        const listing = await prisma_1.prisma.listing.findUnique({
            where: { id: listingId },
        });
        if (!listing) {
            return reply.code(404).send({ error: 'Listing not found' });
        }
        if (listing.sellerId !== request.user.sub) {
            return reply.code(403).send({ error: 'Only the seller can edit' });
        }
        if (!request.user.communityIds.includes(listing.communityId)) {
            return reply
                .code(403)
                .send({ error: 'Not a member of this community' });
        }
        const updated = await prisma_1.prisma.listing.update({
            where: { id: listingId },
            data: {
                title: body.title,
                description: body.description,
                category: body.category,
                subcategory: body.subcategory ?? null,
                condition: body.condition,
                conditionNote: body.conditionNote ?? null,
                price: new client_1.Prisma.Decimal(String(body.price)),
                negotiable: body.negotiable,
                locationNeighborhood: body.locationNeighborhood,
                locationRadiusM: body.locationRadiusM,
                availabilityWindows: body.availabilityWindows,
                photoUrls: body.photoUrls,
            },
        });
        if (body.lat !== undefined && body.lng !== undefined) {
            await (0, repository_1.setListingLocationGeom)(updated.id, body.lat, body.lng);
        }
        if (updated.status === 'active') {
            await queues_1.searchSyncQueue.add('sync', {
                listingId: updated.id,
                action: 'upsert',
            });
        }
        return reply.send((0, response_1.ok)({ listing: updated }));
    });
    fastify.get('/:listingId', {
        preHandler: auth_1.verifyJWT,
    }, async (request, reply) => {
        const { listingId } = request.params;
        const listing = await prisma_1.prisma.listing.findUnique({
            where: { id: listingId },
            include: {
                seller: {
                    select: {
                        id: true,
                        displayName: true,
                        avatarUrl: true,
                        verifiedAt: true,
                    },
                },
            },
        });
        if (!listing) {
            return reply.code(404).send({ error: 'Listing not found' });
        }
        if (!request.user.communityIds.includes(listing.communityId)) {
            return reply
                .code(403)
                .send({ error: 'Not a member of this community' });
        }
        if (listing.status !== 'active' &&
            listing.sellerId !== request.user.sub) {
            return reply.code(404).send({ error: 'Listing not found' });
        }
        return reply.send((0, response_1.ok)({ listing }));
    });
    done();
};
exports.listingRoutes = plugin;
