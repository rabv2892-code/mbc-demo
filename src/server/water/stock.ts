import { db } from "@/lib/db";
import { waterStock } from "@/lib/calc/water";

export async function getWaterStock() {
  const movements = await db.waterStockMovement.groupBy({
    by: ["type"],
    _sum: { quantity: true },
  });
  const byType = Object.fromEntries(movements.map((m) => [m.type, m._sum.quantity ?? 0]));
  return waterStock({
    purchased: byType.PURCHASE ?? 0,
    offered: byType.OFFERED_WITH_COFFEE ?? 0,
    sold: byType.SEPARATE_SALE ?? 0,
  });
}
