import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import type { FastifyPluginAsync } from 'fastify';

export const corsPlugin: FastifyPluginAsync = fp(async (fastify) => {
  await fastify.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? true,
    credentials: true,
  });
});
