"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRoutes = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const shared_1 = require("@sellr/shared");
const prisma_1 = require("../../lib/prisma");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
const plugin = (fastify, _opts, done) => {
    fastify.get('/', {
        preHandler: auth_1.verifyJWT,
        schema: { querystring: shared_1.ListNotificationsQuerySchema },
    }, async (request, reply) => {
        const { limit, unreadOnly } = shared_1.ListNotificationsQuerySchema.parse(request.query);
        const notifications = await prisma_1.prisma.notification.findMany({
            where: {
                userId: request.user.sub,
                ...(unreadOnly ? { readAt: null } : {}),
            },
            orderBy: { sentAt: 'desc' },
            take: limit,
        });
        return reply.send((0, response_1.ok)({ notifications }));
    });
    fastify.post('/read-all', { preHandler: auth_1.verifyJWT }, async (request, reply) => {
        const result = await prisma_1.prisma.notification.updateMany({
            where: { userId: request.user.sub, readAt: null },
            data: { readAt: new Date() },
        });
        return reply.send((0, response_1.ok)({ updatedCount: result.count }));
    });
    fastify.post('/:notificationId/read', { preHandler: auth_1.verifyJWT }, async (request, reply) => {
        const { notificationId } = request.params;
        const existing = await prisma_1.prisma.notification.findFirst({
            where: { id: notificationId, userId: request.user.sub },
        });
        if (!existing) {
            return reply.code(404).send({ error: 'Notification not found' });
        }
        const notification = await prisma_1.prisma.notification.update({
            where: { id: notificationId },
            data: { readAt: new Date() },
        });
        return reply.send((0, response_1.ok)({ notification }));
    });
    done();
};
exports.notificationRoutes = (0, fastify_plugin_1.default)(plugin);
