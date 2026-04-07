import type { Job } from 'bullmq';

export async function searchSyncWorker(job: Job): Promise<void> {
  void job;
}
