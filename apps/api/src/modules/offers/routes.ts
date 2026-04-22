import type { FastifyPluginCallback } from 'fastify';
import { CreateOfferSchema, RespondToOfferSchema } from '@sellr/shared';
import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';
import { notifyUser } from '../../lib/notifyUser';
import { ok } from '../../lib/response';
import { verifyJWT } from '../../middleware/auth';

const plugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.post(
    '/',
    {
      preHandler: verifyJWT,
      schema: { body: CreateOfferSchema },
    },
    async (request, reply) => {
      const body = CreateOfferSchema.parse(request.body);
      const listing = await prisma.listing.findUnique({
        where: { id: body.listingId },
      });
      if (!listing) {
        return reply.code(404).send({ error: 'Listing not found' });
      }
      if (listing.status !== 'active') {
        return reply.code(400).send({ error: 'Listing is not active' });
      }
      if (!request.user.communityIds.includes(listing.communityId)) {
        return reply
          .code(403)
          .send({ error: 'Not a member of this community' });
      }
      if (listing.sellerId === request.user.sub) {
        return reply
          .code(400)
          .send({ error: 'Cannot offer on your own listing' });
      }

      const offer = await prisma.offer.create({
        data: {
          listingId: listing.id,
          buyerId: request.user.sub,
          sellerId: listing.sellerId,
          offeredPrice: new Prisma.Decimal(String(body.offeredPrice)),
          requestedTime: new Date(body.requestedTime),
          message: body.message,
          status: 'pending',
        },
      });

      await notifyUser(listing.sellerId, 'new_offer', {
        offerId: offer.id,
        listingId: listing.id,
        buyerId: request.user.sub,
      });

      return reply.code(201).send(ok({ offer }));
    },
  );

  fastify.get(
    '/:offerId',
    { preHandler: verifyJWT },
    async (request, reply) => {
      const { offerId } = request.params as { offerId: string };
      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
        include: { listing: true },
      });
      if (!offer) {
        return reply.code(404).send({ error: 'Offer not found' });
      }
      if (
        offer.buyerId !== request.user.sub &&
        offer.sellerId !== request.user.sub
      ) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
      if (!request.user.communityIds.includes(offer.listing.communityId)) {
        return reply
          .code(403)
          .send({ error: 'Not a member of this community' });
      }
      return reply.send(ok({ offer }));
    },
  );

  fastify.post(
    '/:offerId/respond',
    {
      preHandler: verifyJWT,
      schema: { body: RespondToOfferSchema },
    },
    async (request, reply) => {
      const { offerId } = request.params as { offerId: string };
      const body = RespondToOfferSchema.parse(request.body);

      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
        include: { listing: true },
      });
      if (!offer) {
        return reply.code(404).send({ error: 'Offer not found' });
      }
      if (offer.sellerId !== request.user.sub) {
        return reply.code(403).send({ error: 'Only the seller can respond' });
      }
      if (offer.status !== 'pending' && offer.status !== 'countered') {
        return reply.code(400).send({ error: 'Offer is not open' });
      }

      if (body.action === 'decline') {
        const updated = await prisma.offer.update({
          where: { id: offerId },
          data: { status: 'declined' },
        });
        await notifyUser(offer.buyerId, 'offer_declined', {
          offerId: offer.id,
          listingId: offer.listingId,
        });
        return reply.send(ok({ offer: updated }));
      }

      if (body.action === 'counter') {
        const updated = await prisma.offer.update({
          where: { id: offerId },
          data: {
            status: 'countered',
            counterCount: { increment: 1 },
            ...(body.counterPrice != null
              ? {
                  offeredPrice: new Prisma.Decimal(String(body.counterPrice)),
                }
              : {}),
            ...(body.counterTime != null
              ? { requestedTime: new Date(body.counterTime) }
              : {}),
          },
        });
        await notifyUser(offer.buyerId, 'offer_countered', {
          offerId: offer.id,
          listingId: offer.listingId,
        });
        return reply.send(ok({ offer: updated }));
      }

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.offer.update({
          where: { id: offerId },
          data: { status: 'accepted' },
        });
        const meetup = await tx.meetup.create({
          data: {
            offerId: updated.id,
            scheduledAt: updated.requestedTime,
            locationSuggestion: { place: 'Coordinate pickup details in chat' },
            status: 'confirmed',
          },
        });
        await tx.conversation.create({
          data: {
            offerId: updated.id,
            listingId: offer.listingId,
            participantIds: [updated.buyerId, updated.sellerId],
            type: 'post_acceptance',
          },
        });
        return { offer: updated, meetup };
      });

      await notifyUser(offer.buyerId, 'offer_accepted', {
        offerId: result.offer.id,
        listingId: offer.listingId,
        meetupId: result.meetup.id,
      });

      return reply.send(ok(result));
    },
  );

  done();
};

export const offerRoutes = plugin;
