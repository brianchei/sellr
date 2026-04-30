import type { FastifyPluginCallback } from 'fastify';
import {
  CreateConversationSchema,
  CreateMessageSchema,
  ListConversationsQuerySchema,
} from '@sellr/shared';
import { prisma } from '../../lib/prisma';
import { notifyUser } from '../../lib/notifyUser';
import { ok } from '../../lib/response';
import { verifyJWT } from '../../middleware/auth';

type UserTrustProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  memberSince: Date | null;
  listingCount: number;
  communityMember: boolean;
};

type UserTrustLookup = {
  userId: string;
  communityId: string;
};

function userTrustKey({ userId, communityId }: UserTrustLookup): string {
  return `${userId}:${communityId}`;
}

async function findUserTrustProfiles(
  lookups: UserTrustLookup[],
): Promise<Map<string, UserTrustProfile>> {
  const uniqueLookups = Array.from(
    new Map(lookups.map((lookup) => [userTrustKey(lookup), lookup])).values(),
  );

  if (uniqueLookups.length === 0) {
    return new Map();
  }

  const userIds = Array.from(
    new Set(uniqueLookups.map((lookup) => lookup.userId)),
  );
  const communityIds = Array.from(
    new Set(uniqueLookups.map((lookup) => lookup.communityId)),
  );

  const [users, memberships, listingCounts] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
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
        userId: { in: userIds },
        communityId: { in: communityIds },
        status: 'active',
      },
      select: {
        userId: true,
        communityId: true,
        joinedAt: true,
      },
    }),
    prisma.listing.groupBy({
      by: ['sellerId', 'communityId'],
      where: {
        sellerId: { in: userIds },
        communityId: { in: communityIds },
        status: 'active',
      },
      _count: { _all: true },
    }),
  ]);

  const usersById = new Map(users.map((user) => [user.id, user]));
  const membershipsByKey = new Map(
    memberships.map((membership) => [
      userTrustKey({
        userId: membership.userId,
        communityId: membership.communityId,
      }),
      membership,
    ]),
  );
  const listingCountsByKey = new Map(
    listingCounts.map((count) => [
      userTrustKey({
        userId: count.sellerId,
        communityId: count.communityId,
      }),
      count._count._all,
    ]),
  );

  return new Map(
    uniqueLookups.flatMap((lookup) => {
      const user = usersById.get(lookup.userId);
      if (!user) {
        return [];
      }

      const key = userTrustKey(lookup);
      const membership = membershipsByKey.get(key);

      return [
        [
          key,
          {
            ...user,
            memberSince: membership?.joinedAt ?? null,
            listingCount: listingCountsByKey.get(key) ?? 0,
            communityMember: Boolean(membership),
          },
        ],
      ];
    }),
  );
}

async function findUserTrustProfile(
  lookup: UserTrustLookup,
): Promise<UserTrustProfile | null> {
  const profiles = await findUserTrustProfiles([lookup]);
  return profiles.get(userTrustKey(lookup)) ?? null;
}

async function findConversationWithAccessContext(conversationId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      listing: {
        select: {
          communityId: true,
        },
      },
      offer: {
        select: {
          listing: {
            select: {
              communityId: true,
            },
          },
        },
      },
    },
  });
}

type ConversationAccessContext = NonNullable<
  Awaited<ReturnType<typeof findConversationWithAccessContext>>
>;

function getConversationCommunityId(
  conversation: ConversationAccessContext,
): string | null {
  return (
    conversation.listing?.communityId ??
    conversation.offer?.listing.communityId ??
    null
  );
}

function conversationSummaryPayload(
  conversation: Awaited<ReturnType<typeof findConversationSummary>>,
  peer: UserTrustProfile | null,
) {
  if (!conversation) {
    return null;
  }

  return {
    id: conversation.id,
    listingId: conversation.listingId,
    offerId: conversation.offerId,
    participantIds: conversation.participantIds,
    type: conversation.type,
    createdAt: conversation.createdAt,
    listing: conversation.listing
      ? {
          id: conversation.listing.id,
          communityId: conversation.listing.communityId,
          sellerId: conversation.listing.sellerId,
          title: conversation.listing.title,
          price: conversation.listing.price,
          photoUrls: conversation.listing.photoUrls,
          status: conversation.listing.status,
          locationNeighborhood: conversation.listing.locationNeighborhood,
          createdAt: conversation.listing.createdAt,
        }
      : null,
    peer,
    latestMessage: conversation.messages.at(0) ?? null,
    messageCount: conversation._count.messages,
  };
}

async function findConversationSummary(conversationId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      listing: {
        select: {
          id: true,
          sellerId: true,
          title: true,
          price: true,
          photoUrls: true,
          status: true,
          locationNeighborhood: true,
          createdAt: true,
          communityId: true,
        },
      },
      offer: {
        select: {
          listing: {
            select: {
              communityId: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });
}

const plugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get(
    '/',
    {
      preHandler: verifyJWT,
      schema: { querystring: ListConversationsQuerySchema },
    },
    async (request, reply) => {
      const { limit } = ListConversationsQuerySchema.parse(request.query);
      if (request.user.communityIds.length === 0) {
        return reply.send(ok({ conversations: [] }));
      }

      const conversations = await prisma.conversation.findMany({
        where: {
          participantIds: { has: request.user.sub },
          listing: {
            is: {
              communityId: { in: request.user.communityIds },
            },
          },
        },
        include: {
          listing: {
            select: {
              id: true,
              communityId: true,
              sellerId: true,
              title: true,
              price: true,
              photoUrls: true,
              status: true,
              locationNeighborhood: true,
              createdAt: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      const peerLookups = conversations.flatMap((conversation) => {
        const peerId = conversation.participantIds.find(
          (id) => id !== request.user.sub,
        );
        return peerId && conversation.listing
          ? [
              {
                userId: peerId,
                communityId: conversation.listing.communityId,
              },
            ]
          : [];
      });
      const peersByKey = await findUserTrustProfiles(peerLookups);

      const summaries = conversations
        .map((conversation) => {
          const peerId = conversation.participantIds.find(
            (id) => id !== request.user.sub,
          );

          return {
            id: conversation.id,
            listingId: conversation.listingId,
            offerId: conversation.offerId,
            participantIds: conversation.participantIds,
            type: conversation.type,
            createdAt: conversation.createdAt,
            listing: conversation.listing,
            peer:
              peerId && conversation.listing
                ? (peersByKey.get(
                    userTrustKey({
                      userId: peerId,
                      communityId: conversation.listing.communityId,
                    }),
                  ) ?? null)
                : null,
            latestMessage: conversation.messages.at(0) ?? null,
            messageCount: conversation._count.messages,
          };
        })
        .sort((left, right) => {
          const leftDate =
            left.latestMessage?.createdAt.getTime() ?? left.createdAt.getTime();
          const rightDate =
            right.latestMessage?.createdAt.getTime() ??
            right.createdAt.getTime();
          return rightDate - leftDate;
        });

      return reply.send(ok({ conversations: summaries }));
    },
  );

  fastify.post(
    '/',
    {
      preHandler: verifyJWT,
      schema: { body: CreateConversationSchema },
    },
    async (request, reply) => {
      const body = CreateConversationSchema.parse(request.body);
      const listing = await prisma.listing.findUnique({
        where: { id: body.listingId },
      });
      if (!listing) {
        return reply.code(404).send({ error: 'Listing not found' });
      }
      if (!request.user.communityIds.includes(listing.communityId)) {
        return reply
          .code(403)
          .send({ error: 'Not a member of this community' });
      }
      const buyerId = request.user.sub;
      const sellerId = listing.sellerId;
      if (buyerId === sellerId) {
        return reply
          .code(400)
          .send({ error: 'Use seller tools for your own listing' });
      }
      if (listing.status !== 'active') {
        return reply.code(400).send({ error: 'Listing is not available' });
      }

      const existing = await prisma.conversation.findFirst({
        where: {
          listingId: listing.id,
          type: 'pre_offer',
          AND: [
            { participantIds: { has: buyerId } },
            { participantIds: { has: sellerId } },
          ],
        },
      });
      if (existing) {
        return reply.send(ok({ conversation: existing }));
      }

      const conversation = await prisma.conversation.create({
        data: {
          listingId: listing.id,
          participantIds: [buyerId, sellerId],
          type: 'pre_offer',
        },
      });

      return reply.code(201).send(ok({ conversation }));
    },
  );

  fastify.get(
    '/:conversationId',
    { preHandler: verifyJWT },
    async (request, reply) => {
      const { conversationId } = request.params as { conversationId: string };
      const conversation = await findConversationSummary(conversationId);
      if (!conversation) {
        return reply.code(404).send({ error: 'Conversation not found' });
      }
      if (!conversation.participantIds.includes(request.user.sub)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const communityId =
        conversation.listing?.communityId ??
        conversation.offer?.listing.communityId ??
        null;
      if (!communityId || !request.user.communityIds.includes(communityId)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const peerId = conversation.participantIds.find(
        (id) => id !== request.user.sub,
      );
      const peer =
        peerId && communityId
          ? await findUserTrustProfile({
              userId: peerId,
              communityId,
            })
          : null;

      return reply.send(
        ok({ conversation: conversationSummaryPayload(conversation, peer) }),
      );
    },
  );

  fastify.get(
    '/:conversationId/messages',
    { preHandler: verifyJWT },
    async (request, reply) => {
      const { conversationId } = request.params as { conversationId: string };
      const conv = await findConversationWithAccessContext(conversationId);
      if (!conv) {
        return reply.code(404).send({ error: 'Conversation not found' });
      }
      if (!conv.participantIds.includes(request.user.sub)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
      const communityId = getConversationCommunityId(conv);
      if (!communityId || !request.user.communityIds.includes(communityId)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });

      return reply.send(ok({ messages }));
    },
  );

  fastify.post(
    '/:conversationId/messages',
    {
      preHandler: verifyJWT,
      schema: { body: CreateMessageSchema },
    },
    async (request, reply) => {
      const { conversationId } = request.params as { conversationId: string };
      const body = CreateMessageSchema.parse(request.body);

      const conv = await findConversationWithAccessContext(conversationId);
      if (!conv) {
        return reply.code(404).send({ error: 'Conversation not found' });
      }
      if (!conv.participantIds.includes(request.user.sub)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
      const communityId = getConversationCommunityId(conv);
      if (!communityId || !request.user.communityIds.includes(communityId)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: request.user.sub,
          content: body.content,
        },
      });

      const peerId = conv.participantIds.find((id) => id !== request.user.sub);
      if (peerId) {
        await notifyUser(peerId, 'new_message', {
          conversationId,
          messageId: message.id,
          preview: body.content.slice(0, 120),
        });
      }

      return reply.code(201).send(ok({ message }));
    },
  );

  done();
};

export const messageRoutes = plugin;
