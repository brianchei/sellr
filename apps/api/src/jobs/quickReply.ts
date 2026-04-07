import type { Job } from 'bullmq';

export async function quickReplyWorker(job: Job): Promise<void> {
  void job;
}
