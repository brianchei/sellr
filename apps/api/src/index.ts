import './lib/sentry';

import Fastify, { type FastifyError } from 'fastify';
import { Server } from 'socket.io';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import * as Sentry from '@sentry/node';

import { corsPlugin } from './plugins/cors';
import { jwtPlugin } from './plugins/jwt';
import { rateLimitPlugin } from './plugins/rateLimit';
import { authRoutes } from './modules/auth/routes';
import { listingRoutes } from './modules/listings/routes';
import { offerRoutes } from './modules/offers/routes';
import { meetupRoutes } from './modules/meetups/routes';
import { messageRoutes } from './modules/messages/routes';
import { searchRoutes } from './modules/search/routes';
import { communityRoutes } from './modules/communities/routes';
import { reportRoutes } from './modules/reports/routes';
import { notificationRoutes } from './modules/notifications/routes';
import { initSocketIO } from './lib/socket';
import { initBullMQ } from './lib/queue';
import { logger } from './lib/logger';
import type { JWTPayload } from './middleware/auth';

const fastify = Fastify({
  logger,
  trustProxy: true,
}).withTypeProvider<ZodTypeProvider>();

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

fastify.setErrorHandler((error: FastifyError, request, reply) => {
  const statusCode =
    typeof error.statusCode === 'number' ? error.statusCode : 500;

  if (statusCode >= 500) {
    const user = request.user as JWTPayload | undefined;
    Sentry.captureException(error, {
      tags: { route: request.routeOptions.url ?? 'unknown' },
      user: user?.sub ? { id: user.sub } : undefined,
    });
  }

  fastify.log.error({ err: error, req: request.id }, 'Unhandled error');

  reply.status(statusCode).send({
    error: statusCode >= 500 ? 'Internal server error' : error.message,
    code: typeof error.code === 'string' ? error.code : undefined,
  });
});

const io = new Server(fastify.server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [
      'http://localhost:3000',
    ],
    credentials: true,
  },
});

async function start() {
  await fastify.register(corsPlugin);
  await fastify.register(jwtPlugin);
  await fastify.register(rateLimitPlugin);

  fastify.get('/health', () => ({
    status: 'ok',
    ts: new Date().toISOString(),
  }));

  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(communityRoutes, { prefix: '/api/v1/communities' });
  await fastify.register(listingRoutes, { prefix: '/api/v1/listings' });
  await fastify.register(searchRoutes, { prefix: '/api/v1/search' });
  await fastify.register(offerRoutes, { prefix: '/api/v1/offers' });
  await fastify.register(meetupRoutes, { prefix: '/api/v1/meetups' });
  await fastify.register(messageRoutes, { prefix: '/api/v1/messages' });
  await fastify.register(reportRoutes, { prefix: '/api/v1/reports' });
  await fastify.register(notificationRoutes, {
    prefix: '/api/v1/notifications',
  });

  initSocketIO(io);
  initBullMQ();

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await fastify.listen({ port, host: '0.0.0.0' });
  fastify.log.info(`API running on port ${String(port)}`);
}

start().catch((err: unknown) => {
  fastify.log.error(err);
  process.exit(1);
});
