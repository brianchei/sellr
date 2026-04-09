import type { NotificationType, Prisma } from '@prisma/client';
import type { PushNotificationJob } from './jobTypes';
import { prisma } from './prisma';
import { notificationQueue } from './queues';

export async function notifyUser(
  userId: string,
  type: NotificationType,
  payload: Prisma.InputJsonValue,
) {
  const n = await prisma.notification.create({
    data: {
      userId,
      type,
      payload,
    },
  });

  try {
    const job: PushNotificationJob = {
      userId,
      notificationId: n.id,
    };
    await notificationQueue.add('push', job);
  } catch (e) {
    console.error('Failed to enqueue push notification job', e);
  }

  return n;
}
