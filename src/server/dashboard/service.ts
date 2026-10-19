import { db } from "@/lib/db";
import { startOfDayTz, endOfDayTz, nowServer } from "@/lib/timezone";
import { getWaterStock } from "@/server/water/stock";
import { getLiptonStock } from "@/server/lipton/stock";
import { getCoffeeStock } from "@/server/cafe/stock";
import { amortizationSummary } from "@/server/transport/service";
import { coffeeCostContext } from "@/server/cafe/service";

export async function getDashboard(role: "SUPER_ADMIN" | "ADMIN_CAFE" | "MOTARD", userId: string) {
  const now = nowServer();
  const from = startOfDayTz(now);
  const to = endOfDayTz(now);

  if (role === "MOTARD") {
    const rider = await db.rider.findUnique({ where: { userId } });
    const deliveries = rider
      ? await db.delivery.findMany({
          where: { riderId: rider.id, occurredAt: { gte: from, lte: to } },
        })
      : [];
    const revenue = deliveries.reduce((s, d) => s + Number(d.amount), 0);
    return {
      role,
      rider: {
        todayCount: deliveries.length,
        todayRevenue: revenue.toString(),
      },
    };
  }

  const [coffeeSales, waterSales, waterPurchases, stock, coffeeCtx, liptonSales, liptonStock, coffeeStock, cigaretteSales, juiceSales] = await Promise.all([
    db.coffeeSale.findMany({ where: { occurredAt: { gte: from, lte: to } } }),
    db.waterSale.findMany({ where: { occurredAt: { gte: from, lte: to } } }),
    db.waterPurchase.findMany({ where: { occurredAt: { gte: from, lte: to } } }),
    getWaterStock(),
    coffeeCostContext(),
    db.liptonSale.findMany({ where: { occurredAt: { gte: from, lte: to } } }),
    getLiptonStock(),
    getCoffeeStock(),
    db.retailSale.findMany({ where: { occurredAt: { gte: from, lte: to }, product: { kind: "CIGARETTE" } } }),
    db.retailSale.findMany({ where: { occurredAt: { gte: from, lte: to }, product: { kind: "JUICE" } } }),
  ]);

  const coffeeCups = coffeeSales.reduce((s, x) => s + x.quantity, 0);
  const coffeeRevenue = coffeeSales.reduce((s, x) => s + Number(x.totalAmount), 0);
  const coffeeProfit = coffeeSales.reduce((s, x) => s + Number(x.profitAmount), 0);
  const coffeeKg = coffeeCtx.settings.cupsPerKg.gt(0)
    ? coffeeCups / Number(coffeeCtx.settings.cupsPerKg)
    : 0;
  const waterOfferedToday = coffeeSales.reduce((s, x) => s + (coffeeCtx.settings.offerWaterWithCoffee ? x.quantity : 0), 0);
  const waterRevenue = waterSales.reduce((s, x) => s + Number(x.totalAmount), 0);
  const waterBought = waterPurchases.reduce((s, x) => s + x.quantity, 0);
  const liptonPieces = liptonSales.reduce((s, x) => s + x.quantity, 0);
  const liptonRevenue = liptonSales.reduce((s, x) => s + Number(x.totalAmount), 0);
  const cigaretteRevenue = cigaretteSales.reduce((s, x) => s + Number(x.totalAmount), 0);
  const juiceRevenue = juiceSales.reduce((s, x) => s + Number(x.totalAmount), 0);

  const cafeWater = {
    cafe: {
      todaySales: coffeeSales.length,
      cups: coffeeCups,
      revenue: coffeeRevenue.toString(),
      profit: coffeeProfit.toString(),
      estimatedKg: coffeeKg.toFixed(4),
      stockKg: coffeeStock.remainingKg.toString(),
    },
    water: {
      stock: stock.current,
      purchased: stock.purchased,
      offered: stock.offered,
      sold: stock.sold,
      todayPurchased: waterBought,
      todayOffered: waterOfferedToday,
      todaySold: waterSales.reduce((s, x) => s + x.quantity, 0),
      revenue: waterRevenue.toString(),
    },
    lipton: {
      stock: liptonStock.current,
      purchased: liptonStock.purchased,
      sold: liptonStock.sold,
      todaySold: liptonPieces,
      revenue: liptonRevenue.toString(),
    },
    cigarettes: {
      todaySold: cigaretteSales.reduce((s, x) => s + x.pieceQuantity, 0),
      revenue: cigaretteRevenue.toString(),
    },
    juice: {
      todaySold: juiceSales.reduce((s, x) => s + x.pieceQuantity, 0),
      revenue: juiceRevenue.toString(),
    },
  };

  if (role === "ADMIN_CAFE") {
    return { role, ...cafeWater };
  }

  const [deliveries, amort] = await Promise.all([
    db.delivery.findMany({ where: { occurredAt: { gte: from, lte: to } } }),
    amortizationSummary(),
  ]);
  const transportRevenue = deliveries.reduce((s, d) => s + Number(d.amount), 0);
  const amortToday = await db.amortizationEntry.aggregate({
    where: { occurredAt: { gte: from, lte: to } },
    _sum: { amount: true },
  });

  return {
    role,
    ...cafeWater,
    transport: {
      todayCount: deliveries.length,
      revenue: transportRevenue.toString(),
      amortization: (amortToday._sum.amount ?? 0).toString(),
      motorcycleCount: amort.motorcycleCount,
      progress: amort.progress,
    },
    global: {
      cafe: coffeeRevenue.toString(),
      water: waterRevenue.toString(),
      lipton: liptonRevenue.toString(),
      cigarettes: cigaretteRevenue.toString(),
      juice: juiceRevenue.toString(),
      transport: transportRevenue.toString(),
      total: (coffeeRevenue + waterRevenue + liptonRevenue + cigaretteRevenue + juiceRevenue + transportRevenue).toString(),
    },
  };
}
