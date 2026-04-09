import fp from 'fastify-plugin';
import type { FastifyPluginCallback } from 'fastify';
import { JoinCommunitySchema } from '@sellr/shared';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { issueTokenPair } from '../../lib/authTokens';
import { verifyJWT } from '../../middleware/auth';

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

      if (body.inviteCode) {
        const inv = await prisma.inviteCode.findFirst({
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
        await prisma.inviteCode.update({
          where: { id: inv.id },
          data: { useCount: { increment: 1 } },
        });
      } else if (body.institutionalEmail) {
        const domain = body.institutionalEmail.split('@')[1];
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

      await prisma.communityMember.upsert({
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

      const tokens = await issueTokenPair(fastify, request.user.sub);
      return reply.send(
        ok({
          communityId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      );
    },
  );

  done();
};

export const communityRoutes = fp(plugin);
