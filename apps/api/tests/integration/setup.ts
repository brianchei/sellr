/**
 * Integration test harness.
 *
 * - `buildTestApp()` constructs a Fastify instance wired up exactly like
 *   production EXCEPT it skips the rate-limit plugin (which depends on Redis
 *   and would just slow tests down).
 * - `truncateAll()` wipes every domain table between tests so each test is
 *   independent.
 * - Factory helpers (`createUser`, `createCommunity`, `addMember`,
 *   `createListing`) return real DB rows.
 * - `signAccessTokenFor()` mints a JWT for a user and serializes it as the
 *   `sellr_access` cookie used by the web flow.
 *
 * NOTE: This module assumes mocks from `./mocks.ts` are already loaded.
 * `vitest.config.ts` registers them via `setupFiles`, so importing route
 * modules from `src/` here is safe.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { Prisma } from '../../src/generated/prisma/client';

import { cookiesPlugin } from '../../src/plugins/cookies';
import { corsPlugin } from '../../src/plugins/cors';
import { jwtPlugin } from '../../src/plugins/jwt';
import { authRoutes } from '../../src/modules/auth/routes';
import { communityRoutes } from '../../src/modules/communities/routes';
import { listingRoutes } from '../../src/modules/listings/routes';
import { searchRoutes } from '../../src/modules/search/routes';
import { offerRoutes } from '../../src/modules/offers/routes';
import { meetupRoutes } from '../../src/modules/meetups/routes';
import { messageRoutes } from '../../src/modules/messages/routes';
import { reportRoutes } from '../../src/modules/reports/routes';
import { notificationRoutes } from '../../src/modules/notifications/routes';
import { uploadRoutes } from '../../src/modules/uploads/routes';
import { prisma } from '../../src/lib/prisma';
import { SELLR_ACCESS_COOKIE } from '../../src/lib/authCookies';
import { buildUserJwtPayload } from '../../src/lib/memberships';

export { prisma };

export async function buildTestApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false,
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();

  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  await fastify.register(cookiesPlugin);
  await fastify.register(corsPlugin);
  await fastify.register(jwtPlugin);
  await fastify.register(multipart);

  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(communityRoutes, { prefix: '/api/v1/communities' });
  await fastify.register(listingRoutes, { prefix: '/api/v1/listings' });
  await fastify.register(searchRoutes, { prefix: '/api/v1/search' });
  await fastify.register(offerRoutes, { prefix: '/api/v1/offers' });
  await fastify.register(meetupRoutes, { prefix: '/api/v1/meetups' });
  await fastify.register(messageRoutes, { prefix: '/api/v1/conversations' });
  await fastify.register(reportRoutes, { prefix: '/api/v1/reports' });
  await fastify.register(notificationRoutes, {
    prefix: '/api/v1/notifications',
  });
  await fastify.register(uploadRoutes, { prefix: '/api/v1/uploads' });

  await fastify.ready();
  return fastify;
}

/* -------------------------------------------------------------------------- */
/* Database lifecycle                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Tables that hold per-test data. `_prisma_migrations` is intentionally
 * excluded so we don't undo `prisma migrate deploy`.
 */
const TRUNCATE_TABLES = [
  'ratings',
  'meetups',
  'offers',
  'messages',
  'conversations',
  'reports',
  'notifications',
  'saved_searches',
  'user_flags',
  'user_reputation',
  'invite_codes',
  'community_members',
  'listings',
  'communities',
  'users',
] as const;

export async function truncateAll(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TRUNCATE_TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;`,
  );
}

/* -------------------------------------------------------------------------- */
/* Factories                                                                   */
/* -------------------------------------------------------------------------- */

let phoneCounter = 1000;
export function uniquePhone(): string {
  phoneCounter += 1;
  return `+1555${String(phoneCounter).padStart(7, '0')}`;
}

export async function createUser(
  overrides: Partial<{
    phoneE164: string;
    displayName: string;
    verified: boolean;
  }> = {},
) {
  const phoneE164 = overrides.phoneE164 ?? uniquePhone();
  return prisma.user.create({
    data: {
      phoneE164,
      displayName: overrides.displayName ?? `Member ${phoneE164.slice(-4)}`,
      verifiedAt: overrides.verified === false ? null : new Date(),
    },
  });
}

let communityCounter = 0;
export async function createCommunity(
  overrides: Partial<{
    name: string;
    type: 'campus' | 'coworking' | 'residential';
    accessMethod: 'invite_code' | 'email_domain';
    emailDomain: string;
  }> = {},
) {
  communityCounter += 1;
  return prisma.community.create({
    data: {
      name: overrides.name ?? `Test Community ${String(communityCounter)}`,
      type: overrides.type ?? 'residential',
      accessMethod: overrides.accessMethod ?? 'invite_code',
      ...(overrides.emailDomain !== undefined
        ? { emailDomain: overrides.emailDomain }
        : {}),
    },
  });
}

export async function addMember(
  userId: string,
  communityId: string,
  role: 'member' | 'moderator' | 'admin' = 'member',
) {
  return prisma.communityMember.create({
    data: {
      userId,
      communityId,
      role,
      status: 'active',
    },
  });
}

let listingCounter = 0;
export async function createListing(args: {
  sellerId: string;
  communityId: string;
  status?: 'draft' | 'pending_review' | 'active' | 'sold' | 'expired';
  title?: string;
  description?: string;
  category?: string;
  condition?: 'like_new' | 'good' | 'fair' | 'for_parts';
  price?: number;
  locationNeighborhood?: string;
  photoUrls?: string[];
}) {
  listingCounter += 1;
  return prisma.listing.create({
    data: {
      communityId: args.communityId,
      sellerId: args.sellerId,
      title: args.title ?? `Test listing ${String(listingCounter)}`,
      description:
        args.description ?? 'A normal-looking description for an item.',
      category: args.category ?? 'electronics',
      condition: args.condition ?? 'good',
      price: new Prisma.Decimal(String(args.price ?? 25)),
      negotiable: false,
      locationNeighborhood: args.locationNeighborhood ?? 'Westside',
      locationRadiusM: 1000,
      availabilityWindows: [
        { dayOfWeek: 6, startHour: 10, endHour: 18 },
      ] as unknown as Prisma.InputJsonValue,
      photoUrls: (args.photoUrls ?? [
        'https://example.com/test-photo-1.jpg',
      ]) as unknown as Prisma.InputJsonValue,
      aiGenerated: false,
      status: args.status ?? 'active',
    },
  });
}

export async function createConversation(args: {
  listingId: string;
  participantIds: string[];
  type?: 'pre_offer' | 'post_acceptance';
}) {
  return prisma.conversation.create({
    data: {
      listingId: args.listingId,
      participantIds: args.participantIds,
      type: args.type ?? 'pre_offer',
    },
  });
}

export async function createMessage(args: {
  conversationId: string;
  senderId: string;
  content: string;
}) {
  return prisma.message.create({
    data: {
      conversationId: args.conversationId,
      senderId: args.senderId,
      content: args.content,
    },
  });
}

export const validListingPayload = (
  communityId: string,
  overrides: Partial<{
    title: string;
    description: string;
    price: number;
    photoUrls: string[];
  }> = {},
) => ({
  communityId,
  title: overrides.title ?? 'Mid-century lamp',
  description:
    overrides.description ??
    'A nice-looking lamp from a smoke-free home, lightly used.',
  category: 'home',
  condition: 'good' as const,
  price: overrides.price ?? 35,
  negotiable: false,
  locationRadiusM: 1000,
  locationNeighborhood: 'Westside',
  availabilityWindows: [{ dayOfWeek: 6, startHour: 10, endHour: 18 }],
  photoUrls: overrides.photoUrls ?? ['https://example.com/test-lamp.jpg'],
  aiGenerated: false,
});

/* -------------------------------------------------------------------------- */
/* Auth helpers                                                                */
/* -------------------------------------------------------------------------- */

export async function signAccessTokenFor(
  app: FastifyInstance,
  userId: string,
): Promise<string> {
  const payload = await buildUserJwtPayload(userId);
  return app.jwt.sign(payload, { expiresIn: 900 });
}

export async function accessCookieFor(
  app: FastifyInstance,
  userId: string,
): Promise<string> {
  const token = await signAccessTokenFor(app, userId);
  return `${SELLR_ACCESS_COOKIE}=${token}`;
}
