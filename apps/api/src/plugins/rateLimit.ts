import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { redis } from '../lib/redis';

function rateLimitKey(req: FastifyRequest): string {
  const u = req.user as { sub?: string } | undefined;
  return u?.sub ?? req.ip;
}

export const rateLimitPlugin: FastifyPluginAsync = fp(async (fastify) => {
  await fastify.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    redis,
    keyGenerator: rateLimitKey,
    errorResponseBuilder: () => ({
      error: 'Too many requests. Please slow down.',
    }),
  });

  fastify.addHook('onRequest', async (req, reply) => {
    if (req.url.includes('/auth/otp/send')) {
      void reply;
      // 5 OTP requests per phone number per hour — enforced in route handler via Redis
    }
  });
});
