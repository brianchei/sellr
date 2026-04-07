"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const socket_io_1 = require("socket.io");
const fastify_type_provider_zod_1 = require("fastify-type-provider-zod");
const cors_1 = require("./plugins/cors");
const jwt_1 = require("./plugins/jwt");
const rateLimit_1 = require("./plugins/rateLimit");
const routes_1 = require("./modules/auth/routes");
const routes_2 = require("./modules/listings/routes");
const routes_3 = require("./modules/offers/routes");
const routes_4 = require("./modules/meetups/routes");
const routes_5 = require("./modules/messages/routes");
const routes_6 = require("./modules/search/routes");
const routes_7 = require("./modules/communities/routes");
const routes_8 = require("./modules/reports/routes");
const routes_9 = require("./modules/notifications/routes");
const socket_1 = require("./lib/socket");
const queue_1 = require("./lib/queue");
const logger_1 = require("./lib/logger");
const fastify = (0, fastify_1.default)({
    logger: logger_1.logger,
    trustProxy: true,
}).withTypeProvider();
fastify.setValidatorCompiler(fastify_type_provider_zod_1.validatorCompiler);
fastify.setSerializerCompiler(fastify_type_provider_zod_1.serializerCompiler);
const io = new socket_io_1.Server(fastify.server, {
    cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
        credentials: true,
    },
});
async function start() {
    await fastify.register(cors_1.corsPlugin);
    await fastify.register(jwt_1.jwtPlugin);
    await fastify.register(rateLimit_1.rateLimitPlugin);
    fastify.get('/health', async () => ({
        status: 'ok',
        ts: new Date().toISOString(),
    }));
    await fastify.register(routes_1.authRoutes, { prefix: '/api/v1/auth' });
    await fastify.register(routes_7.communityRoutes, { prefix: '/api/v1/communities' });
    await fastify.register(routes_2.listingRoutes, { prefix: '/api/v1/listings' });
    await fastify.register(routes_6.searchRoutes, { prefix: '/api/v1/search' });
    await fastify.register(routes_3.offerRoutes, { prefix: '/api/v1/offers' });
    await fastify.register(routes_4.meetupRoutes, { prefix: '/api/v1/meetups' });
    await fastify.register(routes_5.messageRoutes, { prefix: '/api/v1/messages' });
    await fastify.register(routes_8.reportRoutes, { prefix: '/api/v1/reports' });
    await fastify.register(routes_9.notificationRoutes, {
        prefix: '/api/v1/notifications',
    });
    (0, socket_1.initSocketIO)(io);
    await (0, queue_1.initBullMQ)();
    const port = parseInt(process.env.PORT ?? '3001', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`API running on port ${port}`);
}
start().catch((err) => {
    fastify.log.error(err);
    process.exit(1);
});
