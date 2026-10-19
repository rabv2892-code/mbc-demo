import { z } from "zod";
import { db } from "@/lib/db";
import { nowServer } from "@/lib/timezone";
import { writeAudit } from "@/server/audit";
import { assertEnoughStock, averageSachetCost, waterSaleTotals } from "@/lib/calc/water";
import { getWaterStock } from "@/server/water/stock";
import { gnfAmountSchema, positiveIntQtySchema } from "@/lib/validation";

export const waterPurchaseSchema = z.object({
  bidonCount: positiveIntQtySchema.optional(),
  packCount: positiveIntQtySchema.optional(),
  sachetsPerPack: positiveIntQtySchema.optional(),
  totalPrice: gnfAmountSchema,
  supplier: z.string().trim().optional(),
});

export const waterSaleSchema = z.object({
  quantity: positiveIntQtySchema,
});

export const waterSettingsSchema = z.object({
  bidonSalePrice: gnfAmountSchema.optional(),
  sachetSalePrice: gnfAmountSchema.optional(),
  sachetsPerPack: positiveIntQtySchema.optional(),
});

export async function getWaterSettings() {
  const settings = await db.waterSettings.findFirst();
  if (!settings) throw new Error("Paramètres eau manquants");
  return settings;
}

export async function updateWaterSettings(actorId: string, input: z.infer<typeof waterSettingsSchema>) {
  const data = waterSettingsSchema.parse(input);
  const current = await getWaterSettings();
  const updated = await db.waterSettings.update({
    where: { id: current.id },
    data: {
      bidonSalePrice: data.bidonSalePrice ?? data.sachetSalePrice ?? current.bidonSalePrice,
      sachetSalePrice: data.bidonSalePrice ?? data.sachetSalePrice ?? current.sachetSalePrice,
      sachetsPerPack: data.sachetsPerPack ?? current.sachetsPerPack,
    },
  });
  await writeAudit(db, {
    userId: actorId,
    action: "UPDATE_WATER_SETTINGS",
    module: "water",
    oldValue: { bidonSalePrice: current.bidonSalePrice.toString() },
    newValue: { bidonSalePrice: updated.bidonSalePrice.toString() },
  });
  return updated;
}

export async function createWaterPurchase(actorId: string, input: z.infer<typeof waterPurchaseSchema>) {
  const data = waterPurchaseSchema.parse(input);
  const quantity = data.bidonCount ?? data.packCount;
  if (!quantity) throw new Error("Indiquez le nombre de bidons");
  const avg = averageSachetCost(data.totalPrice, quantity);
  const occurredAt = nowServer();
  return db.$transaction(async (tx) => {
    const purchase = await tx.waterPurchase.create({
      data: {
        packCount: quantity,
        sachetsPerPack: 1,
        bidonCount: quantity,
        quantity,
        totalPrice: data.totalPrice,
        avgUnitCost: avg,
        supplier: data.supplier,
        occurredAt,
        employeeId: actorId,
      },
      include: { employee: { select: { id: true, fullName: true } } },
    });
    await tx.waterStockMovement.create({
      data: {
        type: "PURCHASE",
        quantity,
        refId: purchase.id,
        occurredAt,
      },
    });
    await writeAudit(tx, {
      userId: actorId,
      action: "CREATE_WATER_PURCHASE",
      module: "water",
      newValue: {
        bidonCount: quantity,
        quantity,
        totalPrice: data.totalPrice,
        avgUnitCost: avg.toString(),
      },
    });
    return purchase;
  });
}

export async function createWaterSale(actorId: string, input: z.infer<typeof waterSaleSchema>) {
  const data = waterSaleSchema.parse(input);
  const occurredAt = nowServer();
  return db.$transaction(async (tx) => {
    const settings = await tx.waterSettings.findFirst();
    if (!settings) throw new Error("Paramètres eau manquants");
    const movements = await tx.waterStockMovement.findMany();
    const purchased = movements.filter((m) => m.type === "PURCHASE").reduce((s, m) => s + m.quantity, 0);
    const out = movements.filter((m) => m.type !== "PURCHASE").reduce((s, m) => s + m.quantity, 0);
    assertEnoughStock(purchased - out, data.quantity);
    const unitPrice = Number(settings.bidonSalePrice) > 0 ? settings.bidonSalePrice : settings.sachetSalePrice;
    const totals = waterSaleTotals(data.quantity, unitPrice);
    const sale = await tx.waterSale.create({
      data: {
        quantity: data.quantity,
        unitPrice: totals.unitPrice,
        totalAmount: totals.totalAmount,
        occurredAt,
        employeeId: actorId,
      },
      include: { employee: { select: { id: true, fullName: true } } },
    });
    await tx.waterStockMovement.create({
      data: {
        type: "SEPARATE_SALE",
        quantity: data.quantity,
        refId: sale.id,
        occurredAt,
      },
    });
    await writeAudit(tx, {
      userId: actorId,
      action: "CREATE_WATER_SALE",
      module: "water",
      newValue: {
        quantity: data.quantity,
        unitPrice: totals.unitPrice.toString(),
        totalAmount: totals.totalAmount.toString(),
      },
    });
    return sale;
  });
}

export async function listWaterPurchases(filters: { q?: string; from?: Date; to?: Date; employeeId?: string }) {
  return db.waterPurchase.findMany({
    where: {
      employeeId: filters.employeeId,
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

export async function listWaterSales(filters: { q?: string; from?: Date; to?: Date; employeeId?: string }) {
  return db.waterSale.findMany({
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

export async function previewWaterSale(quantity: number) {
  const [settings, stock] = await Promise.all([getWaterSettings(), getWaterStock()]);
  const unitPrice = Number(settings.bidonSalePrice) > 0 ? settings.bidonSalePrice : settings.sachetSalePrice;
  const totals = waterSaleTotals(quantity, unitPrice);
  return {
    quantity,
    unitPrice: totals.unitPrice.toString(),
    totalAmount: totals.totalAmount.toString(),
    stockCurrent: stock.current,
  };
}
