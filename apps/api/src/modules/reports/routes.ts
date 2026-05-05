import type { FastifyPluginCallback } from 'fastify';
import {
  CreateReportSchema,
  ListReportsQuerySchema,
  UpdateReportStatusSchema,
} from '@sellr/shared';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { verifyJWT } from '../../middleware/auth';

type ReportTargetType = 'listing' | 'user' | 'message';
type ReportStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';
type TargetSummary = {
  label: string;
  detail: string;
  href: string | null;
  communityId: string | null;
};

function adminCommunityIds(role: Record<string, string>): string[] {
  return Object.entries(role)
    .filter(([, value]) => value === 'admin')
    .map(([communityId]) => communityId);
}

function preview(value: string, length = 120): string {
  return value.length > length ? `${value.slice(0, length - 3)}...` : value;
}

async function getReportTargetAccess(
  targetId: string,
  targetType: ReportTargetType,
  reporterId: string,
  communityIds: string[],
) {
  if (targetType === 'listing') {
    const listing = await prisma.listing.findUnique({
      where: { id: targetId },
      select: { communityId: true },
    });
    if (!listing) {
      return { status: 404 as const, error: 'Listing not found' };
    }
    if (!communityIds.includes(listing.communityId)) {
      return { status: 403 as const, error: 'Forbidden' };
    }
    return { status: 200 as const };
  }

  if (targetType === 'message') {
    const message = await prisma.message.findUnique({
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
      return { status: 404 as const, error: 'Message not found' };
    }

    const communityId =
      message.conversation.listing?.communityId ??
      message.conversation.offer?.listing.communityId ??
      null;
    if (
      !message.conversation.participantIds.includes(reporterId) ||
      !communityId ||
      !communityIds.includes(communityId)
    ) {
      return { status: 403 as const, error: 'Forbidden' };
    }
    return { status: 200 as const };
  }

  if (targetId === reporterId) {
    return { status: 400 as const, error: 'Cannot report yourself' };
  }

  const sharedMembership = await prisma.communityMember.findFirst({
    where: {
      userId: targetId,
      communityId: { in: communityIds },
      status: 'active',
    },
    select: { userId: true },
  });
  if (!sharedMembership) {
    return { status: 404 as const, error: 'User not found' };
  }

  return { status: 200 as const };
}

async function reportTargetCommunityIds(
  targetId: string,
  targetType: ReportTargetType,
) {
  if (targetType === 'listing') {
    const listing = await prisma.listing.findUnique({
      where: { id: targetId },
      select: { communityId: true },
    });
    return listing ? [listing.communityId] : [];
  }

  if (targetType === 'message') {
    const message = await prisma.message.findUnique({
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
    const communityId =
      message?.conversation.listing?.communityId ??
      message?.conversation.offer?.listing.communityId;
    return communityId ? [communityId] : [];
  }

  const memberships = await prisma.communityMember.findMany({
    where: { userId: targetId, status: 'active' },
    select: { communityId: true },
  });
  return memberships.map((membership) => membership.communityId);
}

async function canAdminReport(
  report: { targetId: string; targetType: ReportTargetType },
  communityIds: string[],
) {
  const targetCommunityIds = await reportTargetCommunityIds(
    report.targetId,
    report.targetType,
  );
  return targetCommunityIds.some((communityId) =>
    communityIds.includes(communityId),
  );
}

async function targetSummaries(
  reports: Array<{ targetId: string; targetType: ReportTargetType }>,
) {
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
      ? prisma.listing.findMany({
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
      ? prisma.message.findMany({
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
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, displayName: true, phoneE164: true },
        })
      : [],
  ]);

  const listingMap = new Map(listings.map((listing) => [listing.id, listing]));
  const messageMap = new Map(messages.map((message) => [message.id, message]));
  const userMap = new Map(users.map((user) => [user.id, user]));

  const entries: Array<[string, TargetSummary | null]> = reports.map(
    (report) => {
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
        const listing =
          message?.conversation.listing ?? message?.conversation.offer?.listing;
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
    },
  );

  return new Map(entries);
}

const plugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get(
    '/',
    {
      preHandler: verifyJWT,
      schema: { querystring: ListReportsQuerySchema },
    },
    async (request, reply) => {
      const adminIds = adminCommunityIds(request.user.role);
      if (adminIds.length === 0) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const { status, severity, targetType, limit } =
        ListReportsQuerySchema.parse(request.query);
      const listings = await prisma.listing.findMany({
        where: { communityId: { in: adminIds } },
        select: { id: true },
      });
      const listingIds = listings.map((listing) => listing.id);
      const messages = await prisma.message.findMany({
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
      const members = await prisma.communityMember.findMany({
        where: { communityId: { in: adminIds }, status: 'active' },
        select: { userId: true },
      });
      const memberIds = members.map((member) => member.userId);

      const reports = await prisma.report.findMany({
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
      return reply.send(
        ok({
          reports: reports.map((report) => ({
            ...report,
            target: summaries.get(report.targetId) ?? null,
          })),
          adminCommunityIds: adminIds,
        }),
      );
    },
  );

  fastify.post(
    '/',
    {
      preHandler: verifyJWT,
      schema: { body: CreateReportSchema },
    },
    async (request, reply) => {
      const body = CreateReportSchema.parse(request.body);
      const access = await getReportTargetAccess(
        body.targetId,
        body.targetType,
        request.user.sub,
        request.user.communityIds,
      );
      if (access.status !== 200) {
        return reply.code(access.status).send({ error: access.error });
      }

      const report = await prisma.report.create({
        data: {
          reporterId: request.user.sub,
          targetId: body.targetId,
          targetType: body.targetType,
          reason: body.reason,
          severity: body.severity,
          status: 'open',
        },
      });

      return reply.code(201).send(ok({ report }));
    },
  );

  fastify.patch(
    '/:reportId',
    {
      preHandler: verifyJWT,
      schema: { body: UpdateReportStatusSchema },
    },
    async (request, reply) => {
      const adminIds = adminCommunityIds(request.user.role);
      if (adminIds.length === 0) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const { reportId } = request.params as { reportId: string };
      const body = UpdateReportStatusSchema.parse(request.body);
      const report = await prisma.report.findUnique({
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
      const allowed = await canAdminReport(
        { targetId: report.targetId, targetType: report.targetType },
        adminIds,
      );
      if (!allowed) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const nextStatus: ReportStatus = body.status;
      const updated = await prisma.report.update({
        where: { id: report.id },
        data: {
          status: nextStatus,
          moderatorId: request.user.sub,
          resolvedAt:
            nextStatus === 'resolved' || nextStatus === 'dismissed'
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

      return reply.send(
        ok({
          report: {
            ...updated,
            target: summaries.get(updated.targetId) ?? null,
          },
        }),
      );
    },
  );

  done();
};

export const reportRoutes = plugin;
