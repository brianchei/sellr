"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quickReplyQueue = exports.savedSearchQueue = exports.notificationQueue = exports.searchSyncQueue = exports.aiQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("./redis");
const defaultJobOptions = {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
};
exports.aiQueue = new bullmq_1.Queue('ai', {
    connection: redis_1.redis,
    defaultJobOptions,
});
exports.searchSyncQueue = new bullmq_1.Queue('search-sync', {
    connection: redis_1.redis,
    defaultJobOptions,
});
exports.notificationQueue = new bullmq_1.Queue('notifications', {
    connection: redis_1.redis,
    defaultJobOptions,
});
exports.savedSearchQueue = new bullmq_1.Queue('saved-search', {
    connection: redis_1.redis,
    defaultJobOptions,
});
exports.quickReplyQueue = new bullmq_1.Queue('quick-reply', {
    connection: redis_1.redis,
    defaultJobOptions,
});
