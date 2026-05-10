import type { FastifyPluginCallback } from 'fastify';
import {
  RefreshTokenSchema,
  RegisterPushTokenSchema,
  SendEmailOTPSchema,
  SendOTPSchema,
  UpdateProfileSchema,
  VerifyEmailOTPSchema,
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
  incrementEmailOtpSendCount,
  isAllowedEmailOtpDomain,
  normalizeEmail,
  isLocalOtpMode,
  sendVerificationEmail,
  sendVerificationSms,
  verifyEmailOtpCode,
  verifyOtpCode,
} from '../../lib/otp';
import {
  captureOperationalError,
  emailLogContext,
  phoneLogContext,
} from '../../lib/observability';
import { verifyJWT } from '../../middleware/auth';

function defaultDisplayNameForEmail(email: string): string {
  const localPart = email.split('@')[0] ?? '';
  const name = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
    .trim();

  return name.slice(0, 60) || 'Sellr member';
}

async function findMeProfile(userId: string, communityIds: string[]) {
  const [user, membership, listingCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneE164: true,
        email: true,
        emailVerifiedAt: true,
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
    '/email/send',
    {
      schema: { body: SendEmailOTPSchema },
    },
    async (request, reply) => {
      const body = SendEmailOTPSchema.parse(request.body);
      const email = normalizeEmail(body.email);
      if (!isAllowedEmailOtpDomain(email)) {
        return reply.code(400).send({
          error: 'Use your wisc.edu student email for email sign-in.',
        });
      }

      const n = await incrementEmailOtpSendCount(email);
      if (n > 5) {
        return reply.code(429).send({ error: 'Too many email code requests' });
      }

      try {
        await sendVerificationEmail(email);
      } catch (error) {
        const emailContext = emailLogContext(email);
        request.log.error(
          { err: error, operation: 'resend.email_otp.send', ...emailContext },
          'Resend email OTP send failed',
        );
        captureOperationalError(error, {
          component: 'resend',
          operation: 'email_otp_send',
          extra: emailContext,
        });
        if (error instanceof Error && /not configured/i.test(error.message)) {
          return reply
            .code(503)
            .send({ error: 'Email sign-in is not configured' });
        }
        throw error;
      }

      return reply.send(ok({ sent: true }));
    },
  );

  fastify.post(
    '/email/verify',
    {
      schema: { body: VerifyEmailOTPSchema },
    },
    async (request, reply) => {
      const body = VerifyEmailOTPSchema.parse(request.body);
      const email = normalizeEmail(body.email);
      if (!isAllowedEmailOtpDomain(email)) {
        return reply.code(400).send({
          error: 'Use your wisc.edu student email for email sign-in.',
        });
      }

      const result = await verifyEmailOtpCode(email, body.code);
      if (result === 'too_many_attempts') {
        return reply
          .code(429)
          .send({ error: 'Too many verification attempts' });
      }
      if (result !== 'valid') {
        return reply.code(400).send({ error: 'Invalid or expired code' });
      }

      const verifiedAt = new Date();
      const user = await prisma.user.upsert({
        where: { email },
        create: {
          email,
          emailVerifiedAt: verifiedAt,
          displayName: defaultDisplayNameForEmail(email),
          verifiedAt,
          deviceFingerprint: body.deviceFingerprint,
        },
        update: {
          emailVerifiedAt: verifiedAt,
          verifiedAt,
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
    '/otp/send',
    {
      schema: { body: SendOTPSchema },
    },
    async (request, reply) => {
      const body = SendOTPSchema.parse(request.body);
      if (!isLocalOtpMode()) {
        const n = await incrementOtpSendCount(body.phoneE164);
        if (n > 5) {
          return reply.code(429).send({ error: 'Too many OTP requests' });
        }
      }
      try {
        await sendVerificationSms(body.phoneE164);
      } catch (error) {
        const phone = phoneLogContext(body.phoneE164);
        request.log.error(
          { err: error, operation: 'twilio.verify.send', ...phone },
          'Twilio Verify send failed',
        );
        captureOperationalError(error, {
          component: 'twilio',
          operation: 'verify_send',
          extra: phone,
        });
        throw error;
      }
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
      let valid: boolean;
      try {
        valid = await verifyOtpCode(body.phoneE164, body.code);
      } catch (error) {
        const phone = phoneLogContext(body.phoneE164);
        request.log.error(
          { err: error, operation: 'twilio.verify.check', ...phone },
          'Twilio Verify check failed',
        );
        captureOperationalError(error, {
          component: 'twilio',
          operation: 'verify_check',
          extra: phone,
        });
        throw error;
      }
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
      } catch (error) {
        request.log.warn(
          { err: error, operation: 'auth.refresh' },
          'Refresh token validation failed',
        );
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

  fastify.get(
    '/realtime-token',
    { preHandler: verifyJWT },
    async (request, reply) => {
      const ttlSec = Number.parseInt(
        process.env.JWT_REALTIME_TOKEN_TTL ?? '120',
        10,
      );
      const token = fastify.jwt.sign(
        {
          sub: request.user.sub,
          communityIds: request.user.communityIds,
          role: request.user.role,
        },
        { expiresIn: ttlSec },
      );
      return reply.send(ok({ token, expiresIn: ttlSec }));
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
