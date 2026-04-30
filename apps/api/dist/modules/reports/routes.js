"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRoutes = void 0;
const shared_1 = require("@sellr/shared");
const prisma_1 = require("../../lib/prisma");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
async function getReportTargetAccess(targetId, targetType, reporterId, communityIds) {
    if (targetType === 'listing') {
        const listing = await prisma_1.prisma.listing.findUnique({
            where: { id: targetId },
            select: { communityId: true },
        });
        if (!listing) {
            return { status: 404, error: 'Listing not found' };
        }
        if (!communityIds.includes(listing.communityId)) {
            return { status: 403, error: 'Forbidden' };
        }
        return { status: 200 };
    }
    if (targetType === 'message') {
        const message = await prisma_1.prisma.message.findUnique({
            where: { id: targetId },
            select: {
                conversation: {
                    select: {
                        participantIds: true,
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
                },
            },
        });
        if (!message) {
            return { status: 404, error: 'Message not found' };
        }
        const communityId = message.conversation.listing?.communityId ??
            message.conversation.offer?.listing.communityId ??
            null;
        if (!message.conversation.participantIds.includes(reporterId) ||
            !communityId ||
            !communityIds.includes(communityId)) {
            return { status: 403, error: 'Forbidden' };
        }
        return { status: 200 };
    }
    if (targetId === reporterId) {
        return { status: 400, error: 'Cannot report yourself' };
    }
    const sharedMembership = await prisma_1.prisma.communityMember.findFirst({
        where: {
            userId: targetId,
            communityId: { in: communityIds },
            status: 'active',
        },
        select: { userId: true },
    });
    if (!sharedMembership) {
        return { status: 404, error: 'User not found' };
    }
    return { status: 200 };
}
const plugin = (fastify, _opts, done) => {
    fastify.post('/', {
        preHandler: auth_1.verifyJWT,
        schema: { body: shared_1.CreateReportSchema },
    }, async (request, reply) => {
        const body = shared_1.CreateReportSchema.parse(request.body);
        const access = await getReportTargetAccess(body.targetId, body.targetType, request.user.sub, request.user.communityIds);
        if (access.status !== 200) {
            return reply.code(access.status).send({ error: access.error });
        }
        const report = await prisma_1.prisma.report.create({
            data: {
                reporterId: request.user.sub,
                targetId: body.targetId,
                targetType: body.targetType,
                reason: body.reason,
                severity: body.severity,
                status: 'open',
            },
        });
        return reply.code(201).send((0, response_1.ok)({ report }));
    });
    done();
};
exports.reportRoutes = plugin;
