"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageRoutes = void 0;
const shared_1 = require("@sellr/shared");
const prisma_1 = require("../../lib/prisma");
const notifyUser_1 = require("../../lib/notifyUser");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
async function findConversationWithAccessContext(conversationId) {
    return prisma_1.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
            listing: {
                select: {
                    communityId: true,
                },
            },
            offer: {
                select: {
                    listing: {
                        select: {
                            communityId: true,
                        },
                    },
                },
            },
        },
    });
}
function getConversationCommunityId(conversation) {
    return (conversation.listing?.communityId ??
        conversation.offer?.listing.communityId ??
        null);
}
const plugin = (fastify, _opts, done) => {
    fastify.get('/', {
        preHandler: auth_1.verifyJWT,
        schema: { querystring: shared_1.ListConversationsQuerySchema },
    }, async (request, reply) => {
        const { limit } = shared_1.ListConversationsQuerySchema.parse(request.query);
        if (request.user.communityIds.length === 0) {
            return reply.send((0, response_1.ok)({ conversations: [] }));
        }
        const conversations = await prisma_1.prisma.conversation.findMany({
            where: {
                participantIds: { has: request.user.sub },
                listing: {
                    is: {
                        communityId: { in: request.user.communityIds },
                    },
                },
            },
            include: {
                listing: {
                    select: {
                        id: true,
                        sellerId: true,
                        title: true,
                        price: true,
                        photoUrls: true,
                        status: true,
                        locationNeighborhood: true,
                        createdAt: true,
                    },
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
                _count: {
                    select: {
                        messages: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        const peerIds = Array.from(new Set(conversations.flatMap((conversation) => conversation.participantIds.filter((id) => id !== request.user.sub))));
        const peers = peerIds.length
            ? await prisma_1.prisma.user.findMany({
                where: { id: { in: peerIds } },
                select: {
                    id: true,
                    displayName: true,
                    avatarUrl: true,
                    verifiedAt: true,
                },
            })
            : [];
        const peersById = new Map(peers.map((peer) => [peer.id, peer]));
        const summaries = conversations
            .map((conversation) => {
            const peerId = conversation.participantIds.find((id) => id !== request.user.sub);
            return {
                id: conversation.id,
                listingId: conversation.listingId,
                offerId: conversation.offerId,
                participantIds: conversation.participantIds,
                type: conversation.type,
                createdAt: conversation.createdAt,
                listing: conversation.listing,
                peer: peerId ? (peersById.get(peerId) ?? null) : null,
                latestMessage: conversation.messages.at(0) ?? null,
                messageCount: conversation._count.messages,
            };
        })
            .sort((left, right) => {
            const leftDate = left.latestMessage?.createdAt.getTime() ?? left.createdAt.getTime();
            const rightDate = right.latestMessage?.createdAt.getTime() ??
                right.createdAt.getTime();
            return rightDate - leftDate;
        });
        return reply.send((0, response_1.ok)({ conversations: summaries }));
    });
    fastify.post('/', {
        preHandler: auth_1.verifyJWT,
        schema: { body: shared_1.CreateConversationSchema },
    }, async (request, reply) => {
        const body = shared_1.CreateConversationSchema.parse(request.body);
        const listing = await prisma_1.prisma.listing.findUnique({
            where: { id: body.listingId },
        });
        if (!listing) {
            return reply.code(404).send({ error: 'Listing not found' });
        }
        if (!request.user.communityIds.includes(listing.communityId)) {
            return reply
                .code(403)
                .send({ error: 'Not a member of this community' });
        }
        const buyerId = request.user.sub;
        const sellerId = listing.sellerId;
        if (buyerId === sellerId) {
            return reply
                .code(400)
                .send({ error: 'Use seller tools for your own listing' });
        }
        if (listing.status !== 'active') {
            return reply.code(400).send({ error: 'Listing is not available' });
        }
        const existing = await prisma_1.prisma.conversation.findFirst({
            where: {
                listingId: listing.id,
                type: 'pre_offer',
                AND: [
                    { participantIds: { has: buyerId } },
                    { participantIds: { has: sellerId } },
                ],
            },
        });
        if (existing) {
            return reply.send((0, response_1.ok)({ conversation: existing }));
        }
        const conversation = await prisma_1.prisma.conversation.create({
            data: {
                listingId: listing.id,
                participantIds: [buyerId, sellerId],
                type: 'pre_offer',
            },
        });
        return reply.code(201).send((0, response_1.ok)({ conversation }));
    });
    fastify.get('/:conversationId/messages', { preHandler: auth_1.verifyJWT }, async (request, reply) => {
        const { conversationId } = request.params;
        const conv = await findConversationWithAccessContext(conversationId);
        if (!conv) {
            return reply.code(404).send({ error: 'Conversation not found' });
        }
        if (!conv.participantIds.includes(request.user.sub)) {
            return reply.code(403).send({ error: 'Forbidden' });
        }
        const communityId = getConversationCommunityId(conv);
        if (!communityId || !request.user.communityIds.includes(communityId)) {
            return reply.code(403).send({ error: 'Forbidden' });
        }
        const messages = await prisma_1.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
            take: 100,
        });
        return reply.send((0, response_1.ok)({ messages }));
    });
    fastify.post('/:conversationId/messages', {
        preHandler: auth_1.verifyJWT,
        schema: { body: shared_1.CreateMessageSchema },
    }, async (request, reply) => {
        const { conversationId } = request.params;
        const body = shared_1.CreateMessageSchema.parse(request.body);
        const conv = await findConversationWithAccessContext(conversationId);
        if (!conv) {
            return reply.code(404).send({ error: 'Conversation not found' });
        }
        if (!conv.participantIds.includes(request.user.sub)) {
            return reply.code(403).send({ error: 'Forbidden' });
        }
        const communityId = getConversationCommunityId(conv);
        if (!communityId || !request.user.communityIds.includes(communityId)) {
            return reply.code(403).send({ error: 'Forbidden' });
        }
        const message = await prisma_1.prisma.message.create({
            data: {
                conversationId,
                senderId: request.user.sub,
                content: body.content,
            },
        });
        const peerId = conv.participantIds.find((id) => id !== request.user.sub);
        if (peerId) {
            await (0, notifyUser_1.notifyUser)(peerId, 'new_message', {
                conversationId,
                messageId: message.id,
                preview: body.content.slice(0, 120),
            });
        }
        return reply.code(201).send((0, response_1.ok)({ message }));
    });
    done();
};
exports.messageRoutes = plugin;
