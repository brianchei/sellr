"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageForensicsWorker = imageForensicsWorker;
const aiObservability_1 = require("../lib/aiObservability");
async function imageForensicsWorker(job) {
    await (0, aiObservability_1.traceAIJob)('image_forensics', async (trace) => {
        trace?.update({
            metadata: {
                jobId: job.id,
                listingId: job.data.listingId,
                sellerId: job.data.sellerId,
                photoCount: job.data.photoUrls.length,
            },
        });
        void job.data.listingId;
        void job.data.photoUrls;
        void job.data.sellerId;
        // Future: OpenAI GPT-4o Vision + persistence
    });
}
