"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initBullMQ = initBullMQ;
const bullmq_1 = require("bullmq");
const redis_1 = require("./redis");
const imageForensics_1 = require("../jobs/imageForensics");
const searchSync_1 = require("../jobs/searchSync");
const notifications_1 = require("../jobs/notifications");
const savedSearch_1 = require("../jobs/savedSearch");
const quickReply_1 = require("../jobs/quickReply");
function initBullMQ() {
    new bullmq_1.Worker('ai', imageForensics_1.imageForensicsWorker, {
        connection: redis_1.redis,
        concurrency: 3,
    });
    new bullmq_1.Worker('search-sync', searchSync_1.searchSyncWorker, {
        connection: redis_1.redis,
        concurrency: 5,
    });
    new bullmq_1.Worker('notifications', notifications_1.notificationWorker, {
        connection: redis_1.redis,
        concurrency: 10,
    });
    new bullmq_1.Worker('saved-search', savedSearch_1.savedSearchWorker, {
        connection: redis_1.redis,
        concurrency: 5,
    });
    new bullmq_1.Worker('quick-reply', quickReply_1.quickReplyWorker, {
        connection: redis_1.redis,
        concurrency: 5,
    });
    console.log('BullMQ workers initialized');
}
