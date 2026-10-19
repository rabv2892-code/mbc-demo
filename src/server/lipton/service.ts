import { z } from "zod";
import { db } from "@/lib/db";
import { nowServer } from "@/lib/timezone";
import { writeAudit } from "@/server/audit";
import {
  assertEnoughLiptonStock,
  averagePieceCost,
  estimatedSugarPieces,
  liptonSaleTotals,
  totalPiecesFromPacks,
} from "@/lib/calc/lipton";
import { getLiptonStock } from "@/server/lipton/stock";
import { PAPER_KEYS, PAPER_LIPTON, PAPER_SUCRE } from "@/server/catalog/paper-data";
import { gnfAmountSchema, positiveIntQtySchema } from "@/lib/validation";

export const liptonPurchaseSchema = z.object({
  packCount: positiveIntQtySchema,
  piecesPerPack: positiveIntQtySchema.default(100),
  totalPrice: gnfAmountSchema,
  supplier: z.string().trim().optional(),
});

export const liptonSaleSchema = z.object({
  quantity: positiveIntQtySchema,
});

export const liptonSettingsSchema = z.object({
  pieceSalePrice: gnfAmountSchema,
  piecesPerPack: positiveIntQtySchema.optional(),
});

type CatalogPayload = {
  pieceSalePrice?: number;
  piecesPerPack?: number;
  piecesPerLiptonCup?: number;
};

export async function getLiptonSettings() {
  const existing = await db.liptonSettings.findFirst();
  if (existing) return existing;

  const cat = await db.catalogItem.findUnique({
    where: { businessKey: PAPER_KEYS.LIPTON_PAQUET_100 },
  });
  const payload = (cat?.payload ?? {}) as CatalogPayload;
  return db.liptonSettings.create({
    data: {
      pieceSalePrice: payload.pieceSalePrice ?? PAPER_LIPTON.pieceSalePrice,
      piecesPerPack: payload.piecesPerPack ?? PAPER_LIPTON.piecesPerPack,
    },
  });
}

export async function updateLiptonSettings(actorId: string, input: z.infer<typeof liptonSettingsSchema>) {
  const data = liptonSettingsSchema.parse(input);
  const current = await getLiptonSettings();
  const updated = await db.liptonSettings.update({
    where: { id: current.id },
    data: {
      pieceSalePrice: data.pieceSalePrice,
      piecesPerPack: data.piecesPerPack ?? current.piecesPerPack,
    },
  });
  await writeAudit(db, {
    userId: actorId,
    action: "UPDATE_LIPTON_SETTINGS",
    module: "lipton",
    oldValue: { pieceSalePrice: current.pieceSalePrice.toString() },
    newValue: { pieceSalePrice: updated.pieceSalePrice.toString() },
  });
  return updated;
}

async function sugarPiecesPerLipton(): Promise<number> {
  const cat = await db.catalogItem.findUnique({
    where: { businessKey: PAPER_KEYS.SUCRE_PAQUET_250 },
  });
  const payload = (cat?.payload ?? {}) as CatalogPayload;
  return payload.piecesPerLiptonCup ?? PAPER_SUCRE.piecesPerLiptonCup;
}

export async function createLiptonPurchase(actorId: string, input: z.infer<typeof liptonPurchaseSchema>) {
  const data = liptonPurchaseSchema.parse(input);
  const quantity = totalPiecesFromPacks(data.packCount, data.piecesPerPack);
  const avg = averagePieceCost(data.totalPrice, quantity);
  const occurredAt = nowServer();
  return db.$transaction(async (tx) => {
    const purchase = await tx.liptonPurchase.create({
      data: {
        packCount: data.packCount,
        piecesPerPack: data.piecesPerPack,
        quantity,
        totalPrice: data.totalPrice,
        avgUnitCost: avg,
        supplier: data.supplier,
        occurredAt,
        employeeId: actorId,
      },
      include: { employee: { select: { id: true, fullName: true } } },
    });
    await tx.liptonStockMovement.create({
      data: {
        type: "PURCHASE",
        quantity,
        refId: purchase.id,
        occurredAt,
      },
    });
    await writeAudit(tx, {
      userId: actorId,
      action: "CREATE_LIPTON_PURCHASE",
      module: "lipton",
      newValue: {
        packCount: data.packCount,
        piecesPerPack: data.piecesPerPack,
        quantity,
        totalPrice: data.totalPrice,
        avgUnitCost: avg.toString(),
      },
    });
    return purchase;
  });
}

export async function createLiptonSale(actorId: string, input: z.infer<typeof liptonSaleSchema>) {
  const data = liptonSaleSchema.parse(input);
  await getLiptonSettings();
  const occurredAt = nowServer();
  return db.$transaction(async (tx) => {
    const settings = await tx.liptonSettings.findFirst();
    if (!settings) throw new Error("Paramètres Lipton manquants");
    const movements = await tx.liptonStockMovement.findMany();
    const purchased = movements.filter((m) => m.type === "PURCHASE").reduce((s, m) => s + m.quantity, 0);
    const sold = movements.filter((m) => m.type === "SALE").reduce((s, m) => s + m.quantity, 0);
    assertEnoughLiptonStock(purchased - sold, data.quantity);
    const totals = liptonSaleTotals(data.quantity, settings.pieceSalePrice);
    const sale = await tx.liptonSale.create({
      data: {
        quantity: data.quantity,
        unitPrice: totals.unitPrice,
        totalAmount: totals.totalAmount,
        occurredAt,
        employeeId: actorId,
      },
      include: { employee: { select: { id: true, fullName: true } } },
    });
    await tx.liptonStockMovement.create({
      data: {
        type: "SALE",
        quantity: data.quantity,
        refId: sale.id,
        occurredAt,
      },
    });
    await writeAudit(tx, {
      userId: actorId,
      action: "CREATE_LIPTON_SALE",
      module: "lipton",
      newValue: {
        quantity: data.quantity,
        unitPrice: totals.unitPrice.toString(),
        totalAmount: totals.totalAmount.toString(),
      },
    });
    return sale;
  });
}

export async function listLiptonPurchases(filters: { q?: string; from?: Date; to?: Date; employeeId?: string }) {
  return db.liptonPurchase.findMany({
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

export async function listLiptonSales(filters: { q?: string; from?: Date; to?: Date; employeeId?: string }) {
  return db.liptonSale.findMany({
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

export async function previewLiptonSale(quantity: number) {
  const [settings, stock, sugarPer] = await Promise.all([
    getLiptonSettings(),
    getLiptonStock(),
    sugarPiecesPerLipton(),
  ]);
  const qty = Number.isInteger(quantity) && quantity > 0 ? quantity : 0;
  const totals = qty > 0 ? liptonSaleTotals(qty, settings.pieceSalePrice) : { unitPrice: settings.pieceSalePrice, totalAmount: settings.pieceSalePrice.mul(0) };
  return {
    quantity: qty,
    unitPrice: totals.unitPrice.toString(),
    totalAmount: totals.totalAmount.toString(),
    stockCurrent: stock.current,
    sugarEstimated: qty > 0 ? estimatedSugarPieces(qty, sugarPer) : 0,
  };
}
