import fp from 'fastify-plugin';
import type { FastifyPluginCallback } from 'fastify';
import { NearbyListingsQuerySchema } from '@sellr/shared';
import { verifyJWT } from '../../middleware/auth';
import { findListingsNearby } from './repository';

const plugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get(
    '/nearby',
    {
      preHandler: verifyJWT,
      schema: {
        querystring: NearbyListingsQuerySchema,
      },
    },
    async (request, reply) => {
      const { communityId, lat, lng, radiusM } =
        NearbyListingsQuerySchema.parse(request.query);

      if (!request.user.communityIds.includes(communityId)) {
        return reply
          .code(403)
          .send({ error: 'Not a member of this community' });
      }

      const listings = await findListingsNearby({
        communityId,
        lat,
        lng,
        radiusM,
      });

      return { listings };
    },
  );
  done();
};

export const listingRoutes = fp(plugin);
