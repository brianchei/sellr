import type { FastifyPluginCallback } from 'fastify';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { verifyJWT } from '../../middleware/auth';

const plugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get(
    '/:meetupId',
    { preHandler: verifyJWT },
    async (request, reply) => {
      const { meetupId } = request.params as { meetupId: string };
      const meetup = await prisma.meetup.findUnique({
        where: { id: meetupId },
        include: { offer: { include: { listing: true } } },
      });
      if (!meetup) {
        return reply.code(404).send({ error: 'Meetup not found' });
      }
      if (
        meetup.offer.buyerId !== request.user.sub &&
        meetup.offer.sellerId !== request.user.sub
      ) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
      if (
        !request.user.communityIds.includes(meetup.offer.listing.communityId)
      ) {
        return reply
          .code(403)
          .send({ error: 'Not a member of this community' });
      }
      return reply.send(ok({ meetup }));
    },
  );

  done();
};

export const meetupRoutes = plugin;
