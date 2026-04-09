import type { Job } from 'bullmq';
import type { PushNotificationJob } from '../lib/jobTypes';
import { notificationPushCopy, sendExpoPush } from '../lib/expoPush';
import { prisma } from '../lib/prisma';

export async function notificationWorker(job: Job): Promise<void> {
  if (job.name !== 'push') {
    await job.log(`skip: unknown job name ${job.name}`);
    return;
  }

  const { userId, notificationId } = job.data as PushNotificationJob;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { expoPushToken: true },
  });
  if (!user?.expoPushToken) {
    return;
  }

  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notification) {
    return;
  }

  const { title, body } = notificationPushCopy(
    notification.type,
    notification.payload,
  );

  const result = await sendExpoPush({
    to: user.expoPushToken,
    title,
    body,
    data: {
      notificationId: notification.id,
      type: notification.type,
    },
  });

  if (result.ok) {
    return;
  }

  if (result.deviceNotRegistered) {
    await prisma.user.update({
      where: { id: userId },
      data: { expoPushToken: null },
    });
    return;
  }

  throw new Error(result.message);
}
