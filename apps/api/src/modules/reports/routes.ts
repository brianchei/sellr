import type { FastifyPluginCallback } from 'fastify';
import { CreateReportSchema } from '@sellr/shared';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { verifyJWT } from '../../middleware/auth';

async function getReportTargetAccess(
  targetId: string,
  targetType: 'listing' | 'user' | 'message',
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

const plugin: FastifyPluginCallback = (fastify, _opts, done) => {
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

  done();
};

export const reportRoutes = plugin;
