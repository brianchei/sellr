import type { FastifyPluginCallback } from 'fastify';
import { SearchListingsQuerySchema } from '@sellr/shared';
import { algolia, LISTINGS_INDEX } from '../../lib/algolia';
import { ok } from '../../lib/response';
import { verifyJWT } from '../../middleware/auth';

const plugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get(
    '/listings',
    {
      preHandler: verifyJWT,
      schema: {
        querystring: SearchListingsQuerySchema,
      },
    },
    async (request, reply) => {
      const { communityId, q, page, hitsPerPage, lat, lng } =
        SearchListingsQuerySchema.parse(request.query);

      if (!request.user.communityIds.includes(communityId)) {
        return reply
          .code(403)
          .send({ error: 'Not a member of this community' });
      }

      if (!algolia) {
        return reply.code(503).send({ error: 'Search is not configured' });
      }

      const filters = `communityId:"${communityId}" AND status:active`;

      const res = await algolia.searchSingleIndex({
        indexName: LISTINGS_INDEX,
        searchParams: {
          query: q,
          page,
          hitsPerPage,
          filters,
          ...(lat !== undefined && lng !== undefined
            ? { aroundLatLng: `${String(lat)},${String(lng)}` }
            : {}),
        },
      });

      return reply.send(
        ok({
          hits: res.hits,
          page: res.page,
          nbHits: res.nbHits,
          nbPages: res.nbPages,
          queryID: res.queryID,
        }),
      );
    },
  );
  done();
};

export const searchRoutes = plugin;
