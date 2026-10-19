import { z } from "zod";
import { db } from "@/lib/db";
import { getWaterStock } from "@/server/water/stock";
import { getLiptonStock } from "@/server/lipton/stock";

export const reportQuerySchema = z.object({
  from: z.string(),
  to: z.string(),
});

export async function buildReport(from: Date, to: Date) {
  const [coffeeSales, coffeePurchases, waterSales, waterPurchases, liptonSales, liptonPurchases, deliveries, amort, stock, liptonStock] =
    await Promise.all([
      db.coffeeSale.findMany({ where: { occurredAt: { gte: from, lte: to } } }),
      db.coffeePurchase.findMany({ where: { occurredAt: { gte: from, lte: to } } }),
      db.waterSale.findMany({ where: { occurredAt: { gte: from, lte: to } } }),
      db.waterPurchase.findMany({ where: { occurredAt: { gte: from, lte: to } } }),
      db.liptonSale.findMany({ where: { occurredAt: { gte: from, lte: to } } }),
      db.liptonPurchase.findMany({ where: { occurredAt: { gte: from, lte: to } } }),
      db.delivery.findMany({ where: { occurredAt: { gte: from, lte: to } }, include: { amortization: true } }),
      db.amortizationEntry.aggregate({ where: { occurredAt: { gte: from, lte: to } }, _sum: { amount: true } }),
      getWaterStock(),
      getLiptonStock(),
    ]);

  const coffeeRevenue = coffeeSales.reduce((s, x) => s + Number(x.totalAmount), 0);
  const coffeeCost = coffeeSales.reduce((s, x) => s + Number(x.costAmount), 0);
  const coffeeProfit = coffeeSales.reduce((s, x) => s + Number(x.profitAmount), 0);
  const coffeePurchaseCost = coffeePurchases.reduce((s, x) => s + Number(x.totalPrice), 0);
  const waterRevenue = waterSales.reduce((s, x) => s + Number(x.totalAmount), 0);
  const waterPurchaseCost = waterPurchases.reduce((s, x) => s + Number(x.totalPrice), 0);
  const liptonRevenue = liptonSales.reduce((s, x) => s + Number(x.totalAmount), 0);
  const liptonPurchaseCost = liptonPurchases.reduce((s, x) => s + Number(x.totalPrice), 0);
  const transportRevenue = deliveries.reduce((s, x) => s + Number(x.amount), 0);
  const amortization = Number(amort._sum.amount ?? 0);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    cafe: {
      salesCount: coffeeSales.length,
      cups: coffeeSales.reduce((s, x) => s + x.quantity, 0),
      revenue: coffeeRevenue,
      cost: coffeeCost,
      profit: coffeeProfit,
      purchases: coffeePurchases.length,
      purchaseCost: coffeePurchaseCost,
    },
    water: {
      sold: waterSales.reduce((s, x) => s + x.quantity, 0),
      revenue: waterRevenue,
      purchased: waterPurchases.reduce((s, x) => s + x.quantity, 0),
      purchaseCost: waterPurchaseCost,
      offered: coffeeSales.reduce((s, x) => s + x.quantity, 0),
      stock: stock.current,
    },
    lipton: {
      sold: liptonSales.reduce((s, x) => s + x.quantity, 0),
      revenue: liptonRevenue,
      purchased: liptonPurchases.reduce((s, x) => s + x.quantity, 0),
      purchaseCost: liptonPurchaseCost,
      stock: liptonStock.current,
    },
    transport: {
      deliveries: deliveries.length,
      revenue: transportRevenue,
      amortization,
    },
    totals: {
      revenue: coffeeRevenue + waterRevenue + liptonRevenue + transportRevenue,
      costs: coffeeCost + waterPurchaseCost + coffeePurchaseCost + liptonPurchaseCost,
      profit: coffeeProfit + waterRevenue - waterPurchaseCost + liptonRevenue - liptonPurchaseCost,
    },
  };
}
