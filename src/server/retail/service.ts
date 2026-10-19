import { z } from "zod";
import { RetailKind, RetailUnit } from "@prisma/client";
import { db } from "@/lib/db";
import { nowServer } from "@/lib/timezone";
import { writeAudit } from "@/server/audit";
import {
  assertEnoughPieces,
  averagePieceCost,
  piecesFromPacks,
  retailSaleTotals,
  salePieceQuantity,
} from "@/lib/calc/retail";
import { gnfAmountOrZeroSchema, gnfAmountSchema, positiveIntQtySchema } from "@/lib/validation";

export const retailProductSchema = z.object({
  name: z.string().trim().min(1),
  piecesPerPack: positiveIntQtySchema,
  packPurchasePrice: gnfAmountOrZeroSchema,
  packSalePrice: gnfAmountSchema,
  pieceSalePrice: gnfAmountSchema,
  isActive: z.boolean().optional(),
});

export const retailPurchaseSchema = z.object({
  productId: z.string().min(1),
  packCount: positiveIntQtySchema,
  totalPrice: gnfAmountSchema,
  supplier: z.string().trim().optional(),
});

export const retailSaleSchema = z.object({
  productId: z.string().min(1),
  unit: z.nativeEnum(RetailUnit),
  quantity: positiveIntQtySchema,
});

export async function listRetailProducts(kind: RetailKind) {
  return db.retailProduct.findMany({ where: { kind }, orderBy: { name: "asc" } });
}

export async function createRetailProduct(actorId: string, kind: RetailKind, input: z.infer<typeof retailProductSchema>) {
  const data = retailProductSchema.parse(input);
  const duplicate = await db.retailProduct.findUnique({
    where: { kind_name: { kind, name: data.name } },
  });
  if (duplicate) {
    throw new Error(`Le type « ${data.name} » existe déjà. Modifiez-le dans la liste ou choisissez un autre nom.`);
  }
  const product = await db.retailProduct.create({
    data: {
      kind,
      name: data.name,
      piecesPerPack: data.piecesPerPack,
      packPurchasePrice: data.packPurchasePrice,
      packSalePrice: data.packSalePrice,
      pieceSalePrice: data.pieceSalePrice,
      isActive: data.isActive ?? true,
    },
  });
  await writeAudit(db, {
    userId: actorId,
    action: "CREATE_RETAIL_PRODUCT",
    module: kind.toLowerCase(),
    newValue: { name: data.name, piecesPerPack: data.piecesPerPack, packSalePrice: data.packSalePrice, pieceSalePrice: data.pieceSalePrice },
  });
  return product;
}

export async function updateRetailProduct(
  actorId: string,
  id: string,
  kind: RetailKind,
  input: z.infer<typeof retailProductSchema>,
) {
  const data = retailProductSchema.parse(input);
  const existing = await db.retailProduct.findFirstOrThrow({ where: { id, kind } });
  const clash = await db.retailProduct.findFirst({
    where: { kind, name: data.name, NOT: { id } },
  });
  if (clash) {
    throw new Error(`Le type « ${data.name} » existe déjà.`);
  }
  const product = await db.retailProduct.update({
    where: { id },
    data: {
      name: data.name,
      piecesPerPack: data.piecesPerPack,
      packPurchasePrice: data.packPurchasePrice,
      packSalePrice: data.packSalePrice,
      pieceSalePrice: data.pieceSalePrice,
      isActive: data.isActive ?? existing.isActive,
    },
  });
  await writeAudit(db, {
    userId: actorId,
    action: "UPDATE_RETAIL_PRODUCT",
    module: kind.toLowerCase(),
    oldValue: { name: existing.name, packSalePrice: existing.packSalePrice.toString(), pieceSalePrice: existing.pieceSalePrice.toString() },
    newValue: { name: product.name, packSalePrice: product.packSalePrice.toString(), pieceSalePrice: product.pieceSalePrice.toString() },
  });
  return product;
}

export async function getRetailStock(productId: string) {
  const movements = await db.retailStockMovement.groupBy({
    by: ["type"],
    where: { productId },
    _sum: { quantity: true },
  });
  const byType = Object.fromEntries(movements.map((m) => [m.type, m._sum.quantity ?? 0]));
  const purchased = byType.PURCHASE ?? 0;
  const sold = byType.SALE ?? 0;
  return { purchased, sold, current: purchased - sold };
}

export async function createRetailPurchase(actorId: string, kind: RetailKind, input: z.infer<typeof retailPurchaseSchema>) {
  const data = retailPurchaseSchema.parse(input);
  const product = await db.retailProduct.findFirstOrThrow({ where: { id: data.productId, kind } });
  const quantity = piecesFromPacks(data.packCount, product.piecesPerPack);
  const avg = averagePieceCost(data.totalPrice, quantity);
  const occurredAt = nowServer();
  return db.$transaction(async (tx) => {
    const purchase = await tx.retailPurchase.create({
      data: {
        productId: product.id,
        packCount: data.packCount,
        piecesPerPack: product.piecesPerPack,
        quantity,
        totalPrice: data.totalPrice,
        avgUnitCost: avg,
        supplier: data.supplier,
        occurredAt,
        employeeId: actorId,
      },
      include: {
        product: true,
        employee: { select: { id: true, fullName: true } },
      },
    });
    await tx.retailStockMovement.create({
      data: { productId: product.id, type: "PURCHASE", quantity, refId: purchase.id, occurredAt },
    });
    await writeAudit(tx, {
      userId: actorId,
      action: "CREATE_RETAIL_PURCHASE",
      module: kind.toLowerCase(),
      newValue: { product: product.name, packCount: data.packCount, quantity, totalPrice: data.totalPrice },
    });
    return purchase;
  });
}

export async function createRetailSale(actorId: string, kind: RetailKind, input: z.infer<typeof retailSaleSchema>) {
  const data = retailSaleSchema.parse(input);
  const occurredAt = nowServer();
  return db.$transaction(async (tx) => {
    const product = await tx.retailProduct.findFirst({ where: { id: data.productId, kind, isActive: true } });
    if (!product) throw new Error("Type introuvable ou inactif");
    const pieceQuantity = salePieceQuantity(data.unit, data.quantity, product.piecesPerPack);
    const movements = await tx.retailStockMovement.findMany({ where: { productId: product.id } });
    const purchased = movements.filter((m) => m.type === "PURCHASE").reduce((s, m) => s + m.quantity, 0);
    const sold = movements.filter((m) => m.type === "SALE").reduce((s, m) => s + m.quantity, 0);
    assertEnoughPieces(purchased - sold, pieceQuantity, kind === "CIGARETTE" ? "cigarette" : "jus");
    const totals = retailSaleTotals(data.unit, data.quantity, product.packSalePrice, product.pieceSalePrice);
    const sale = await tx.retailSale.create({
      data: {
        productId: product.id,
        unit: data.unit,
        quantity: data.quantity,
        pieceQuantity,
        unitPrice: totals.unitPrice,
        totalAmount: totals.totalAmount,
        occurredAt,
        employeeId: actorId,
      },
      include: {
        product: true,
        employee: { select: { id: true, fullName: true } },
      },
    });
    await tx.retailStockMovement.create({
      data: { productId: product.id, type: "SALE", quantity: pieceQuantity, refId: sale.id, occurredAt },
    });
    await writeAudit(tx, {
      userId: actorId,
      action: "CREATE_RETAIL_SALE",
      module: kind.toLowerCase(),
      newValue: {
        product: product.name,
        unit: data.unit,
        quantity: data.quantity,
        totalAmount: totals.totalAmount.toString(),
      },
    });
    return sale;
  });
}

export async function listRetailPurchases(kind: RetailKind, filters: { q?: string; from?: Date; to?: Date }) {
  return db.retailPurchase.findMany({
    where: {
      product: { kind },
      occurredAt: { gte: filters.from, lte: filters.to },
      OR: filters.q
        ? [
            { product: { name: { contains: filters.q, mode: "insensitive" } } },
            { employee: { fullName: { contains: filters.q, mode: "insensitive" } } },
          ]
        : undefined,
    },
    include: { product: true, employee: { select: { id: true, fullName: true } } },
    orderBy: { occurredAt: "desc" },
  });
}

export async function listRetailSales(kind: RetailKind, filters: { q?: string; from?: Date; to?: Date }) {
  return db.retailSale.findMany({
    where: {
      product: { kind },
      occurredAt: { gte: filters.from, lte: filters.to },
      OR: filters.q
        ? [
            { product: { name: { contains: filters.q, mode: "insensitive" } } },
            { employee: { fullName: { contains: filters.q, mode: "insensitive" } } },
          ]
        : undefined,
    },
    include: { product: true, employee: { select: { id: true, fullName: true } } },
    orderBy: { occurredAt: "desc" },
  });
}

export async function previewRetailSale(kind: RetailKind, productId: string, unit: RetailUnit, quantity: number) {
  const product = await db.retailProduct.findFirstOrThrow({ where: { id: productId, kind } });
  const qty = Number.isInteger(quantity) && quantity > 0 ? quantity : 0;
  const stock = await getRetailStock(product.id);
  if (qty <= 0) {
    return {
      unitPrice: (unit === "PACK" ? product.packSalePrice : product.pieceSalePrice).toString(),
      totalAmount: "0",
      pieceQuantity: 0,
      stockCurrent: stock.current,
    };
  }
  const totals = retailSaleTotals(unit, qty, product.packSalePrice, product.pieceSalePrice);
  return {
    unitPrice: totals.unitPrice.toString(),
    totalAmount: totals.totalAmount.toString(),
    pieceQuantity: salePieceQuantity(unit, qty, product.piecesPerPack),
    stockCurrent: stock.current,
  };
}
