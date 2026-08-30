import { prisma } from "../config/prisma.js";

export async function audit(userId: string | null, action: string, entity: string, entityId?: string, metadata?: unknown) {
  await prisma.auditLog.create({
    data: {
      userId: userId ?? undefined,
      action,
      entity,
      entityId,
      metadata: metadata as object | undefined,
    },
  });
}
