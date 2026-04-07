import type { Job } from 'bullmq';

export async function imageForensicsWorker(job: Job): Promise<void> {
  void job;
}
