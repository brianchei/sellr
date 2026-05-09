import { Worker } from 'bullmq';
import { redis } from './redis';
import { imageForensicsWorker } from '../jobs/imageForensics';
import { searchSyncWorker } from '../jobs/searchSync';
import { notificationWorker } from '../jobs/notifications';
import { savedSearchWorker } from '../jobs/savedSearch';
import { quickReplyWorker } from '../jobs/quickReply';
import { mediaCleanupWorker } from '../jobs/mediaCleanup';

export function initBullMQ(): void {
  new Worker('ai', imageForensicsWorker, {
    connection: redis,
    concurrency: 3,
  });
  new Worker('search-sync', searchSyncWorker, {
    connection: redis,
    concurrency: 5,
  });
  new Worker('notifications', notificationWorker, {
    connection: redis,
    concurrency: 10,
  });
  new Worker('saved-search', savedSearchWorker, {
    connection: redis,
    concurrency: 5,
  });
  new Worker('quick-reply', quickReplyWorker, {
    connection: redis,
    concurrency: 5,
  });
  new Worker('media-cleanup', mediaCleanupWorker, {
    connection: redis,
    concurrency: 3,
  });

  console.log('BullMQ workers initialized');
}
