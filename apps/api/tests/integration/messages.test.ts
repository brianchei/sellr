import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import type { FastifyInstance } from 'fastify';

import { integrationDbAvailable } from './env';
import {
  accessCookieFor,
  addMember,
  buildTestApp,
  createCommunity,
  createConversation,
  createListing,
  createUser,
  prisma,
  truncateAll,
} from './setup';
import { clearEmittedEvents, getEmittedEvents } from './mocks';

describe.skipIf(!integrationDbAvailable)('messages integration', () => {
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
    clearEmittedEvents();
  });

  afterEach(() => {
    clearEmittedEvents();
  });

  describe('POST /api/v1/conversations/:id/messages', () => {
    it('appends a message, notifies the peer, and emits message:new', async () => {
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

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/conversations/${conversation.id}/messages`,
        headers: { cookie: await accessCookieFor(app, buyer.id) },
        payload: { content: 'Is this still available?' },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json<{
        data: {
          message: {
            id: string;
            conversationId: string;
            senderId: string;
            content: string;
          };
        };
      }>();
      expect(body.data.message.senderId).toBe(buyer.id);
      expect(body.data.message.conversationId).toBe(conversation.id);

      const stored = await prisma.message.findMany({
        where: { conversationId: conversation.id },
      });
      expect(stored).toHaveLength(1);

      const notifications = await prisma.notification.findMany({
        where: { userId: seller.id, type: 'new_message' },
      });
      expect(notifications).toHaveLength(1);

      const events = getEmittedEvents();
      const newMessageEvents = events.filter((e) => e.event === 'message:new');
      expect(newMessageEvents).toHaveLength(1);
      expect(new Set(newMessageEvents[0].userIds)).toEqual(
        new Set([buyer.id, seller.id]),
      );
    });

    it('rejects non-participants with 403', async () => {
      const seller = await createUser();
      const buyer = await createUser();
      const stranger = await createUser();
      const community = await createCommunity();
      await addMember(seller.id, community.id);
      await addMember(buyer.id, community.id);
      await addMember(stranger.id, community.id);
      const listing = await createListing({
        sellerId: seller.id,
        communityId: community.id,
        status: 'active',
      });
      const conversation = await createConversation({
        listingId: listing.id,
        participantIds: [buyer.id, seller.id],
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/conversations/${conversation.id}/messages`,
        headers: { cookie: await accessCookieFor(app, stranger.id) },
        payload: { content: 'Trying to butt in' },
      });
      expect(res.statusCode).toBe(403);

      const stored = await prisma.message.count({
        where: { conversationId: conversation.id },
      });
      expect(stored).toBe(0);
    });

    it('rejects participants who lost community membership with 403', async () => {
      const seller = await createUser();
      const buyer = await createUser();
      const community = await createCommunity();
      await addMember(seller.id, community.id);
      // Buyer is a participant on the conversation but never joined the
      // listing's community — JWT carries no membership for it.
      const listing = await createListing({
        sellerId: seller.id,
        communityId: community.id,
        status: 'active',
      });
      const conversation = await createConversation({
        listingId: listing.id,
        participantIds: [buyer.id, seller.id],
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/conversations/${conversation.id}/messages`,
        headers: { cookie: await accessCookieFor(app, buyer.id) },
        payload: { content: 'hello?' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/conversations/:id/messages', () => {
    it('returns the full thread to participants in chronological order', async () => {
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

      // Two messages back-to-back; sleep 5ms between to keep ordering stable.
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: buyer.id,
          content: 'first',
        },
      });
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: seller.id,
          content: 'second',
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/conversations/${conversation.id}/messages`,
        headers: { cookie: await accessCookieFor(app, buyer.id) },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json<{
        data: { messages: { content: string; senderId: string }[] };
      }>();
      expect(body.data.messages.map((m) => m.content)).toEqual([
        'first',
        'second',
      ]);
    });
  });
});
