import fp from 'fastify-plugin';
import type { FastifyPluginCallback } from 'fastify';
import { ListNotificationsQuerySchema } from '@sellr/shared';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { verifyJWT } from '../../middleware/auth';

const plugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get(
    '/',
    {
      preHandler: verifyJWT,
      schema: { querystring: ListNotificationsQuerySchema },
    },
    async (request, reply) => {
      const { limit, unreadOnly } = ListNotificationsQuerySchema.parse(
        request.query,
      );

      const notifications = await prisma.notification.findMany({
        where: {
          userId: request.user.sub,
          ...(unreadOnly ? { readAt: null } : {}),
        },
        orderBy: { sentAt: 'desc' },
        take: limit,
      });

      return reply.send(ok({ notifications }));
    },
  );

  fastify.post(
    '/read-all',
    { preHandler: verifyJWT },
    async (request, reply) => {
      const result = await prisma.notification.updateMany({
        where: { userId: request.user.sub, readAt: null },
        data: { readAt: new Date() },
      });

      return reply.send(ok({ updatedCount: result.count }));
    },
  );

  fastify.post(
    '/:notificationId/read',
    { preHandler: verifyJWT },
    async (request, reply) => {
      const { notificationId } = request.params as { notificationId: string };

      const existing = await prisma.notification.findFirst({
        where: { id: notificationId, userId: request.user.sub },
      });
      if (!existing) {
        return reply.code(404).send({ error: 'Notification not found' });
      }

      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: { readAt: new Date() },
      });

      return reply.send(ok({ notification }));
    },
  );

  done();
};

export const notificationRoutes = fp(plugin);
