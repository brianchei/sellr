"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitPlugin = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const redis_1 = require("../lib/redis");
function rateLimitKey(req) {
    const u = req.user;
    return u?.sub ?? req.ip;
}
exports.rateLimitPlugin = (0, fastify_plugin_1.default)(async (fastify) => {
    await fastify.register(rate_limit_1.default, {
        global: true,
        max: 100,
        timeWindow: '1 minute',
        redis: redis_1.redis,
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
