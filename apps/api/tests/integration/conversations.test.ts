import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { integrationDbAvailable } from './env';
import {
  accessCookieFor,
  addMember,
  buildTestApp,
  createCommunity,
  createConversation,
  createListing,
  createMessage,
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

    it('requires profile completion before contacting a seller', async () => {
      const seller = await createUser({ displayName: 'Sam Seller' });
      const buyer = await createUser({ displayName: 'Member 1234' });
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

      expect(res.statusCode).toBe(403);
      const body = res.json<{ code: string; issues: string[] }>();
      expect(body.code).toBe('PROFILE_COMPLETION_REQUIRED');
      expect(body.issues).toContain('display_name');
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

  describe('conversation archive visibility', () => {
    it('hides an archived conversation only for the current user and restores it', async () => {
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
      const conversation = await createConversation({
        listingId: listing.id,
        participantIds: [buyer.id, seller.id],
      });
      await createMessage({
        conversationId: conversation.id,
        senderId: buyer.id,
        content: 'Can I pick this up today?',
      });
      const buyerCookie = await accessCookieFor(app, buyer.id);
      const sellerCookie = await accessCookieFor(app, seller.id);

      const archiveRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/conversations/${conversation.id}/archive`,
        headers: { cookie: buyerCookie },
        payload: { archived: true },
      });
      expect(archiveRes.statusCode).toBe(200);
      expect(
        archiveRes.json<{
          data: { conversation: { archivedAt: string | null } };
        }>().data.conversation.archivedAt,
      ).toEqual(expect.any(String));

      const buyerActive = await app.inject({
        method: 'GET',
        url: '/api/v1/conversations',
        headers: { cookie: buyerCookie },
      });
      expect(buyerActive.statusCode).toBe(200);
      expect(
        buyerActive.json<{ data: { conversations: { id: string }[] } }>().data
          .conversations,
      ).toHaveLength(0);

      const sellerActive = await app.inject({
        method: 'GET',
        url: '/api/v1/conversations',
        headers: { cookie: sellerCookie },
      });
      expect(sellerActive.statusCode).toBe(200);
      expect(
        sellerActive
          .json<{ data: { conversations: { id: string }[] } }>()
          .data.conversations.map((item) => item.id),
      ).toContain(conversation.id);

      const buyerArchived = await app.inject({
        method: 'GET',
        url: '/api/v1/conversations?status=archived',
        headers: { cookie: buyerCookie },
      });
      expect(buyerArchived.statusCode).toBe(200);
      const archivedBody = buyerArchived.json<{
        data: { conversations: { id: string; archivedAt: string | null }[] };
      }>();
      expect(archivedBody.data.conversations).toHaveLength(1);
      expect(archivedBody.data.conversations[0].id).toBe(conversation.id);
      expect(archivedBody.data.conversations[0].archivedAt).toEqual(
        expect.any(String),
      );

      const restoreRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/conversations/${conversation.id}/archive`,
        headers: { cookie: buyerCookie },
        payload: { archived: false },
      });
      expect(restoreRes.statusCode).toBe(200);
      expect(
        restoreRes.json<{
          data: { conversation: { archivedAt: string | null } };
        }>().data.conversation.archivedAt,
      ).toBeNull();

      const buyerRestored = await app.inject({
        method: 'GET',
        url: '/api/v1/conversations',
        headers: { cookie: buyerCookie },
      });
      expect(
        buyerRestored
          .json<{ data: { conversations: { id: string }[] } }>()
          .data.conversations.map((item) => item.id),
      ).toContain(conversation.id);
    });
  });
});
