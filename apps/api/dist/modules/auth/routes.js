"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const shared_1 = require("@sellr/shared");
const prisma_1 = require("../../lib/prisma");
const response_1 = require("../../lib/response");
const authTokens_1 = require("../../lib/authTokens");
const authCookies_1 = require("../../lib/authCookies");
const otp_1 = require("../../lib/otp");
const observability_1 = require("../../lib/observability");
const listingImageStorage_1 = require("../../lib/listingImageStorage");
const auth_1 = require("../../middleware/auth");
function defaultDisplayNameForEmail(email) {
    const localPart = email.split('@')[0] ?? '';
    const name = localPart
        .split(/[._-]+/)
        .filter(Boolean)
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join(' ')
        .trim();
    return name.slice(0, 60) || 'Sellr member';
}
async function findMeProfile(userId, communityIds) {
    const [user, memberships, listingCount] = await Promise.all([
        prisma_1.prisma.user.findUnique({
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
            ? prisma_1.prisma.communityMember.findMany({
                where: {
                    userId,
                    communityId: { in: communityIds },
                    status: 'active',
                    community: { status: 'active' },
                },
                orderBy: { joinedAt: 'asc' },
                select: {
                    communityId: true,
                    role: true,
                    joinedAt: true,
                    community: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            status: true,
                        },
                    },
                },
            })
            : [],
        communityIds.length > 0
            ? prisma_1.prisma.listing.count({
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
        memberSince: memberships[0]?.joinedAt ?? null,
        listingCount,
        communityMember: memberships.length > 0,
        communities: memberships.map((membership) => ({
            id: membership.community.id,
            name: membership.community.name,
            type: membership.community.type,
            role: membership.role,
            joinedAt: membership.joinedAt,
        })),
    };
}
async function cleanupReplacedProfileAvatar(avatarUrl, userId) {
    if (!avatarUrl)
        return;
    const storageReference = (0, listingImageStorage_1.profileAvatarStorageReferenceFromUrl)(avatarUrl);
    if (!storageReference)
        return;
    try {
        await (0, listingImageStorage_1.deleteListingImageObject)(storageReference);
    }
    catch (error) {
        (0, observability_1.captureOperationalError)(error, {
            component: 'profile_avatar',
            operation: 'delete_replaced_avatar',
            extra: {
                storageKey: storageReference.storageKey,
                storageProvider: storageReference.storageProvider,
            },
            userId,
        });
    }
}
const plugin = (fastify, _opts, done) => {
    fastify.post('/email/send', {
        schema: { body: shared_1.SendEmailOTPSchema },
    }, async (request, reply) => {
        const body = shared_1.SendEmailOTPSchema.parse(request.body);
        const email = (0, otp_1.normalizeEmail)(body.email);
        if (!(0, otp_1.isAllowedEmailOtpDomain)(email)) {
            return reply.code(400).send({
                error: 'Use your wisc.edu student email for email sign-in.',
            });
        }
        const n = await (0, otp_1.incrementEmailOtpSendCount)(email);
        if (n > 5) {
            return reply.code(429).send({ error: 'Too many email code requests' });
        }
        try {
            await (0, otp_1.sendVerificationEmail)(email);
        }
        catch (error) {
            const emailContext = (0, observability_1.emailLogContext)(email);
            request.log.error({ err: error, operation: 'resend.email_otp.send', ...emailContext }, 'Resend email OTP send failed');
            (0, observability_1.captureOperationalError)(error, {
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
        return reply.send((0, response_1.ok)({ sent: true }));
    });
    fastify.post('/email/verify', {
        schema: { body: shared_1.VerifyEmailOTPSchema },
    }, async (request, reply) => {
        const body = shared_1.VerifyEmailOTPSchema.parse(request.body);
        const email = (0, otp_1.normalizeEmail)(body.email);
        if (!(0, otp_1.isAllowedEmailOtpDomain)(email)) {
            return reply.code(400).send({
                error: 'Use your wisc.edu student email for email sign-in.',
            });
        }
        const result = await (0, otp_1.verifyEmailOtpCode)(email, body.code);
        if (result === 'too_many_attempts') {
            return reply
                .code(429)
                .send({ error: 'Too many verification attempts' });
        }
        if (result !== 'valid') {
            return reply.code(400).send({ error: 'Invalid or expired code' });
        }
        const verifiedAt = new Date();
        const user = await prisma_1.prisma.user.upsert({
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
        const tokens = await (0, authTokens_1.issueTokenPair)(fastify, user.id);
        if ((0, authCookies_1.isWebClient)(request.headers)) {
            (0, authCookies_1.setAuthCookies)(reply, tokens);
            return reply.send((0, response_1.ok)({ userId: user.id }));
        }
        return reply.send((0, response_1.ok)({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            userId: user.id,
        }));
    });
    fastify.post('/otp/send', {
        schema: { body: shared_1.SendOTPSchema },
    }, async (request, reply) => {
        const body = shared_1.SendOTPSchema.parse(request.body);
        if (!(0, otp_1.isLocalOtpMode)()) {
            const n = await (0, otp_1.incrementOtpSendCount)(body.phoneE164);
            if (n > 5) {
                return reply.code(429).send({ error: 'Too many OTP requests' });
            }
        }
        try {
            await (0, otp_1.sendVerificationSms)(body.phoneE164);
        }
        catch (error) {
            const phone = (0, observability_1.phoneLogContext)(body.phoneE164);
            request.log.error({ err: error, operation: 'twilio.verify.send', ...phone }, 'Twilio Verify send failed');
            (0, observability_1.captureOperationalError)(error, {
                component: 'twilio',
                operation: 'verify_send',
                extra: phone,
            });
            throw error;
        }
        return reply.send((0, response_1.ok)({ sent: true }));
    });
    fastify.post('/otp/verify', {
        schema: { body: shared_1.VerifyOTPSchema },
    }, async (request, reply) => {
        const body = shared_1.VerifyOTPSchema.parse(request.body);
        let valid;
        try {
            valid = await (0, otp_1.verifyOtpCode)(body.phoneE164, body.code);
        }
        catch (error) {
            const phone = (0, observability_1.phoneLogContext)(body.phoneE164);
            request.log.error({ err: error, operation: 'twilio.verify.check', ...phone }, 'Twilio Verify check failed');
            (0, observability_1.captureOperationalError)(error, {
                component: 'twilio',
                operation: 'verify_check',
                extra: phone,
            });
            throw error;
        }
        if (!valid) {
            return reply.code(400).send({ error: 'Invalid or expired code' });
        }
        const user = await prisma_1.prisma.user.upsert({
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
        const tokens = await (0, authTokens_1.issueTokenPair)(fastify, user.id);
        if ((0, authCookies_1.isWebClient)(request.headers)) {
            (0, authCookies_1.setAuthCookies)(reply, tokens);
            return reply.send((0, response_1.ok)({ userId: user.id }));
        }
        return reply.send((0, response_1.ok)({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            userId: user.id,
        }));
    });
    fastify.post('/refresh', {
        schema: { body: shared_1.RefreshTokenSchema },
    }, async (request, reply) => {
        const body = shared_1.RefreshTokenSchema.parse(request.body ?? {});
        const refreshInput = body.refreshToken ?? request.cookies[authCookies_1.SELLR_REFRESH_COOKIE];
        if (!refreshInput) {
            return reply.code(400).send({ error: 'Missing refresh token' });
        }
        try {
            const tokens = await (0, authTokens_1.refreshAccessToken)(fastify, refreshInput);
            if ((0, authCookies_1.isWebClient)(request.headers)) {
                (0, authCookies_1.setAuthCookies)(reply, tokens);
                return await reply.send((0, response_1.ok)({ rotated: true }));
            }
            return await reply.send((0, response_1.ok)(tokens));
        }
        catch (error) {
            request.log.warn({ err: error, operation: 'auth.refresh' }, 'Refresh token validation failed');
            return reply.code(401).send({ error: 'Invalid refresh token' });
        }
    });
    fastify.post('/logout', async (request, reply) => {
        if ((0, authCookies_1.isWebClient)(request.headers)) {
            (0, authCookies_1.clearAuthCookies)(reply);
        }
        return reply.send((0, response_1.ok)({ loggedOut: true }));
    });
    fastify.post('/push-token', {
        preHandler: auth_1.verifyJWT,
        schema: { body: shared_1.RegisterPushTokenSchema },
    }, async (request, reply) => {
        const body = shared_1.RegisterPushTokenSchema.parse(request.body);
        await prisma_1.prisma.user.update({
            where: { id: request.user.sub },
            data: { expoPushToken: body.expoPushToken },
        });
        return reply.send((0, response_1.ok)({ registered: true }));
    });
    fastify.get('/realtime-token', { preHandler: auth_1.verifyJWT }, async (request, reply) => {
        const ttlSec = Number.parseInt(process.env.JWT_REALTIME_TOKEN_TTL ?? '120', 10);
        const token = fastify.jwt.sign({
            sub: request.user.sub,
            communityIds: request.user.communityIds,
            role: request.user.role,
        }, { expiresIn: ttlSec });
        return reply.send((0, response_1.ok)({ token, expiresIn: ttlSec }));
    });
    fastify.get('/me', { preHandler: auth_1.verifyJWT }, async (request, reply) => {
        const user = await findMeProfile(request.user.sub, request.user.communityIds);
        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }
        return reply.send((0, response_1.ok)({
            user,
            communityIds: request.user.communityIds,
            communities: user.communities,
        }));
    });
    fastify.put('/me', {
        preHandler: auth_1.verifyJWT,
        schema: { body: shared_1.UpdateProfileSchema },
    }, async (request, reply) => {
        const body = shared_1.UpdateProfileSchema.parse(request.body);
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { id: request.user.sub },
            select: { avatarUrl: true },
        });
        if (!existingUser) {
            return reply.code(404).send({ error: 'User not found' });
        }
        await prisma_1.prisma.user.update({
            where: { id: request.user.sub },
            data: {
                displayName: body.displayName,
                ...(body.avatarUrl !== undefined
                    ? { avatarUrl: body.avatarUrl }
                    : {}),
            },
        });
        if (body.avatarUrl !== undefined &&
            existingUser.avatarUrl !== body.avatarUrl) {
            await cleanupReplacedProfileAvatar(existingUser.avatarUrl, request.user.sub);
        }
        const user = await findMeProfile(request.user.sub, request.user.communityIds);
        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }
        return reply.send((0, response_1.ok)({
            user,
            communityIds: request.user.communityIds,
            communities: user.communities,
        }));
    });
    done();
};
exports.authRoutes = plugin;
