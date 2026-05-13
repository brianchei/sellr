import type { FastifyPluginCallback } from 'fastify';
import {
  CreateReportSchema,
  ListReportsQuerySchema,
  ReportMemberActionSchema,
  UpdateReportStatusSchema,
} from '@sellr/shared';
import { prisma } from '../../lib/prisma';
import { queueListingPhotoUrlDeletion } from '../../lib/mediaAssets';
import { searchSyncQueue } from '../../lib/queues';
import { ok } from '../../lib/response';
import { verifyJWT } from '../../middleware/auth';

type ReportTargetType = 'listing' | 'user' | 'message';
type ReportStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';
type ReportMemberAction =
  | 'demote_admin'
  | 'deactivate_member'
  | 'suspend_member';
type ModerationActionType =
  | 'admin_demoted'
  | 'member_deactivated'
  | 'member_suspended';
type ModerationActionSummary = {
  id: string;
  reportId: string | null;
  communityId: string;
  targetUserId: string;
  moderatorId: string;
  actionType: string;
  previousRole: string | null;
  nextRole: string | null;
  previousStatus: string | null;
  nextStatus: string | null;
  previousAccessStatusReason: string | null;
  nextAccessStatusReason: string | null;
  note: string | null;
  createdAt: Date;
  moderator: {
    id: string;
    displayName: string;
  };
  targetUser: {
    id: string;
    displayName: string;
  };
};
type TargetSummary = {
  label: string;
  detail: string;
  href: string | null;
  communityId: string | null;
  memberManagement: {
    userId: string;
    communityId: string;
    displayName: string;
    role: string;
    status: string;
    accessStatusReason: string | null;
    accessSuspendedUntil: Date | null;
    contact: string;
  } | null;
};

type ReportWithModerationActions = {
  id: string;
  targetId: string;
  targetType: ReportTargetType;
  moderationActions?: ModerationActionSummary[];
};

function adminCommunityIds(role: Record<string, string>): string[] {
  return Object.entries(role)
    .filter(([, value]) => value === 'admin')
    .map(([communityId]) => communityId);
}

function preview(value: string, length = 120): string {
  return value.length > length ? `${value.slice(0, length - 3)}...` : value;
}

async function activeAdminCount(communityId: string): Promise<number> {
  return prisma.communityMember.count({
    where: {
      communityId,
      role: 'admin',
      status: 'active',
    },
  });
}

function actionTypeFor(action: ReportMemberAction): ModerationActionType {
  if (action === 'demote_admin') return 'admin_demoted';
  if (action === 'suspend_member') return 'member_suspended';
  return 'member_deactivated';
}

function accessStatusReasonFor(action: ReportMemberAction): string | null {
  if (action === 'deactivate_member') return 'report_deactivated';
  if (action === 'suspend_member') return 'report_suspension';
  return null;
}

function moderationActionLabel(actionType: string): string {
  if (actionType === 'admin_demoted') return 'Demoted admin';
  if (actionType === 'member_suspended') return 'Suspended access';
  if (actionType === 'member_deactivated') return 'Deactivated access';
  if (actionType === 'member_reactivated') return 'Reactivated access';
  if (actionType === 'admin_promoted') return 'Promoted admin';
  return actionType.replaceAll('_', ' ');
}

async function moderationActionsByReportId(reportIds: string[]) {
  if (reportIds.length === 0)
    return new Map<string, ModerationActionSummary[]>();

  const actions = await prisma.moderationAction.findMany({
    where: { reportId: { in: reportIds } },
    orderBy: { createdAt: 'desc' },
    include: {
      moderator: { select: { id: true, displayName: true } },
      targetUser: { select: { id: true, displayName: true } },
    },
  });

  const grouped = new Map<string, ModerationActionSummary[]>();
  actions.forEach((action) => {
    if (!action.reportId) return;
    const list = grouped.get(action.reportId) ?? [];
    list.push(action);
    grouped.set(action.reportId, list);
  });
  return grouped;
}

async function attachReportContext<T extends ReportWithModerationActions>(
  reports: T[],
  adminIds: string[],
) {
  const [summaries, moderationActions] = await Promise.all([
    targetSummaries(reports, adminIds),
    moderationActionsByReportId(reports.map((report) => report.id)),
  ]);

  return reports.map((report) => ({
    ...report,
    target: summaries.get(report.targetId) ?? null,
    moderationActions: moderationActions.get(report.id) ?? [],
  }));
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
    where: { userId: targetId },
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

function memberContact(user: {
  email: string | null;
  phoneE164: string | null;
}) {
  return user.email ?? user.phoneE164 ?? 'No contact on file';
}

async function targetSummaries(
  reports: Array<{ targetId: string; targetType: ReportTargetType }>,
  adminCommunityIds: string[],
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
            sellerId: true,
            seller: {
              select: {
                displayName: true,
                email: true,
                phoneE164: true,
              },
            },
          },
        })
      : [],
    messageIds.length
      ? prisma.message.findMany({
          where: { id: { in: messageIds } },
          select: {
            id: true,
            content: true,
            senderId: true,
            sender: {
              select: {
                displayName: true,
                email: true,
                phoneE164: true,
              },
            },
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
          select: {
            id: true,
            displayName: true,
            phoneE164: true,
            email: true,
          },
        })
      : [],
  ]);

  const listingMap = new Map(listings.map((listing) => [listing.id, listing]));
  const messageMap = new Map(messages.map((message) => [message.id, message]));
  const userMap = new Map(users.map((user) => [user.id, user]));
  const memberCandidates = reports
    .map((report) => {
      if (report.targetType === 'listing') {
        const listing = listingMap.get(report.targetId);
        return listing
          ? {
              reportKey: report.targetId,
              userId: listing.sellerId,
              communityId: listing.communityId,
              displayName: listing.seller.displayName,
              contact: memberContact(listing.seller),
            }
          : null;
      }

      if (report.targetType === 'message') {
        const message = messageMap.get(report.targetId);
        const listing =
          message?.conversation.listing ?? message?.conversation.offer?.listing;
        return message && listing?.communityId
          ? {
              reportKey: report.targetId,
              userId: message.senderId,
              communityId: listing.communityId,
              displayName: message.sender.displayName,
              contact: memberContact(message.sender),
            }
          : null;
      }

      const user = userMap.get(report.targetId);
      return user
        ? {
            reportKey: report.targetId,
            userId: user.id,
            communityId: null,
            displayName: user.displayName,
            contact: memberContact(user),
          }
        : null;
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> =>
      Boolean(candidate),
    );

  const memberUserIds = Array.from(
    new Set(memberCandidates.map((candidate) => candidate.userId)),
  );
  const memberships = memberUserIds.length
    ? await prisma.communityMember.findMany({
        where: {
          userId: { in: memberUserIds },
          communityId: { in: adminCommunityIds },
        },
        select: {
          userId: true,
          communityId: true,
          role: true,
          status: true,
          accessStatusReason: true,
          accessSuspendedUntil: true,
        },
      })
    : [];
  const membershipsByKey = new Map(
    memberships.map((membership) => [
      `${membership.userId}:${membership.communityId}`,
      membership,
    ]),
  );
  const firstMembershipByUserId = new Map<
    string,
    (typeof memberships)[number]
  >();
  memberships.forEach((membership) => {
    if (!firstMembershipByUserId.has(membership.userId)) {
      firstMembershipByUserId.set(membership.userId, membership);
    }
  });
  const memberCandidateByReportKey = new Map(
    memberCandidates.map((candidate) => [candidate.reportKey, candidate]),
  );

  function memberManagementFor(reportKey: string) {
    const candidate = memberCandidateByReportKey.get(reportKey);
    if (!candidate) return null;
    const membership = candidate.communityId
      ? membershipsByKey.get(`${candidate.userId}:${candidate.communityId}`)
      : firstMembershipByUserId.get(candidate.userId);
    if (!membership) return null;
    return {
      userId: candidate.userId,
      communityId: membership.communityId,
      displayName: candidate.displayName,
      role: membership.role,
      status: membership.status,
      accessStatusReason: membership.accessStatusReason,
      accessSuspendedUntil: membership.accessSuspendedUntil,
      contact: candidate.contact,
    };
  }

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
                memberManagement: memberManagementFor(report.targetId),
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
                memberManagement: memberManagementFor(report.targetId),
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
              detail: `Member - ${user.email ?? user.phoneE164 ?? 'No contact on file'}`,
              href: null,
              communityId:
                memberManagementFor(report.targetId)?.communityId ?? null,
              memberManagement: memberManagementFor(report.targetId),
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
        where: { communityId: { in: adminIds } },
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
              email: true,
              emailVerifiedAt: true,
            },
          },
        },
      });

      const reportsWithContext = await attachReportContext(reports, adminIds);
      return reply.send(
        ok({
          reports: reportsWithContext,
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
              email: true,
              emailVerifiedAt: true,
            },
          },
        },
      });
      const [reportWithContext] = await attachReportContext(
        [updated],
        adminIds,
      );

      return reply.send(
        ok({
          report: reportWithContext,
        }),
      );
    },
  );

  fastify.post(
    '/:reportId/member-action',
    {
      preHandler: verifyJWT,
      schema: { body: ReportMemberActionSchema },
    },
    async (request, reply) => {
      const adminIds = adminCommunityIds(request.user.role);
      if (adminIds.length === 0) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const { reportId } = request.params as { reportId: string };
      const body = ReportMemberActionSchema.parse(request.body);
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

      const summaries = await targetSummaries([report], adminIds);
      const member = summaries.get(report.targetId)?.memberManagement ?? null;
      if (!member) {
        return reply
          .code(400)
          .send({ error: 'Report target is not a manageable member' });
      }

      const membership = await prisma.communityMember.findUnique({
        where: {
          userId_communityId: {
            userId: member.userId,
            communityId: member.communityId,
          },
        },
      });
      if (!membership) {
        return reply.code(404).send({ error: 'Member not found' });
      }

      const nextRole =
        body.action === 'demote_admin' ? 'member' : membership.role;
      const nextStatus =
        body.action === 'demote_admin' ? membership.status : 'inactive';
      const nextAccessStatusReason = accessStatusReasonFor(body.action);

      if (body.action === 'demote_admin' && membership.role !== 'admin') {
        return reply.code(400).send({ error: 'Member is not an admin' });
      }
      if (
        (body.action === 'deactivate_member' ||
          body.action === 'suspend_member') &&
        membership.status !== 'active'
      ) {
        return reply
          .code(400)
          .send({ error: 'Member access is already inactive' });
      }

      const wasActiveAdmin =
        membership.role === 'admin' && membership.status === 'active';
      const remainsActiveAdmin =
        nextRole === 'admin' && nextStatus === 'active';
      if (wasActiveAdmin && !remainsActiveAdmin) {
        const count = await activeAdminCount(member.communityId);
        if (count <= 1) {
          return reply
            .code(400)
            .send({ error: 'A community must have at least one active admin' });
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.communityMember.update({
          where: {
            userId_communityId: {
              userId: member.userId,
              communityId: member.communityId,
            },
          },
          data: {
            role: nextRole,
            status: nextStatus,
            ...(body.action === 'demote_admin'
              ? {}
              : {
                  accessStatusReason: nextAccessStatusReason,
                  accessStatusNote: body.note ?? null,
                  accessSuspendedUntil: null,
                }),
          },
        });

        await tx.moderationAction.create({
          data: {
            reportId: report.id,
            communityId: member.communityId,
            targetUserId: member.userId,
            moderatorId: request.user.sub,
            actionType: actionTypeFor(body.action),
            previousRole: membership.role,
            nextRole,
            previousStatus: membership.status,
            nextStatus,
            previousAccessStatusReason: membership.accessStatusReason,
            nextAccessStatusReason,
            note:
              body.note ??
              `${moderationActionLabel(actionTypeFor(body.action))} from report review.`,
          },
        });
      });

      const updated = await prisma.report.findUniqueOrThrow({
        where: { id: report.id },
        include: {
          reporter: {
            select: {
              id: true,
              displayName: true,
              phoneE164: true,
              email: true,
              emailVerifiedAt: true,
            },
          },
        },
      });
      const [reportWithContext] = await attachReportContext(
        [updated],
        adminIds,
      );

      return reply.send(ok({ report: reportWithContext }));
    },
  );

  fastify.post(
    '/:reportId/remove-listing',
    { preHandler: verifyJWT },
    async (request, reply) => {
      const adminIds = adminCommunityIds(request.user.role);
      if (adminIds.length === 0) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const { reportId } = request.params as { reportId: string };
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
      if (report.targetType !== 'listing') {
        return reply
          .code(400)
          .send({ error: 'Only listing reports can remove listings' });
      }

      const allowed = await canAdminReport(
        { targetId: report.targetId, targetType: report.targetType },
        adminIds,
      );
      if (!allowed) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const listing = await prisma.listing.findUnique({
        where: { id: report.targetId },
      });
      if (!listing) {
        return reply.code(404).send({ error: 'Listing not found' });
      }

      const [, updated] = await prisma.$transaction([
        prisma.listing.update({
          where: { id: listing.id },
          data: {
            status: 'expired',
            photoUrls: [],
          },
        }),
        prisma.report.update({
          where: { id: report.id },
          data: {
            status: 'resolved',
            moderatorId: request.user.sub,
            resolvedAt: new Date(),
          },
          include: {
            reporter: {
              select: {
                id: true,
                displayName: true,
                phoneE164: true,
                email: true,
                emailVerifiedAt: true,
              },
            },
          },
        }),
      ]);

      await searchSyncQueue.add('sync', {
        listingId: listing.id,
        action: 'delete',
      });
      await queueListingPhotoUrlDeletion({
        listingId: listing.id,
        photoUrls: listing.photoUrls,
        reason: 'moderation_listing_removed',
      });

      const [reportWithContext] = await attachReportContext(
        [updated],
        adminIds,
      );
      return reply.send(
        ok({
          report: reportWithContext,
          listingRemoved: true,
        }),
      );
    },
  );

  done();
};

export const reportRoutes = plugin;
