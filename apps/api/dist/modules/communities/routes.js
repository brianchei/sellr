"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.communityRoutes = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const shared_1 = require("@sellr/shared");
const prisma_1 = require("../../lib/prisma");
const response_1 = require("../../lib/response");
const authTokens_1 = require("../../lib/authTokens");
const auth_1 = require("../../middleware/auth");
const plugin = (fastify, _opts, done) => {
    fastify.post('/join', {
        preHandler: auth_1.verifyJWT,
        schema: { body: shared_1.JoinCommunitySchema },
    }, async (request, reply) => {
        const body = shared_1.JoinCommunitySchema.parse(request.body);
        let communityId = null;
        if (body.inviteCode) {
            const inv = await prisma_1.prisma.inviteCode.findFirst({
                where: { code: body.inviteCode },
                include: { community: true },
            });
            if (!inv) {
                return reply.code(404).send({ error: 'Invalid invite code' });
            }
            if (inv.expiresAt && inv.expiresAt < new Date()) {
                return reply.code(400).send({ error: 'Invite expired' });
            }
            if (inv.maxUses != null && inv.useCount >= inv.maxUses) {
                return reply.code(400).send({ error: 'Invite has no uses left' });
            }
            communityId = inv.communityId;
            await prisma_1.prisma.inviteCode.update({
                where: { id: inv.id },
                data: { useCount: { increment: 1 } },
            });
        }
        else if (body.institutionalEmail) {
            const domain = body.institutionalEmail.split('@')[1];
            if (!domain) {
                return reply.code(400).send({ error: 'Invalid email' });
            }
            const community = await prisma_1.prisma.community.findFirst({
                where: {
                    emailDomain: domain,
                    accessMethod: 'email_domain',
                    status: 'active',
                },
            });
            if (!community) {
                return reply
                    .code(404)
                    .send({ error: 'No community for this email domain' });
            }
            communityId = community.id;
        }
        if (!communityId) {
            return reply.code(400).send({ error: 'Could not resolve community' });
        }
        await prisma_1.prisma.communityMember.upsert({
            where: {
                userId_communityId: {
                    userId: request.user.sub,
                    communityId,
                },
            },
            create: {
                userId: request.user.sub,
                communityId,
                role: 'member',
                status: 'active',
            },
            update: { status: 'active' },
        });
        const tokens = await (0, authTokens_1.issueTokenPair)(fastify, request.user.sub);
        return reply.send((0, response_1.ok)({
            communityId,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        }));
    });
    done();
};
exports.communityRoutes = (0, fastify_plugin_1.default)(plugin);
