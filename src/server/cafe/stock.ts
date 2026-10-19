import { db } from "@/lib/db";
import { coffeeStockKg } from "@/lib/calc/coffee";

export async function getCoffeeStock() {
  const [settings, purchases, salesAgg] = await Promise.all([
    db.coffeeSettings.findFirst(),
    db.coffeePurchase.aggregate({ _sum: { qtyKg: true } }),
    db.coffeeSale.aggregate({ _sum: { quantity: true } }),
  ]);
  const cupsPerKg = settings?.cupsPerKg ?? 55;
  const purchasedKg = Number(purchases._sum.qtyKg ?? 0);
  const cupsSold = salesAgg._sum.quantity ?? 0;
  return coffeeStockKg(purchasedKg, cupsSold, cupsPerKg);
}
