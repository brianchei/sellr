import type { FastifyPluginCallback } from 'fastify';
import {
  CommunityAdminParamsSchema,
  CommunityMemberAdminParamsSchema,
  CreateCommunityInviteCodeSchema,
  JoinCommunitySchema,
  UpdateCommunityMemberSchema,
} from '@sellr/shared';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { issueTokenPair } from '../../lib/authTokens';
import { isWebClient, setAuthCookies } from '../../lib/authCookies';
import { verifyJWT } from '../../middleware/auth';
import { normalizeEmail } from '../../lib/otp';

const INACTIVE_MEMBERSHIP_ERROR =
  'Membership is inactive. Ask a community admin to reactivate access.';

type MembershipRole = 'member' | 'admin';
type MembershipStatus = 'active' | 'inactive';

function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

async function requireActiveCommunityAdmin(
  userId: string,
  communityId: string,
): Promise<boolean> {
  const membership = await prisma.communityMember.findFirst({
    where: {
      userId,
      communityId,
      role: 'admin',
      status: 'active',
      community: { status: 'active' },
    },
    select: { userId: true },
  });
  return Boolean(membership);
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

async function adminCommunityIdsFor(userId: string): Promise<string[]> {
  const memberships = await prisma.communityMember.findMany({
    where: {
      userId,
      role: 'admin',
      status: 'active',
      community: { status: 'active' },
    },
    select: { communityId: true },
  });
  return memberships.map((membership) => membership.communityId);
}

const plugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.post(
    '/join',
    {
      preHandler: verifyJWT,
      schema: { body: JoinCommunitySchema },
    },
    async (request, reply) => {
      const body = JoinCommunitySchema.parse(request.body);
      let communityId: string | null = null;
      let inviteId: string | null = null;
      let inviteUseLimit: { maxUses: number | null; useCount: number } | null =
        null;

      if (body.inviteCode) {
        const code = normalizeInviteCode(body.inviteCode);
        const inv = await prisma.inviteCode.findFirst({
          where: { code },
          include: { community: true },
        });
        if (!inv) {
          return reply.code(404).send({ error: 'Invalid invite code' });
        }
        if (inv.community.status !== 'active') {
          return reply.code(404).send({ error: 'Invalid invite code' });
        }
        if (inv.expiresAt && inv.expiresAt < new Date()) {
          return reply.code(400).send({ error: 'Invite expired' });
        }
        communityId = inv.communityId;
        inviteId = inv.id;
        inviteUseLimit = { maxUses: inv.maxUses, useCount: inv.useCount };
      } else if (body.institutionalEmail) {
        const requestedEmail = normalizeEmail(body.institutionalEmail);
        const user = await prisma.user.findUnique({
          where: { id: request.user.sub },
          select: { email: true, emailVerifiedAt: true },
        });
        if (
          !user?.email ||
          !user.emailVerifiedAt ||
          normalizeEmail(user.email) !== requestedEmail
        ) {
          return reply.code(403).send({
            error: 'Verify this email before joining by email domain',
          });
        }

        const domain = requestedEmail.split('@')[1];
        if (!domain) {
          return reply.code(400).send({ error: 'Invalid email' });
        }
        const community = await prisma.community.findFirst({
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

      const existingMembership = await prisma.communityMember.findUnique({
        where: {
          userId_communityId: {
            userId: request.user.sub,
            communityId,
          },
        },
      });

      if (existingMembership?.status === 'inactive') {
        return reply.code(403).send({ error: INACTIVE_MEMBERSHIP_ERROR });
      }

      if (!existingMembership) {
        if (
          inviteUseLimit?.maxUses != null &&
          inviteUseLimit.useCount >= inviteUseLimit.maxUses
        ) {
          return reply.code(400).send({ error: 'Invite has no uses left' });
        }

        await prisma.$transaction(async (tx) => {
          await tx.communityMember.create({
            data: {
              userId: request.user.sub,
              communityId,
              role: 'member',
              status: 'active',
            },
          });
          if (inviteId) {
            await tx.inviteCode.update({
              where: { id: inviteId },
              data: { useCount: { increment: 1 } },
            });
          }
        });
      }

      const tokens = await issueTokenPair(fastify, request.user.sub);
      if (isWebClient(request.headers)) {
        setAuthCookies(reply, tokens);
        return reply.send(ok({ communityId }));
      }
      return reply.send(
        ok({
          communityId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      );
    },
  );

  fastify.get('/admin', { preHandler: verifyJWT }, async (request, reply) => {
    const adminCommunityIds = await adminCommunityIdsFor(request.user.sub);
    if (adminCommunityIds.length === 0) {
      return reply.code(403).send({ error: 'Admin access required' });
    }

    const communities = await prisma.community.findMany({
      where: { id: { in: adminCommunityIds } },
      orderBy: { name: 'asc' },
      include: {
        members: {
          orderBy: [{ status: 'asc' }, { role: 'asc' }, { joinedAt: 'desc' }],
          include: {
            user: {
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
            },
          },
        },
        inviteCodes: {
          orderBy: { code: 'asc' },
        },
      },
    });

    return reply.send(ok({ communities }));
  });

  fastify.post(
    '/:communityId/invites',
    {
      preHandler: verifyJWT,
      schema: { body: CreateCommunityInviteCodeSchema },
    },
    async (request, reply) => {
      const { communityId } = CommunityAdminParamsSchema.parse(request.params);
      const body = CreateCommunityInviteCodeSchema.parse(request.body);
      const isAdmin = await requireActiveCommunityAdmin(
        request.user.sub,
        communityId,
      );
      if (!isAdmin) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const code = normalizeInviteCode(body.code);
      const existing = await prisma.inviteCode.findUnique({
        where: { code },
        select: { id: true },
      });
      if (existing) {
        return reply.code(409).send({ error: 'Invite code already exists' });
      }

      const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
      if (expiresAt && expiresAt <= new Date()) {
        return reply
          .code(400)
          .send({ error: 'Invite expiration must be in the future' });
      }

      const inviteCode = await prisma.inviteCode.create({
        data: {
          communityId,
          code,
          maxUses: body.maxUses ?? null,
          expiresAt,
          createdBy: request.user.sub,
        },
      });

      return reply.code(201).send(ok({ inviteCode }));
    },
  );

  fastify.patch(
    '/:communityId/members/:userId',
    {
      preHandler: verifyJWT,
      schema: { body: UpdateCommunityMemberSchema },
    },
    async (request, reply) => {
      const { communityId, userId } = CommunityMemberAdminParamsSchema.parse(
        request.params,
      );
      const body = UpdateCommunityMemberSchema.parse(request.body);
      const isAdmin = await requireActiveCommunityAdmin(
        request.user.sub,
        communityId,
      );
      if (!isAdmin) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const membership = await prisma.communityMember.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId,
          },
        },
        include: {
          user: {
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
          },
        },
      });
      if (!membership) {
        return reply.code(404).send({ error: 'Member not found' });
      }

      const nextRole = (body.role ?? membership.role) as MembershipRole;
      const nextStatus = (body.status ?? membership.status) as MembershipStatus;
      const wasActiveAdmin =
        membership.role === 'admin' && membership.status === 'active';
      const remainsActiveAdmin =
        nextRole === 'admin' && nextStatus === 'active';

      if (wasActiveAdmin && !remainsActiveAdmin) {
        const count = await activeAdminCount(communityId);
        if (count <= 1) {
          return reply
            .code(400)
            .send({ error: 'A community must have at least one active admin' });
        }
      }

      const updated = await prisma.communityMember.update({
        where: {
          userId_communityId: {
            userId,
            communityId,
          },
        },
        data: {
          ...(body.role ? { role: body.role } : {}),
          ...(body.status ? { status: body.status } : {}),
        },
        include: {
          user: {
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
          },
        },
      });

      return reply.send(ok({ member: updated }));
    },
  );

  done();
};

export const communityRoutes = plugin;
