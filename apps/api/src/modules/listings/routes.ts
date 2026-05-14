import type { FastifyPluginCallback } from 'fastify';
import { Prisma } from '../../generated/prisma/client';
import {
  CreateListingSchema,
  ListListingsQuerySchema,
  ListSellerListingsQuerySchema,
  NearbyListingsQuerySchema,
  SellerStorefrontParamsSchema,
  SellerStorefrontQuerySchema,
  UpdateListingSchema,
} from '@sellr/shared';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { verifyJWT } from '../../middleware/auth';
import { requireHighIntentProfile } from '../../lib/profileRequirements';
import { findListingsNearby, setListingLocationGeom } from './repository';
import { searchSyncQueue } from '../../lib/queues';
import { notifyUser } from '../../lib/notifyUser';
import {
  attachListingMediaAssets,
  queueListingPhotoUrlDeletion,
  queueRemovedListingPhotoDeletion,
} from '../../lib/mediaAssets';

type SellerProfileLookup = {
  sellerId: string;
  communityId: string;
};

type ListingSellerProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  memberSince: Date | null;
  listingCount: number;
  communityMember: boolean;
};

function sellerProfileKey(lookup: SellerProfileLookup): string {
  return `${lookup.sellerId}:${lookup.communityId}`;
}

async function findListingSellerProfiles(
  lookups: SellerProfileLookup[],
): Promise<Map<string, ListingSellerProfile>> {
  const uniqueLookups = Array.from(
    new Map(
      lookups.map((lookup) => [sellerProfileKey(lookup), lookup]),
    ).values(),
  );

  if (uniqueLookups.length === 0) {
    return new Map<string, ListingSellerProfile>();
  }

  const sellerIds = Array.from(
    new Set(uniqueLookups.map((lookup) => lookup.sellerId)),
  );
  const communityIds = Array.from(
    new Set(uniqueLookups.map((lookup) => lookup.communityId)),
  );

  const [sellers, memberships, listingCounts] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: sellerIds } },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        verifiedAt: true,
        createdAt: true,
      },
    }),
    prisma.communityMember.findMany({
      where: {
        userId: { in: sellerIds },
        communityId: { in: communityIds },
        status: 'active',
      },
      select: { userId: true, communityId: true, joinedAt: true },
    }),
    prisma.listing.groupBy({
      by: ['sellerId', 'communityId'],
      where: {
        sellerId: { in: sellerIds },
        communityId: { in: communityIds },
        status: 'active',
      },
      _count: { _all: true },
    }),
  ]);

  const sellersById = new Map(sellers.map((seller) => [seller.id, seller]));
  const membershipsByKey = new Map(
    memberships.map((membership) => [
      sellerProfileKey({
        sellerId: membership.userId,
        communityId: membership.communityId,
      }),
      membership,
    ]),
  );
  const listingCountsByKey = new Map(
    listingCounts.map((count) => [
      sellerProfileKey({
        sellerId: count.sellerId,
        communityId: count.communityId,
      }),
      count._count._all,
    ]),
  );

  const profiles = new Map<string, ListingSellerProfile>();
  for (const lookup of uniqueLookups) {
    const seller = sellersById.get(lookup.sellerId);
    if (!seller) {
      continue;
    }

    const key = sellerProfileKey(lookup);
    const membership = membershipsByKey.get(key);
    profiles.set(key, {
      ...seller,
      memberSince: membership?.joinedAt ?? null,
      listingCount: listingCountsByKey.get(key) ?? 0,
      communityMember: Boolean(membership),
    });
  }

  return profiles;
}

async function findListingSellerProfile(userId: string, communityId: string) {
  const profiles = await findListingSellerProfiles([
    { sellerId: userId, communityId },
  ]);
  return (
    profiles.get(sellerProfileKey({ sellerId: userId, communityId })) ?? null
  );
}

async function withListingSellerProfiles<
  TListing extends { sellerId: string; communityId: string },
>(listings: TListing[]) {
  const profiles = await findListingSellerProfiles(listings);
  return listings.map((listing) => ({
    ...listing,
    seller:
      profiles.get(
        sellerProfileKey({
          sellerId: listing.sellerId,
          communityId: listing.communityId,
        }),
      ) ?? null,
  }));
}

function jsonStableValue(value: unknown): string {
  return JSON.stringify(value);
}

function listingPreview(title: string, message: string): string {
  return `${title}: ${message}`.slice(0, 140);
}

function listingBrowseOrderBy(
  sort: 'recent' | 'price-asc' | 'price-desc',
): Prisma.ListingOrderByWithRelationInput[] {
  if (sort === 'price-asc') {
    return [{ price: 'asc' }, { createdAt: 'desc' }];
  }
  if (sort === 'price-desc') {
    return [{ price: 'desc' }, { createdAt: 'desc' }];
  }
  return [{ createdAt: 'desc' }];
}

async function notifyCommunityAboutNewListing(listing: {
  id: string;
  communityId: string;
  sellerId: string;
  title: string;
  price: Prisma.Decimal;
  locationNeighborhood: string;
}) {
  const members = await prisma.communityMember.findMany({
    where: {
      communityId: listing.communityId,
      status: 'active',
      userId: { not: listing.sellerId },
    },
    select: { userId: true },
  });

  await Promise.all(
    members.map((member) =>
      notifyUser(member.userId, 'listing_published', {
        listingId: listing.id,
        listingTitle: listing.title,
        communityId: listing.communityId,
        price: listing.price.toString(),
        locationNeighborhood: listing.locationNeighborhood,
        preview: listingPreview(
          listing.title,
          'new in your community marketplace.',
        ),
      }),
    ),
  );
}

async function notifyListingParticipants(
  listing: {
    id: string;
    title: string;
    sellerId: string;
    status: string;
  },
  payload: {
    type: 'listing_updated' | 'listing_status_changed';
    changeKind: 'details' | 'pickup' | 'price' | 'availability';
    preview: string;
  },
) {
  const conversations = await prisma.conversation.findMany({
    where: { listingId: listing.id },
    select: {
      id: true,
      participantIds: true,
    },
  });

  const targets = new Map<string, string>();
  for (const conversation of conversations) {
    for (const participantId of conversation.participantIds) {
      if (participantId !== listing.sellerId && !targets.has(participantId)) {
        targets.set(participantId, conversation.id);
      }
    }
  }

  await Promise.all(
    Array.from(targets.entries()).map(([userId, conversationId]) =>
      notifyUser(userId, payload.type, {
        listingId: listing.id,
        listingTitle: listing.title,
        conversationId,
        status: listing.status,
        changeKind: payload.changeKind,
        preview: payload.preview,
      }),
    ),
  );
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

      return reply.send(
        ok({ listings: await withListingSellerProfiles(listings) }),
      );
    },
  );

  fastify.get(
    '/',
    {
      preHandler: verifyJWT,
      schema: { querystring: ListListingsQuerySchema },
    },
    async (request, reply) => {
      const { communityId, q, category, condition, hasPhotos, sort, limit } =
        ListListingsQuerySchema.parse(request.query);
      if (!request.user.communityIds.includes(communityId)) {
        return reply
          .code(403)
          .send({ error: 'Not a member of this community' });
      }

      const trimmedQuery = q.trim();
      const where: Prisma.ListingWhereInput = {
        communityId,
        status: 'active',
        ...(category ? { category } : {}),
        ...(condition ? { condition } : {}),
        ...(hasPhotos ? { photoUrls: { not: [] } } : {}),
        ...(trimmedQuery
          ? {
              OR: [
                { title: { contains: trimmedQuery, mode: 'insensitive' } },
                {
                  description: {
                    contains: trimmedQuery,
                    mode: 'insensitive',
                  },
                },
                {
                  subcategory: {
                    contains: trimmedQuery,
                    mode: 'insensitive',
                  },
                },
                {
                  conditionNote: {
                    contains: trimmedQuery,
                    mode: 'insensitive',
                  },
                },
                {
                  locationNeighborhood: {
                    contains: trimmedQuery,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      };

      const listings = await prisma.listing.findMany({
        where,
        orderBy: listingBrowseOrderBy(sort),
        take: limit,
      });

      return reply.send(
        ok({ listings: await withListingSellerProfiles(listings) }),
      );
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

  fastify.get(
    '/sellers/:sellerId',
    {
      preHandler: verifyJWT,
      schema: {
        params: SellerStorefrontParamsSchema,
        querystring: SellerStorefrontQuerySchema,
      },
    },
    async (request, reply) => {
      const { sellerId } = SellerStorefrontParamsSchema.parse(request.params);
      const { communityId, limit } = SellerStorefrontQuerySchema.parse(
        request.query,
      );

      if (!request.user.communityIds.includes(communityId)) {
        return reply
          .code(403)
          .send({ error: 'Not a member of this community' });
      }

      const seller = await findListingSellerProfile(sellerId, communityId);
      if (!seller?.communityMember) {
        return reply.code(404).send({ error: 'Seller not found' });
      }

      const listings = await prisma.listing.findMany({
        where: {
          communityId,
          sellerId,
          status: 'active',
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });

      return reply.send(
        ok({ seller, listings: await withListingSellerProfiles(listings) }),
      );
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
      if (!(await requireHighIntentProfile(request, reply))) {
        return;
      }

      const listing = await prisma.$transaction(async (tx) => {
        const created = await tx.listing.create({
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

        await attachListingMediaAssets({
          ownerId: request.user.sub,
          listingId: created.id,
          photoUrls: body.photoUrls,
          db: tx,
        });

        return created;
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
      if (!(await requireHighIntentProfile(request, reply))) {
        return;
      }
      if (listing.status === 'sold') {
        return reply.code(400).send({
          error: 'Sold listings cannot be republished. Create a new listing.',
        });
      }
      if (listing.status === 'expired') {
        return reply.code(400).send({
          error:
            'Removed or expired listings cannot be republished. Create a new listing.',
        });
      }

      const shouldNotifyMarketplace = listing.status !== 'active';
      const updated = await prisma.listing.update({
        where: { id: listingId },
        data: { status: 'active' },
      });

      await searchSyncQueue.add('sync', {
        listingId: updated.id,
        action: 'upsert',
      });
      if (shouldNotifyMarketplace) {
        await notifyCommunityAboutNewListing(updated);
      }

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
      if (listing.status === 'expired') {
        return reply.code(400).send({
          error: 'Removed or expired listings cannot be unpublished.',
        });
      }

      const updated = await prisma.listing.update({
        where: { id: listingId },
        data: { status: 'draft' },
      });

      await searchSyncQueue.add('sync', {
        listingId: updated.id,
        action: 'delete',
      });
      await notifyListingParticipants(updated, {
        type: 'listing_status_changed',
        changeKind: 'availability',
        preview: listingPreview(
          updated.title,
          'the seller moved this listing back to draft.',
        ),
      });

      return reply.send(ok({ listing: updated }));
    },
  );

  fastify.post(
    '/:listingId/mark-sold',
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
        return reply
          .code(403)
          .send({ error: 'Only the seller can mark a listing sold' });
      }
      if (!request.user.communityIds.includes(listing.communityId)) {
        return reply
          .code(403)
          .send({ error: 'Not a member of this community' });
      }
      if (listing.status !== 'active') {
        return reply
          .code(400)
          .send({ error: 'Only active listings can be marked sold' });
      }

      const updated = await prisma.listing.update({
        where: { id: listingId },
        data: { status: 'sold' },
      });

      await searchSyncQueue.add('sync', {
        listingId: updated.id,
        action: 'delete',
      });
      await notifyListingParticipants(updated, {
        type: 'listing_status_changed',
        changeKind: 'availability',
        preview: listingPreview(updated.title, 'this item was marked sold.'),
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
      if (listing.status === 'expired') {
        return reply
          .code(400)
          .send({ error: 'Removed or expired listings cannot be deleted.' });
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
      await prisma.notification.deleteMany({
        where: {
          payload: {
            path: ['listingId'],
            equals: listingId,
          },
        },
      });

      await searchSyncQueue.add('sync', {
        listingId,
        action: 'delete',
      });
      await queueListingPhotoUrlDeletion({
        photoUrls: listing.photoUrls,
        reason: 'listing_deleted',
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
      if (listing.status === 'expired') {
        return reply
          .code(400)
          .send({ error: 'Removed or expired listings cannot be edited.' });
      }

      const nextPrice = new Prisma.Decimal(String(body.price));
      const nextCondition = body.condition as typeof listing.condition;
      const pickupChanged =
        listing.locationNeighborhood !== body.locationNeighborhood ||
        listing.locationRadiusM !== body.locationRadiusM ||
        jsonStableValue(listing.availabilityWindows) !==
          jsonStableValue(body.availabilityWindows);
      const priceChanged = !listing.price.equals(nextPrice);
      const detailsChanged =
        listing.title !== body.title ||
        listing.description !== body.description ||
        listing.category !== body.category ||
        listing.subcategory !== (body.subcategory ?? null) ||
        listing.condition !== nextCondition ||
        listing.conditionNote !== (body.conditionNote ?? null) ||
        listing.negotiable !== body.negotiable ||
        jsonStableValue(listing.photoUrls) !== jsonStableValue(body.photoUrls);

      const updated = await prisma.$transaction(async (tx) => {
        const nextListing = await tx.listing.update({
          where: { id: listingId },
          data: {
            title: body.title,
            description: body.description,
            category: body.category,
            subcategory: body.subcategory ?? null,
            condition: nextCondition,
            conditionNote: body.conditionNote ?? null,
            price: nextPrice,
            negotiable: body.negotiable,
            locationNeighborhood: body.locationNeighborhood,
            locationRadiusM: body.locationRadiusM,
            availabilityWindows: body.availabilityWindows,
            photoUrls: body.photoUrls,
          },
        });

        await attachListingMediaAssets({
          ownerId: request.user.sub,
          listingId: nextListing.id,
          photoUrls: body.photoUrls,
          db: tx,
        });

        return nextListing;
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
      await queueRemovedListingPhotoDeletion({
        listingId: updated.id,
        previousPhotoUrls: listing.photoUrls,
        nextPhotoUrls: body.photoUrls,
      });
      if (
        listing.status === 'active' &&
        (pickupChanged || priceChanged || detailsChanged)
      ) {
        const changeKind = pickupChanged
          ? 'pickup'
          : priceChanged
            ? 'price'
            : 'details';
        const changeLabel =
          changeKind === 'pickup'
            ? 'pickup timing or area changed.'
            : changeKind === 'price'
              ? 'the price changed.'
              : 'the listing details changed.';

        await notifyListingParticipants(updated, {
          type: 'listing_updated',
          changeKind,
          preview: listingPreview(updated.title, changeLabel),
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
