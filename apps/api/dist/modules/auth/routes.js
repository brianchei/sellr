"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const shared_1 = require("@sellr/shared");
const prisma_1 = require("../../lib/prisma");
const response_1 = require("../../lib/response");
const authTokens_1 = require("../../lib/authTokens");
const authCookies_1 = require("../../lib/authCookies");
const otp_1 = require("../../lib/otp");
const auth_1 = require("../../middleware/auth");
const plugin = (fastify, _opts, done) => {
    fastify.post('/otp/send', {
        schema: { body: shared_1.SendOTPSchema },
    }, async (request, reply) => {
        const body = shared_1.SendOTPSchema.parse(request.body);
        const n = await (0, otp_1.incrementOtpSendCount)(body.phoneE164);
        if (n > 5) {
            return reply.code(429).send({ error: 'Too many OTP requests' });
        }
        await (0, otp_1.sendVerificationSms)(body.phoneE164);
        return reply.send((0, response_1.ok)({ sent: true }));
    });
    fastify.post('/otp/verify', {
        schema: { body: shared_1.VerifyOTPSchema },
    }, async (request, reply) => {
        const body = shared_1.VerifyOTPSchema.parse(request.body);
        const valid = await (0, otp_1.verifyOtpCode)(body.phoneE164, body.code);
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
        catch {
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
    fastify.get('/me', { preHandler: auth_1.verifyJWT }, async (request, reply) => {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: request.user.sub },
            select: {
                id: true,
                phoneE164: true,
                displayName: true,
                avatarUrl: true,
                verifiedAt: true,
            },
        });
        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }
        return reply.send((0, response_1.ok)({
            user,
            communityIds: request.user.communityIds,
        }));
    });
    done();
};
exports.authRoutes = plugin;
