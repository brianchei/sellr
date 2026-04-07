import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyPluginAsync } from 'fastify';

export const jwtPlugin: FastifyPluginAsync = fp(async (fastify) => {
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  });
});
