import type { FastifyPluginCallback } from 'fastify';
import {
  RefreshTokenSchema,
  RegisterPushTokenSchema,
  SendOTPSchema,
  UpdateProfileSchema,
  VerifyOTPSchema,
} from '@sellr/shared';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { issueTokenPair, refreshAccessToken } from '../../lib/authTokens';
import {
  clearAuthCookies,
  isWebClient,
  SELLR_REFRESH_COOKIE,
  setAuthCookies,
} from '../../lib/authCookies';
import {
  incrementOtpSendCount,
  sendVerificationSms,
  verifyOtpCode,
} from '../../lib/otp';
import { verifyJWT } from '../../middleware/auth';

async function findMeProfile(userId: string, communityIds: string[]) {
  const [user, membership, listingCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneE164: true,
        displayName: true,
        avatarUrl: true,
        verifiedAt: true,
        createdAt: true,
      },
    }),
    communityIds.length > 0
      ? prisma.communityMember.findFirst({
          where: {
            userId,
            communityId: { in: communityIds },
            status: 'active',
          },
          orderBy: { joinedAt: 'asc' },
          select: { joinedAt: true },
        })
      : null,
    communityIds.length > 0
      ? prisma.listing.count({
          where: {
            sellerId: userId,
            communityId: { in: communityIds },
            status: 'active',
          },
        })
      : 0,
  ]);

  if (!user) {
    return null;
  }

  return {
    ...user,
    memberSince: membership?.joinedAt ?? null,
    listingCount,
    communityMember: Boolean(membership),
  };
}

const plugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.post(
    '/otp/send',
    {
      schema: { body: SendOTPSchema },
    },
    async (request, reply) => {
      const body = SendOTPSchema.parse(request.body);
      const n = await incrementOtpSendCount(body.phoneE164);
      if (n > 5) {
        return reply.code(429).send({ error: 'Too many OTP requests' });
      }
      await sendVerificationSms(body.phoneE164);
      return reply.send(ok({ sent: true }));
    },
  );

  fastify.post(
    '/otp/verify',
    {
      schema: { body: VerifyOTPSchema },
    },
    async (request, reply) => {
      const body = VerifyOTPSchema.parse(request.body);
      const valid = await verifyOtpCode(body.phoneE164, body.code);
      if (!valid) {
        return reply.code(400).send({ error: 'Invalid or expired code' });
      }

      const user = await prisma.user.upsert({
        where: { phoneE164: body.phoneE164 },
        create: {
          phoneE164: body.phoneE164,
          displayName: `Member ${body.phoneE164.slice(-4)}`,
          verifiedAt: new Date(),
          deviceFingerprint: body.deviceFingerprint,
        },
        update: {
          verifiedAt: new Date(),
          ...(body.deviceFingerprint
            ? { deviceFingerprint: body.deviceFingerprint }
            : {}),
        },
      });

      const tokens = await issueTokenPair(fastify, user.id);

      if (isWebClient(request.headers)) {
        setAuthCookies(reply, tokens);
        return reply.send(ok({ userId: user.id }));
      }

      return reply.send(
        ok({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          userId: user.id,
        }),
      );
    },
  );

  fastify.post(
    '/refresh',
    {
      schema: { body: RefreshTokenSchema },
    },
    async (request, reply) => {
      const body = RefreshTokenSchema.parse(request.body ?? {});
      const refreshInput =
        body.refreshToken ?? request.cookies[SELLR_REFRESH_COOKIE];
      if (!refreshInput) {
        return reply.code(400).send({ error: 'Missing refresh token' });
      }
      try {
        const tokens = await refreshAccessToken(fastify, refreshInput);
        if (isWebClient(request.headers)) {
          setAuthCookies(reply, tokens);
          return await reply.send(ok({ rotated: true }));
        }
        return await reply.send(ok(tokens));
      } catch {
        return reply.code(401).send({ error: 'Invalid refresh token' });
      }
    },
  );

  fastify.post('/logout', async (request, reply) => {
    if (isWebClient(request.headers)) {
      clearAuthCookies(reply);
    }
    return reply.send(ok({ loggedOut: true }));
  });

  fastify.post(
    '/push-token',
    {
      preHandler: verifyJWT,
      schema: { body: RegisterPushTokenSchema },
    },
    async (request, reply) => {
      const body = RegisterPushTokenSchema.parse(request.body);
      await prisma.user.update({
        where: { id: request.user.sub },
        data: { expoPushToken: body.expoPushToken },
      });
      return reply.send(ok({ registered: true }));
    },
  );

  fastify.get('/me', { preHandler: verifyJWT }, async (request, reply) => {
    const user = await findMeProfile(
      request.user.sub,
      request.user.communityIds,
    );
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    return reply.send(
      ok({
        user,
        communityIds: request.user.communityIds,
      }),
    );
  });

  fastify.put(
    '/me',
    {
      preHandler: verifyJWT,
      schema: { body: UpdateProfileSchema },
    },
    async (request, reply) => {
      const body = UpdateProfileSchema.parse(request.body);
      await prisma.user.update({
        where: { id: request.user.sub },
        data: {
          displayName: body.displayName,
          ...(body.avatarUrl !== undefined
            ? { avatarUrl: body.avatarUrl }
            : {}),
        },
      });

      const user = await findMeProfile(
        request.user.sub,
        request.user.communityIds,
      );
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return reply.send(
        ok({
          user,
          communityIds: request.user.communityIds,
        }),
      );
    },
  );

  done();
};

export const authRoutes = plugin;
