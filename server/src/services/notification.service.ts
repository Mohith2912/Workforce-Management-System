import { prisma } from "../config/prisma.js";
import { redis } from "../config/redis.js";
import type { NotificationType } from "@prisma/client";

export async function notify(userId: string, type: NotificationType, title: string, body: string) {
  const n = await prisma.notification.create({ data: { userId, type, title, body } });
  try {
    await redis.del(`dashboard:${userId}`);
  } catch {
    /* ignore */
  }
  return n;
}

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markRead(userId: string, id: string) {
  return prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
}
