import type { Job } from 'bullmq';

export async function notificationWorker(job: Job): Promise<void> {
  void job;
}
