"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const isDev = process.env.NODE_ENV === 'development';
exports.logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL ?? 'info',
    transport: isDev
        ? { target: 'pino-pretty', options: { colorize: true } }
        : process.env.LOGTAIL_SOURCE_TOKEN
            ? {
                target: '@logtail/pino',
                options: { sourceToken: process.env.LOGTAIL_SOURCE_TOKEN },
            }
            : undefined,
    serializers: {
        req: pino_1.default.stdSerializers.req,
        res: pino_1.default.stdSerializers.res,
        err: pino_1.default.stdSerializers.err,
    },
    redact: ['req.headers.authorization', 'body.phoneE164', 'body.code'],
});
