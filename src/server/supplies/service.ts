import { z } from "zod";
import { SupplyKind, type Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { nowServer } from "@/lib/timezone";
import { writeAudit } from "@/server/audit";
import { consumeSupplies, supplyStock } from "@/lib/calc/supply";
import { gnfAmountSchema, positiveIntQtySchema } from "@/lib/validation";

export const supplyPurchaseSchema = z.object({
  kind: z.nativeEnum(SupplyKind),
  quantity: positiveIntQtySchema,
  totalPrice: gnfAmountSchema,
  supplier: z.string().trim().optional(),
});

export async function getSupplyStock(kind: SupplyKind) {
  const movements = await db.supplyStockMovement.groupBy({
    by: ["type"],
    where: { kind },
    _sum: { quantity: true },
  });
  const byType = Object.fromEntries(movements.map((m) => [m.type, m._sum.quantity ?? 0]));
  return supplyStock(byType.PURCHASE ?? 0, byType.CONSUMED ?? 0);
}

export async function getAllSupplyStock() {
  const [cups, spoons] = await Promise.all([getSupplyStock("CUP"), getSupplyStock("SPOON")]);
  return { cups, spoons };
}

export async function createSupplyPurchase(actorId: string, input: z.infer<typeof supplyPurchaseSchema>) {
  const data = supplyPurchaseSchema.parse(input);
  const occurredAt = nowServer();
  return db.$transaction(async (tx) => {
    const purchase = await tx.supplyPurchase.create({
      data: {
        kind: data.kind,
        quantity: data.quantity,
        totalPrice: data.totalPrice,
        supplier: data.supplier,
        occurredAt,
        employeeId: actorId,
      },
      include: { employee: { select: { id: true, fullName: true } } },
    });
    await tx.supplyStockMovement.create({
      data: { kind: data.kind, type: "PURCHASE", quantity: data.quantity, refId: purchase.id, occurredAt },
    });
    await writeAudit(tx, {
      userId: actorId,
      action: "CREATE_SUPPLY_PURCHASE",
      module: "supplies",
      newValue: { kind: data.kind, quantity: data.quantity, totalPrice: data.totalPrice },
    });
    return purchase;
  });
}

export async function listSupplyPurchases(filters: { q?: string; from?: Date; to?: Date }) {
  return db.supplyPurchase.findMany({
    where: {
      occurredAt: { gte: filters.from, lte: filters.to },
      OR: filters.q
        ? [
            { supplier: { contains: filters.q, mode: "insensitive" } },
            { employee: { fullName: { contains: filters.q, mode: "insensitive" } } },
          ]
        : undefined,
    },
    include: { employee: { select: { id: true, fullName: true } } },
    orderBy: { occurredAt: "desc" },
  });
}

export async function consumeForCoffeeSale(
  tx: Prisma.TransactionClient,
  cupsSold: number,
  saleId: string,
  occurredAt: Date,
) {
  const kinds: SupplyKind[] = ["CUP", "SPOON"];
  const consumed: Record<string, number> = {};
  for (const kind of kinds) {
    const movements = await tx.supplyStockMovement.findMany({ where: { kind } });
    const purchased = movements.filter((m) => m.type === "PURCHASE").reduce((s, m) => s + m.quantity, 0);
    const used = movements.filter((m) => m.type === "CONSUMED").reduce((s, m) => s + m.quantity, 0);
    const qty = consumeSupplies(purchased - used, cupsSold);
    consumed[kind] = qty;
    if (qty > 0) {
      await tx.supplyStockMovement.create({
        data: { kind, type: "CONSUMED", quantity: qty, refId: saleId, occurredAt },
      });
    }
  }
  return { cups: consumed.CUP ?? 0, spoons: consumed.SPOON ?? 0 };
}
