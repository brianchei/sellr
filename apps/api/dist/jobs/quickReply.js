"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quickReplyWorker = quickReplyWorker;
const aiObservability_1 = require("../lib/aiObservability");
async function quickReplyWorker(job) {
    await (0, aiObservability_1.traceAIJob)('quick_reply', async (trace) => {
        trace?.update({
            metadata: {
                jobId: job.id,
                messageId: job.data.messageId,
                conversationId: job.data.conversationId,
                listingId: job.data.listingId,
                sellerId: job.data.sellerId,
                contentLength: job.data.content.length,
            },
        });
        void job.data.messageId;
        void job.data.conversationId;
        void job.data.content;
        void job.data.listingId;
        void job.data.sellerId;
        // Future: Anthropic Haiku classification + suggested replies
    });
}
