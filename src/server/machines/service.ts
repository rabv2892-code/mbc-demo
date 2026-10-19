import { z } from "zod";
import { db } from "@/lib/db";
import { nowServer } from "@/lib/timezone";
import { writeAudit } from "@/server/audit";
import { machineAmortization } from "@/lib/calc/assets";
import { gnfAmountSchema, positiveIntQtySchema } from "@/lib/validation";

export const machineSchema = z.object({
  name: z.string().trim().min(2),
  purchaseDate: z.string().min(4),
  purchasePrice: gnfAmountSchema,
  usefulLifeMonths: positiveIntQtySchema,
  notes: z.string().trim().optional(),
});

export async function createMachine(actorId: string, input: z.infer<typeof machineSchema>) {
  const data = machineSchema.parse(input);
  const occurredAt = nowServer();
  const machine = await db.machine.create({
    data: {
      name: data.name,
      purchaseDate: new Date(data.purchaseDate),
      purchasePrice: data.purchasePrice,
      usefulLifeMonths: data.usefulLifeMonths,
      notes: data.notes,
      occurredAt,
      employeeId: actorId,
    },
    include: { employee: { select: { id: true, fullName: true } } },
  });
  await writeAudit(db, {
    userId: actorId,
    action: "CREATE_MACHINE",
    module: "machines",
    newValue: { name: data.name, purchasePrice: data.purchasePrice, usefulLifeMonths: data.usefulLifeMonths },
  });
  return machine;
}

export async function listMachines() {
  const now = nowServer();
  const rows = await db.machine.findMany({
    include: { employee: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => {
    const amort = machineAmortization({
      purchasePrice: row.purchasePrice,
      usefulLifeMonths: row.usefulLifeMonths,
      purchaseDate: row.purchaseDate,
      now,
    });
    return {
      ...row,
      monthly: amort.monthly.toString(),
      elapsedMonths: amort.elapsedMonths,
      amortized: amort.amortized.toString(),
      remaining: amort.remaining.toString(),
      percent: amort.percent.toString(),
    };
  });
}
