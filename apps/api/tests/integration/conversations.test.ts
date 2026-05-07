import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { integrationDbAvailable } from './env';
import {
  accessCookieFor,
  addMember,
  buildTestApp,
  createCommunity,
  createListing,
  createUser,
  prisma,
  truncateAll,
} from './setup';

describe.skipIf(!integrationDbAvailable)('conversations integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  describe('POST /api/v1/conversations', () => {
    it('creates a pre_offer conversation between buyer and seller', async () => {
      const seller = await createUser({ displayName: 'Sam' });
      const buyer = await createUser({ displayName: 'Bea' });
      const community = await createCommunity();
      await addMember(seller.id, community.id);
      await addMember(buyer.id, community.id);
      const listing = await createListing({
        sellerId: seller.id,
        communityId: community.id,
        status: 'active',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: { cookie: await accessCookieFor(app, buyer.id) },
        payload: { listingId: listing.id },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json<{
        data: {
          conversation: {
            id: string;
            listingId: string;
            type: string;
            participantIds: string[];
          };
        };
      }>();
      expect(body.data.conversation.listingId).toBe(listing.id);
      expect(body.data.conversation.type).toBe('pre_offer');
      expect(new Set(body.data.conversation.participantIds)).toEqual(
        new Set([buyer.id, seller.id]),
      );
    });

    it('returns the existing conversation instead of creating a duplicate', async () => {
      const seller = await createUser();
      const buyer = await createUser();
      const community = await createCommunity();
      await addMember(seller.id, community.id);
      await addMember(buyer.id, community.id);
      const listing = await createListing({
        sellerId: seller.id,
        communityId: community.id,
        status: 'active',
      });
      const cookie = await accessCookieFor(app, buyer.id);

      const first = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: { cookie },
        payload: { listingId: listing.id },
      });
      expect(first.statusCode).toBe(201);
      const firstId = first.json<{ data: { conversation: { id: string } } }>()
        .data.conversation.id;

      const second = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: { cookie },
        payload: { listingId: listing.id },
      });
      // Existing conversations are returned as 200 (not 201).
      expect(second.statusCode).toBe(200);
      const secondId = second.json<{
        data: { conversation: { id: string } };
      }>().data.conversation.id;
      expect(secondId).toBe(firstId);

      const total = await prisma.conversation.count({
        where: { listingId: listing.id },
      });
      expect(total).toBe(1);
    });

    it('rejects sellers from messaging themselves', async () => {
      const seller = await createUser();
      const community = await createCommunity();
      await addMember(seller.id, community.id);
      const listing = await createListing({
        sellerId: seller.id,
        communityId: community.id,
        status: 'active',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: { cookie: await accessCookieFor(app, seller.id) },
        payload: { listingId: listing.id },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects contact on inactive listings', async () => {
      const seller = await createUser();
      const buyer = await createUser();
      const community = await createCommunity();
      await addMember(seller.id, community.id);
      await addMember(buyer.id, community.id);
      const draft = await createListing({
        sellerId: seller.id,
        communityId: community.id,
        status: 'draft',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: { cookie: await accessCookieFor(app, buyer.id) },
        payload: { listingId: draft.id },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects contact across community boundaries', async () => {
      const seller = await createUser();
      const outsider = await createUser();
      const sellerCommunity = await createCommunity({ name: 'Seller side' });
      const outsiderCommunity = await createCommunity({ name: 'Other side' });
      await addMember(seller.id, sellerCommunity.id);
      await addMember(outsider.id, outsiderCommunity.id);
      const listing = await createListing({
        sellerId: seller.id,
        communityId: sellerCommunity.id,
        status: 'active',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: { cookie: await accessCookieFor(app, outsider.id) },
        payload: { listingId: listing.id },
      });
      expect(res.statusCode).toBe(403);

      const total = await prisma.conversation.count();
      expect(total).toBe(0);
    });
  });
});
