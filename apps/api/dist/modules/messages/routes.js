"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageRoutes = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const shared_1 = require("@sellr/shared");
const prisma_1 = require("../../lib/prisma");
const notifyUser_1 = require("../../lib/notifyUser");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
const plugin = (fastify, _opts, done) => {
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
        const conv = await prisma_1.prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!conv) {
            return reply.code(404).send({ error: 'Conversation not found' });
        }
        if (!conv.participantIds.includes(request.user.sub)) {
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
        const conv = await prisma_1.prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!conv) {
            return reply.code(404).send({ error: 'Conversation not found' });
        }
        if (!conv.participantIds.includes(request.user.sub)) {
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
exports.messageRoutes = (0, fastify_plugin_1.default)(plugin);
