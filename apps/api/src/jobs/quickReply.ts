import type { Job } from 'bullmq';
import { traceAIJob } from '../lib/aiObservability';
import type { QuickReplyJob } from '../lib/jobTypes';

export async function quickReplyWorker(job: Job<QuickReplyJob>): Promise<void> {
  await traceAIJob('quick_reply', async (trace) => {
    void trace;
    void job.data.messageId;
    void job.data.conversationId;
    void job.data.content;
    void job.data.listingId;
    void job.data.sellerId;
    // Future: Anthropic Haiku classification + suggested replies
  });
}
