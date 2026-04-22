import type { FastifyPluginCallback } from 'fastify';
import { CreateReportSchema } from '@sellr/shared';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { verifyJWT } from '../../middleware/auth';

const plugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.post(
    '/',
    {
      preHandler: verifyJWT,
      schema: { body: CreateReportSchema },
    },
    async (request, reply) => {
      const body = CreateReportSchema.parse(request.body);

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
