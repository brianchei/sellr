import type { FastifyPluginCallback } from 'fastify';
import { Prisma } from '../../generated/prisma/client';
import {
  CreateListingSchema,
  ListListingsQuerySchema,
  NearbyListingsQuerySchema,
} from '@sellr/shared';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { verifyJWT } from '../../middleware/auth';
import { findListingsNearby, setListingLocationGeom } from './repository';
import { searchSyncQueue } from '../../lib/queues';

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

      return reply.send(ok({ listings }));
    },
  );

  fastify.get(
    '/',
    {
      preHandler: verifyJWT,
      schema: { querystring: ListListingsQuerySchema },
    },
    async (request, reply) => {
      const { communityId, limit } = ListListingsQuerySchema.parse(
        request.query,
      );
      if (!request.user.communityIds.includes(communityId)) {
        return reply
          .code(403)
          .send({ error: 'Not a member of this community' });
      }

      const listings = await prisma.listing.findMany({
        where: { communityId, status: 'active' },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return reply.send(ok({ listings }));
    },
  );

  fastify.post(
    '/',
    {
      preHandler: verifyJWT,
      schema: { body: CreateListingSchema },
    },
    async (request, reply) => {
      const body = CreateListingSchema.parse(request.body);
      if (!request.user.communityIds.includes(body.communityId)) {
        return reply
          .code(403)
          .send({ error: 'Not a member of this community' });
      }

      const listing = await prisma.listing.create({
        data: {
          communityId: body.communityId,
          sellerId: request.user.sub,
          title: body.title,
          description: body.description,
          category: body.category,
          subcategory: body.subcategory,
          condition: body.condition,
          conditionNote: body.conditionNote,
          price: new Prisma.Decimal(String(body.price)),
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
        await setListingLocationGeom(listing.id, body.lat, body.lng);
      }

      return reply.code(201).send(ok({ listing }));
    },
  );

  fastify.post(
    '/:listingId/publish',
    { preHandler: verifyJWT },
    async (request, reply) => {
      const { listingId } = request.params as { listingId: string };
      const listing = await prisma.listing.findUnique({
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

      const updated = await prisma.listing.update({
        where: { id: listingId },
        data: { status: 'active' },
      });

      await searchSyncQueue.add('sync', {
        listingId: updated.id,
        action: 'upsert',
      });

      return reply.send(ok({ listing: updated }));
    },
  );

  fastify.get(
    '/:listingId',
    {
      preHandler: verifyJWT,
    },
    async (request, reply) => {
      const { listingId } = request.params as { listingId: string };
      const listing = await prisma.listing.findUnique({
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
      if (
        listing.status !== 'active' &&
        listing.sellerId !== request.user.sub
      ) {
        return reply.code(404).send({ error: 'Listing not found' });
      }
      return reply.send(ok({ listing }));
    },
  );

  done();
};

export const listingRoutes = plugin;
