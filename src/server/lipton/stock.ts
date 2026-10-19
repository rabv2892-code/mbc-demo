import { db } from "@/lib/db";
import { liptonStock } from "@/lib/calc/lipton";

export async function getLiptonStock() {
  const movements = await db.liptonStockMovement.groupBy({
    by: ["type"],
    _sum: { quantity: true },
  });
  const byType = Object.fromEntries(movements.map((m) => [m.type, m._sum.quantity ?? 0]));
  return liptonStock({
    purchased: byType.PURCHASE ?? 0,
    sold: byType.SALE ?? 0,
  });
}
