import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

const plugin: FastifyPluginAsync = async () => {};

export const meetupRoutes = fp(plugin);
