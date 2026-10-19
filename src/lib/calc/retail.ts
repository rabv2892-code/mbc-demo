import { Decimal } from "@prisma/client/runtime/library";
import { money, money4, toDecimal, type MoneyInput } from "@/lib/decimal";

export function piecesFromPacks(packCount: number, piecesPerPack: number): number {
  if (!Number.isInteger(packCount) || packCount <= 0) {
    throw new Error("Le nombre de paquets doit être un entier supérieur à 0");
  }
  if (!Number.isInteger(piecesPerPack) || piecesPerPack <= 0) {
    throw new Error("Le nombre de pièces par paquet doit être un entier supérieur à 0");
  }
  return packCount * piecesPerPack;
}

export function averagePieceCost(totalPrice: MoneyInput, quantity: number): Decimal {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("La quantité achetée doit être un entier supérieur à 0");
  }
  return money4(toDecimal(totalPrice).div(quantity));
}

export function salePieceQuantity(unit: "PACK" | "PIECE", quantity: number, piecesPerPack: number): number {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("La quantité vendue doit être un entier supérieur à 0");
  }
  return unit === "PACK" ? piecesFromPacks(quantity, piecesPerPack) : quantity;
}

export function retailSaleTotals(unit: "PACK" | "PIECE", quantity: number, packSalePrice: MoneyInput, pieceSalePrice: MoneyInput) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("La quantité vendue doit être un entier supérieur à 0");
  }
  const unitPrice = money(unit === "PACK" ? packSalePrice : pieceSalePrice);
  return {
    unitPrice,
    totalAmount: money(unitPrice.mul(quantity)),
  };
}

export function assertEnoughPieces(available: number, requested: number, label = "pièce") {
  if (requested > available) {
    throw new Error(`Stock insuffisant : ${available} ${label}(s) disponible(s), ${requested} demandé(s)`);
  }
}
