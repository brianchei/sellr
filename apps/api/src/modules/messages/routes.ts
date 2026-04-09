import fp from 'fastify-plugin';
import type { FastifyPluginCallback } from 'fastify';
import { CreateConversationSchema, CreateMessageSchema } from '@sellr/shared';
import { prisma } from '../../lib/prisma';
import { notifyUser } from '../../lib/notifyUser';
import { ok } from '../../lib/response';
import { verifyJWT } from '../../middleware/auth';

const plugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.post(
    '/',
    {
      preHandler: verifyJWT,
      schema: { body: CreateConversationSchema },
    },
    async (request, reply) => {
      const body = CreateConversationSchema.parse(request.body);
      const listing = await prisma.listing.findUnique({
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

      const existing = await prisma.conversation.findFirst({
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
        return reply.send(ok({ conversation: existing }));
      }

      const conversation = await prisma.conversation.create({
        data: {
          listingId: listing.id,
          participantIds: [buyerId, sellerId],
          type: 'pre_offer',
        },
      });

      return reply.code(201).send(ok({ conversation }));
    },
  );

  fastify.get(
    '/:conversationId/messages',
    { preHandler: verifyJWT },
    async (request, reply) => {
      const { conversationId } = request.params as { conversationId: string };
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conv) {
        return reply.code(404).send({ error: 'Conversation not found' });
      }
      if (!conv.participantIds.includes(request.user.sub)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });

      return reply.send(ok({ messages }));
    },
  );

  fastify.post(
    '/:conversationId/messages',
    {
      preHandler: verifyJWT,
      schema: { body: CreateMessageSchema },
    },
    async (request, reply) => {
      const { conversationId } = request.params as { conversationId: string };
      const body = CreateMessageSchema.parse(request.body);

      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conv) {
        return reply.code(404).send({ error: 'Conversation not found' });
      }
      if (!conv.participantIds.includes(request.user.sub)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: request.user.sub,
          content: body.content,
        },
      });

      const peerId = conv.participantIds.find((id) => id !== request.user.sub);
      if (peerId) {
        await notifyUser(peerId, 'new_message', {
          conversationId,
          messageId: message.id,
          preview: body.content.slice(0, 120),
        });
      }

      return reply.code(201).send(ok({ message }));
    },
  );

  done();
};

export const messageRoutes = fp(plugin);
