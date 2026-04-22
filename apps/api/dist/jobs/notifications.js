"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationWorker = notificationWorker;
const expoPush_1 = require("../lib/expoPush");
const prisma_1 = require("../lib/prisma");
async function notificationWorker(job) {
    if (job.name !== 'push') {
        await job.log(`skip: unknown job name ${job.name}`);
        return;
    }
    const { userId, notificationId } = job.data;
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { expoPushToken: true },
    });
    if (!user?.expoPushToken) {
        return;
    }
    const notification = await prisma_1.prisma.notification.findFirst({
        where: { id: notificationId, userId },
    });
    if (!notification) {
        return;
    }
    const { title, body } = (0, expoPush_1.notificationPushCopy)(notification.type, notification.payload);
    const result = await (0, expoPush_1.sendExpoPush)({
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
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { expoPushToken: null },
        });
        return;
    }
    throw new Error(result.message);
}
