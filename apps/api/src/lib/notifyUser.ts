import type { NotificationType, Prisma } from '@prisma/client';
import { prisma } from './prisma';

export async function notifyUser(
  userId: string,
  type: NotificationType,
  payload: Prisma.InputJsonValue,
) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      payload,
    },
  });
}
