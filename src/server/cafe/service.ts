import { z } from "zod";
import { db } from "@/lib/db";
import { nowServer } from "@/lib/timezone";
import { writeAudit } from "@/server/audit";
import {
  assertEnoughCoffeeStock,
  coffeeConsumedKg,
  coffeeSaleTotals,
  costPerCup,
  purchaseTotalFromKg,
  theoreticalCups,
  weightedAveragePricePerKg,
} from "@/lib/calc/coffee";
import { getCoffeeStock } from "@/server/cafe/stock";
import { consumeForCoffeeSale, getAllSupplyStock } from "@/server/supplies/service";
import { gnfAmountSchema, positiveIntQtySchema, positiveQtySchema } from "@/lib/validation";

export const coffeePurchaseSchema = z.object({
  qtyKg: positiveQtySchema,
  reference: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const coffeeSaleSchema = z.object({
  quantity: positiveIntQtySchema,
});

export const coffeeSettingsSchema = z.object({
  cupsPerKg: positiveQtySchema,
  purchasePricePerKg: gnfAmountSchema,
  cupSalePrice: gnfAmountSchema,
  offerWaterWithCoffee: z.boolean().optional(),
});

export async function getCoffeeSettings() {
  const settings = await db.coffeeSettings.findFirst();
  if (!settings) {
    throw new Error("Paramètres café manquants");
  }
  return settings;
}

export async function updateCoffeeSettings(actorId: string, input: z.infer<typeof coffeeSettingsSchema>) {
  const data = coffeeSettingsSchema.parse(input);
  const current = await getCoffeeSettings();
  const updated = await db.coffeeSettings.update({
    where: { id: current.id },
    data: {
      cupsPerKg: data.cupsPerKg,
      purchasePricePerKg: data.purchasePricePerKg,
      cupSalePrice: data.cupSalePrice,
      offerWaterWithCoffee: false,
    },
  });
  await writeAudit(db, {
    userId: actorId,
    action: "UPDATE_COFFEE_SETTINGS",
    module: "cafe",
    oldValue: {
      cupsPerKg: current.cupsPerKg.toString(),
      purchasePricePerKg: current.purchasePricePerKg.toString(),
      cupSalePrice: current.cupSalePrice.toString(),
    },
    newValue: {
      cupsPerKg: updated.cupsPerKg.toString(),
      purchasePricePerKg: updated.purchasePricePerKg.toString(),
      cupSalePrice: updated.cupSalePrice.toString(),
    },
  });
  return updated;
}

export async function createCoffeePurchase(actorId: string, input: z.infer<typeof coffeePurchaseSchema>) {
  const data = coffeePurchaseSchema.parse(input);
  const occurredAt = nowServer();
  const purchase = await db.$transaction(async (tx) => {
    const settings = await tx.coffeeSettings.findFirst();
    if (!settings) throw new Error("Paramètres café manquants");
    const perKg = settings.purchasePricePerKg;
    const total = purchaseTotalFromKg(data.qtyKg, perKg);
    const created = await tx.coffeePurchase.create({
      data: {
        qtyKg: data.qtyKg,
        totalPrice: total,
        pricePerKg: perKg,
        reference: data.reference,
        notes: data.notes,
        occurredAt,
        employeeId: actorId,
      },
      include: { employee: { select: { fullName: true } } },
    });
    await writeAudit(tx, {
      userId: actorId,
      action: "CREATE_COFFEE_PURCHASE",
      module: "cafe",
      newValue: {
        qtyKg: data.qtyKg,
        totalPrice: total.toString(),
        pricePerKg: perKg.toString(),
        cupsPerKg: settings.cupsPerKg.toString(),
        theoreticalCups: theoreticalCups(data.qtyKg, settings.cupsPerKg).toString(),
      },
    });
    return created;
  });
  return purchase;
}

export async function listCoffeePurchases(filters: {
  q?: string;
  from?: Date;
  to?: Date;
  employeeId?: string;
}) {
  return db.coffeePurchase.findMany({
    where: {
      employeeId: filters.employeeId,
      occurredAt: {
        gte: filters.from,
        lte: filters.to,
      },
      OR: filters.q
        ? [
            { reference: { contains: filters.q, mode: "insensitive" } },
            { notes: { contains: filters.q, mode: "insensitive" } },
            { employee: { fullName: { contains: filters.q, mode: "insensitive" } } },
          ]
        : undefined,
    },
    include: { employee: { select: { id: true, fullName: true } } },
    orderBy: { occurredAt: "desc" },
  });
}

export async function coffeeCostContext() {
  const [settings, purchases] = await Promise.all([
    getCoffeeSettings(),
    db.coffeePurchase.findMany({ select: { totalPrice: true, qtyKg: true } }),
  ]);
  const avgKg = purchases.length ? weightedAveragePricePerKg(purchases) : settings.purchasePricePerKg;
  return {
    settings,
    avgPricePerKg: avgKg,
    costPerCup: costPerCup(avgKg, settings.cupsPerKg),
  };
}

export async function createCoffeeSale(actorId: string, input: z.infer<typeof coffeeSaleSchema>) {
  const data = coffeeSaleSchema.parse(input);
  const occurredAt = nowServer();

  return db.$transaction(async (tx) => {
    const settings = await tx.coffeeSettings.findFirst();
    if (!settings) throw new Error("Paramètres café manquants");

    const purchases = await tx.coffeePurchase.findMany({ select: { totalPrice: true, qtyKg: true } });
    const avgKg = purchases.length ? weightedAveragePricePerKg(purchases) : settings.purchasePricePerKg;
    const cupCost = costPerCup(avgKg, settings.cupsPerKg);
    const totals = coffeeSaleTotals({
      quantity: data.quantity,
      unitPrice: settings.cupSalePrice,
      costPerCup: cupCost,
    });

    const purchasesForStock = await tx.coffeePurchase.aggregate({ _sum: { qtyKg: true } });
    const salesForStock = await tx.coffeeSale.aggregate({ _sum: { quantity: true } });
    const remainingKg = Number(purchasesForStock._sum.qtyKg ?? 0) - Number(coffeeConsumedKg(salesForStock._sum.quantity ?? 0, settings.cupsPerKg));
    const neededKg = coffeeConsumedKg(data.quantity, settings.cupsPerKg);
    assertEnoughCoffeeStock(remainingKg, neededKg);

    const sale = await tx.coffeeSale.create({
      data: {
        quantity: data.quantity,
        unitPrice: totals.unitPrice,
        totalAmount: totals.totalAmount,
        costAmount: totals.costAmount,
        profitAmount: totals.profitAmount,
        occurredAt,
        employeeId: actorId,
      },
      include: { employee: { select: { id: true, fullName: true } } },
    });

    const supplies = await consumeForCoffeeSale(tx, data.quantity, sale.id, occurredAt);

    await writeAudit(tx, {
      userId: actorId,
      action: "CREATE_COFFEE_SALE",
      module: "cafe",
      newValue: {
        quantity: data.quantity,
        unitPrice: totals.unitPrice.toString(),
        totalAmount: totals.totalAmount.toString(),
        profitAmount: totals.profitAmount.toString(),
        cupsUsed: supplies.cups,
        spoonsUsed: supplies.spoons,
      },
    });

    return { ...sale, waterOffered: 0, supplies };
  });
}

export async function listCoffeeSales(filters: {
  q?: string;
  from?: Date;
  to?: Date;
  employeeId?: string;
}) {
  return db.coffeeSale.findMany({
    where: {
      employeeId: filters.employeeId,
      occurredAt: { gte: filters.from, lte: filters.to },
      OR: filters.q
        ? [{ employee: { fullName: { contains: filters.q, mode: "insensitive" } } }]
        : undefined,
    },
    include: { employee: { select: { id: true, fullName: true } } },
    orderBy: { occurredAt: "desc" },
  });
}

export async function previewCoffeeSale(quantity: number) {
  const ctx = await coffeeCostContext();
  const totals = coffeeSaleTotals({
    quantity,
    unitPrice: ctx.settings.cupSalePrice,
    costPerCup: ctx.costPerCup,
  });
  const [coffeeStock, supplies] = await Promise.all([getCoffeeStock(), getAllSupplyStock()]);
  return {
    quantity,
    unitPrice: totals.unitPrice.toString(),
    totalAmount: totals.totalAmount.toString(),
    costAmount: totals.costAmount.toString(),
    profitAmount: totals.profitAmount.toString(),
    waterOffered: 0,
    stockCurrent: coffeeStock.current,
    coffeeStockKg: coffeeStock.remainingKg.toString(),
    cupsStock: supplies.cups.current,
    spoonsStock: supplies.spoons.current,
    offerEnabled: false,
    cupsPerKg: ctx.settings.cupsPerKg.toString(),
  };
}
