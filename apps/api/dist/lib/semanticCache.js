"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedLLMResponse = getCachedLLMResponse;
exports.setCachedLLMResponse = setCachedLLMResponse;
exports.hashPrompt = hashPrompt;
const crypto_1 = __importDefault(require("crypto"));
const redis_1 = require("./redis");
async function getCachedLLMResponse(promptHash) {
    return redis_1.redis.get(`llm:cache:${promptHash}`);
}
async function setCachedLLMResponse(promptHash, response, ttlSeconds = 3600) {
    await redis_1.redis.setex(`llm:cache:${promptHash}`, ttlSeconds, response);
}
function hashPrompt(prompt) {
    return crypto_1.default.createHash('sha256').update(prompt).digest('hex');
}
