"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtPlugin = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
exports.jwtPlugin = (0, fastify_plugin_1.default)(async (fastify) => {
    await fastify.register(jwt_1.default, {
        secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    });
});
