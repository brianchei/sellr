import type { Job } from 'bullmq';

export async function savedSearchWorker(job: Job): Promise<void> {
  void job;
}
