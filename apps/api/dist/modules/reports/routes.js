"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRoutes = void 0;
const shared_1 = require("@sellr/shared");
const prisma_1 = require("../../lib/prisma");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
function adminCommunityIds(role) {
    return Object.entries(role)
        .filter(([, value]) => value === 'admin')
        .map(([communityId]) => communityId);
}
function preview(value, length = 120) {
    return value.length > length ? `${value.slice(0, length - 3)}...` : value;
}
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
async function reportTargetCommunityIds(targetId, targetType) {
    if (targetType === 'listing') {
        const listing = await prisma_1.prisma.listing.findUnique({
            where: { id: targetId },
            select: { communityId: true },
        });
        return listing ? [listing.communityId] : [];
    }
    if (targetType === 'message') {
        const message = await prisma_1.prisma.message.findUnique({
            where: { id: targetId },
            select: {
                conversation: {
                    select: {
                        listing: { select: { communityId: true } },
                        offer: { select: { listing: { select: { communityId: true } } } },
                    },
                },
            },
        });
        const communityId = message?.conversation.listing?.communityId ??
            message?.conversation.offer?.listing.communityId;
        return communityId ? [communityId] : [];
    }
    const memberships = await prisma_1.prisma.communityMember.findMany({
        where: { userId: targetId, status: 'active' },
        select: { communityId: true },
    });
    return memberships.map((membership) => membership.communityId);
}
async function canAdminReport(report, communityIds) {
    const targetCommunityIds = await reportTargetCommunityIds(report.targetId, report.targetType);
    return targetCommunityIds.some((communityId) => communityIds.includes(communityId));
}
async function targetSummaries(reports) {
    const listingIds = reports
        .filter((report) => report.targetType === 'listing')
        .map((report) => report.targetId);
    const messageIds = reports
        .filter((report) => report.targetType === 'message')
        .map((report) => report.targetId);
    const userIds = reports
        .filter((report) => report.targetType === 'user')
        .map((report) => report.targetId);
    const [listings, messages, users] = await Promise.all([
        listingIds.length
            ? prisma_1.prisma.listing.findMany({
                where: { id: { in: listingIds } },
                select: {
                    id: true,
                    title: true,
                    communityId: true,
                    status: true,
                },
            })
            : [],
        messageIds.length
            ? prisma_1.prisma.message.findMany({
                where: { id: { in: messageIds } },
                select: {
                    id: true,
                    content: true,
                    conversationId: true,
                    conversation: {
                        select: {
                            listing: {
                                select: { id: true, title: true, communityId: true },
                            },
                            offer: {
                                select: {
                                    listing: {
                                        select: { id: true, title: true, communityId: true },
                                    },
                                },
                            },
                        },
                    },
                },
            })
            : [],
        userIds.length
            ? prisma_1.prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, displayName: true, phoneE164: true },
            })
            : [],
    ]);
    const listingMap = new Map(listings.map((listing) => [listing.id, listing]));
    const messageMap = new Map(messages.map((message) => [message.id, message]));
    const userMap = new Map(users.map((user) => [user.id, user]));
    const entries = reports.map((report) => {
        if (report.targetType === 'listing') {
            const listing = listingMap.get(report.targetId);
            return [
                report.targetId,
                listing
                    ? {
                        label: listing.title,
                        detail: `Listing - ${listing.status}`,
                        href: `/marketplace/${listing.id}`,
                        communityId: listing.communityId,
                    }
                    : null,
            ];
        }
        if (report.targetType === 'message') {
            const message = messageMap.get(report.targetId);
            const listing = message?.conversation.listing ?? message?.conversation.offer?.listing;
            return [
                report.targetId,
                message
                    ? {
                        label: listing?.title ?? 'Conversation message',
                        detail: `Message - ${preview(message.content)}`,
                        href: `/inbox/${message.conversationId}`,
                        communityId: listing?.communityId ?? null,
                    }
                    : null,
            ];
        }
        const user = userMap.get(report.targetId);
        return [
            report.targetId,
            user
                ? {
                    label: user.displayName,
                    detail: `Member - ${user.phoneE164}`,
                    href: null,
                    communityId: null,
                }
                : null,
        ];
    });
    return new Map(entries);
}
const plugin = (fastify, _opts, done) => {
    fastify.get('/', {
        preHandler: auth_1.verifyJWT,
        schema: { querystring: shared_1.ListReportsQuerySchema },
    }, async (request, reply) => {
        const adminIds = adminCommunityIds(request.user.role);
        if (adminIds.length === 0) {
            return reply.code(403).send({ error: 'Admin access required' });
        }
        const { status, severity, targetType, limit } = shared_1.ListReportsQuerySchema.parse(request.query);
        const listings = await prisma_1.prisma.listing.findMany({
            where: { communityId: { in: adminIds } },
            select: { id: true },
        });
        const listingIds = listings.map((listing) => listing.id);
        const messages = await prisma_1.prisma.message.findMany({
            where: {
                conversation: {
                    OR: [
                        { listing: { communityId: { in: adminIds } } },
                        { offer: { listing: { communityId: { in: adminIds } } } },
                    ],
                },
            },
            select: { id: true },
        });
        const messageIds = messages.map((message) => message.id);
        const members = await prisma_1.prisma.communityMember.findMany({
            where: { communityId: { in: adminIds }, status: 'active' },
            select: { userId: true },
        });
        const memberIds = members.map((member) => member.userId);
        const reports = await prisma_1.prisma.report.findMany({
            where: {
                ...(status !== 'all' ? { status } : {}),
                ...(severity !== 'all' ? { severity } : {}),
                ...(targetType !== 'all' ? { targetType } : {}),
                OR: [
                    { targetType: 'listing', targetId: { in: listingIds } },
                    { targetType: 'message', targetId: { in: messageIds } },
                    { targetType: 'user', targetId: { in: memberIds } },
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                reporter: {
                    select: {
                        id: true,
                        displayName: true,
                        phoneE164: true,
                    },
                },
            },
        });
        const summaries = await targetSummaries(reports);
        return reply.send((0, response_1.ok)({
            reports: reports.map((report) => ({
                ...report,
                target: summaries.get(report.targetId) ?? null,
            })),
            adminCommunityIds: adminIds,
        }));
    });
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
    fastify.patch('/:reportId', {
        preHandler: auth_1.verifyJWT,
        schema: { body: shared_1.UpdateReportStatusSchema },
    }, async (request, reply) => {
        const adminIds = adminCommunityIds(request.user.role);
        if (adminIds.length === 0) {
            return reply.code(403).send({ error: 'Admin access required' });
        }
        const { reportId } = request.params;
        const body = shared_1.UpdateReportStatusSchema.parse(request.body);
        const report = await prisma_1.prisma.report.findUnique({
            where: { id: reportId },
            select: {
                id: true,
                targetId: true,
                targetType: true,
            },
        });
        if (!report) {
            return reply.code(404).send({ error: 'Report not found' });
        }
        const allowed = await canAdminReport({ targetId: report.targetId, targetType: report.targetType }, adminIds);
        if (!allowed) {
            return reply.code(403).send({ error: 'Admin access required' });
        }
        const nextStatus = body.status;
        const updated = await prisma_1.prisma.report.update({
            where: { id: report.id },
            data: {
                status: nextStatus,
                moderatorId: request.user.sub,
                resolvedAt: nextStatus === 'resolved' || nextStatus === 'dismissed'
                    ? new Date()
                    : null,
            },
            include: {
                reporter: {
                    select: {
                        id: true,
                        displayName: true,
                        phoneE164: true,
                    },
                },
            },
        });
        const summaries = await targetSummaries([updated]);
        return reply.send((0, response_1.ok)({
            report: {
                ...updated,
                target: summaries.get(updated.targetId) ?? null,
            },
        }));
    });
    done();
};
exports.reportRoutes = plugin;
