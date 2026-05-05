"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./lib/sentry");
const fastify_1 = __importDefault(require("fastify"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const socket_io_1 = require("socket.io");
const fastify_type_provider_zod_1 = require("fastify-type-provider-zod");
const Sentry = __importStar(require("@sentry/node"));
const cookies_1 = require("./plugins/cookies");
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
const routes_10 = require("./modules/uploads/routes");
const socket_1 = require("./lib/socket");
const queue_1 = require("./lib/queue");
const logger_1 = require("./lib/logger");
const fastify = (0, fastify_1.default)({
    loggerInstance: logger_1.logger,
    trustProxy: true,
}).withTypeProvider();
fastify.setValidatorCompiler(fastify_type_provider_zod_1.validatorCompiler);
fastify.setSerializerCompiler(fastify_type_provider_zod_1.serializerCompiler);
fastify.setErrorHandler((error, request, reply) => {
    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500;
    if (statusCode >= 500) {
        const user = request.user;
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
const io = new socket_io_1.Server(fastify.server, {
    cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [
            'http://localhost:3000',
        ],
        credentials: true,
    },
});
async function start() {
    await fastify.register(cookies_1.cookiesPlugin);
    await fastify.register(cors_1.corsPlugin);
    await fastify.register(jwt_1.jwtPlugin);
    await fastify.register(rateLimit_1.rateLimitPlugin);
    await fastify.register(multipart_1.default);
    fastify.get('/health', () => ({
        status: 'ok',
        ts: new Date().toISOString(),
    }));
    await fastify.register(routes_1.authRoutes, { prefix: '/api/v1/auth' });
    await fastify.register(routes_7.communityRoutes, { prefix: '/api/v1/communities' });
    await fastify.register(routes_2.listingRoutes, { prefix: '/api/v1/listings' });
    await fastify.register(routes_6.searchRoutes, { prefix: '/api/v1/search' });
    await fastify.register(routes_3.offerRoutes, { prefix: '/api/v1/offers' });
    await fastify.register(routes_4.meetupRoutes, { prefix: '/api/v1/meetups' });
    await fastify.register(routes_5.messageRoutes, { prefix: '/api/v1/conversations' });
    await fastify.register(routes_8.reportRoutes, { prefix: '/api/v1/reports' });
    await fastify.register(routes_9.notificationRoutes, {
        prefix: '/api/v1/notifications',
    });
    await fastify.register(routes_10.uploadRoutes, { prefix: '/api/v1/uploads' });
    (0, socket_1.initSocketIO)(io);
    (0, queue_1.initBullMQ)();
    const port = parseInt(process.env.PORT ?? '3001', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`API running on port ${String(port)}`);
}
start().catch((err) => {
    fastify.log.error(err);
    process.exit(1);
});
