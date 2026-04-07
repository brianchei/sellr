import { Queue } from 'bullmq';
import { redis } from './redis';

const defaultJobOptions = {
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
};

export const aiQueue = new Queue('ai', {
  connection: redis,
  defaultJobOptions,
});

export const searchSyncQueue = new Queue('search-sync', {
  connection: redis,
  defaultJobOptions,
});

export const notificationQueue = new Queue('notifications', {
  connection: redis,
  defaultJobOptions,
});

export const savedSearchQueue = new Queue('saved-search', {
  connection: redis,
  defaultJobOptions,
});

export const quickReplyQueue = new Queue('quick-reply', {
  connection: redis,
  defaultJobOptions,
});
