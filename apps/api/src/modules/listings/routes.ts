import type { FastifyPluginCallback } from 'fastify';
import { Prisma } from '../../generated/prisma/client';
import {
  CreateListingSchema,
  ListListingsQuerySchema,
  ListSellerListingsQuerySchema,
  NearbyListingsQuerySchema,
  UpdateListingSchema,
} from '@sellr/shared';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { verifyJWT } from '../../middleware/auth';
import { findListingsNearby, setListingLocationGeom } from './repository';
import { searchSyncQueue } from '../../lib/queues';

async function findListingSellerProfile(userId: string, communityId: string) {
  const [seller, membership, listingCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        verifiedAt: true,
        createdAt: true,
      },
    }),
    prisma.communityMember.findFirst({
      where: {
        userId,
        communityId,
        status: 'active',
      },
      select: { joinedAt: true },
    }),
    prisma.listing.count({
      where: {
        sellerId: userId,
        communityId,
        status: 'active',
      },
    }),
  ]);

  if (!seller) {
    return null;
  }

  return {
    ...seller,
    memberSince: membership?.joinedAt ?? null,
    listingCount,
    communityMember: Boolean(membership),
  };
}

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

  fastify.get(
    '/mine',
    {
      preHandler: verifyJWT,
      schema: { querystring: ListSellerListingsQuerySchema },
    },
    async (request, reply) => {
      const { communityId, limit, status } =
        ListSellerListingsQuerySchema.parse(request.query);
      if (!request.user.communityIds.includes(communityId)) {
        return reply
          .code(403)
          .send({ error: 'Not a member of this community' });
      }

      const listings = await prisma.listing.findMany({
        where: {
          communityId,
          sellerId: request.user.sub,
          ...(status !== undefined ? { status } : {}),
        },
        orderBy: { updatedAt: 'desc' },
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

  fastify.post(
    '/:listingId/unpublish',
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
        return reply.code(403).send({ error: 'Only the seller can unpublish' });
      }
      if (!request.user.communityIds.includes(listing.communityId)) {
        return reply
          .code(403)
          .send({ error: 'Not a member of this community' });
      }

      const updated = await prisma.listing.update({
        where: { id: listingId },
        data: { status: 'draft' },
      });

      await searchSyncQueue.add('sync', {
        listingId: updated.id,
        action: 'delete',
      });

      return reply.send(ok({ listing: updated }));
    },
  );

  fastify.delete(
    '/:listingId',
    { preHandler: verifyJWT },
    async (request, reply) => {
      const { listingId } = request.params as { listingId: string };
      const listing = await prisma.listing.findUnique({
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
          error:
            'Listings with buyer activity cannot be deleted. Unpublish it instead.',
        });
      }

      await prisma.listing.delete({
        where: { id: listingId },
      });

      await searchSyncQueue.add('sync', {
        listingId,
        action: 'delete',
      });

      return reply.send(ok({ deleted: true }));
    },
  );

  fastify.put(
    '/:listingId',
    {
      preHandler: verifyJWT,
      schema: { body: UpdateListingSchema },
    },
    async (request, reply) => {
      const { listingId } = request.params as { listingId: string };
      const body = UpdateListingSchema.parse(request.body);
      const listing = await prisma.listing.findUnique({
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

      const updated = await prisma.listing.update({
        where: { id: listingId },
        data: {
          title: body.title,
          description: body.description,
          category: body.category,
          subcategory: body.subcategory ?? null,
          condition: body.condition,
          conditionNote: body.conditionNote ?? null,
          price: new Prisma.Decimal(String(body.price)),
          negotiable: body.negotiable,
          locationNeighborhood: body.locationNeighborhood,
          locationRadiusM: body.locationRadiusM,
          availabilityWindows: body.availabilityWindows,
          photoUrls: body.photoUrls,
        },
      });

      if (body.lat !== undefined && body.lng !== undefined) {
        await setListingLocationGeom(updated.id, body.lat, body.lng);
      }

      if (updated.status === 'active') {
        await searchSyncQueue.add('sync', {
          listingId: updated.id,
          action: 'upsert',
        });
      }

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

      const seller = await findListingSellerProfile(
        listing.sellerId,
        listing.communityId,
      );

      return reply.send(ok({ listing: { ...listing, seller } }));
    },
  );

  done();
};

export const listingRoutes = plugin;
