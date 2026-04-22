"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRoutes = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const shared_1 = require("@sellr/shared");
const prisma_1 = require("../../lib/prisma");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
const plugin = (fastify, _opts, done) => {
    fastify.post('/', {
        preHandler: auth_1.verifyJWT,
        schema: { body: shared_1.CreateReportSchema },
    }, async (request, reply) => {
        const body = shared_1.CreateReportSchema.parse(request.body);
        const report = await prisma_1.prisma.report.create({
            data: {
                reporterId: request.user.sub,
                targetId: body.targetId,
                targetType: body.targetType,
                reason: body.reason,
                severity: body.severity,
                status: 'open',
            },
        });
        return reply.code(201).send((0, response_1.ok)({ report }));
    });
    done();
};
exports.reportRoutes = (0, fastify_plugin_1.default)(plugin);
