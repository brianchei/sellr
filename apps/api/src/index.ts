import Fastify from 'fastify';
import { Server } from 'socket.io';
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';

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

const fastify = Fastify({
  logger,
  trustProxy: true,
}).withTypeProvider<ZodTypeProvider>();

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

const io = new Server(fastify.server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  },
});

async function start() {
  await fastify.register(corsPlugin);
  await fastify.register(jwtPlugin);
  await fastify.register(rateLimitPlugin);

  fastify.get('/health', async () => ({
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
  await initBullMQ();

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await fastify.listen({ port, host: '0.0.0.0' });
  fastify.log.info(`API running on port ${port}`);
}

start().catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});
