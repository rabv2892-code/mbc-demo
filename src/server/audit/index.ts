import type { Prisma, PrismaClient } from "@prisma/client";
import { nowServer } from "@/lib/timezone";

type Db = PrismaClient | Prisma.TransactionClient;

export async function writeAudit(
  db: Db,
  input: {
    userId: string;
    action: string;
    module: string;
    oldValue?: Prisma.InputJsonValue | null;
    newValue?: Prisma.InputJsonValue | null;
  },
) {
  await db.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      module: input.module,
      oldValue: input.oldValue ?? undefined,
      newValue: input.newValue ?? undefined,
      occurredAt: nowServer(),
    },
  });
}
