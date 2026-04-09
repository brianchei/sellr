import type { Job } from 'bullmq';
import { traceAIJob } from '../lib/aiObservability';
import type { ImageForensicsJob } from '../lib/jobTypes';

export async function imageForensicsWorker(
  job: Job<ImageForensicsJob>,
): Promise<void> {
  await traceAIJob('image_forensics', async (trace) => {
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
