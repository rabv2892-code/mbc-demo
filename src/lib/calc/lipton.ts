import { Decimal } from "@prisma/client/runtime/library";
import { money, money4, toDecimal, type MoneyInput } from "@/lib/decimal";

export function totalPiecesFromPacks(packCount: number, piecesPerPack: number): number {
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

export function liptonStock(input: { purchased: number; sold: number }): {
  current: number;
  purchased: number;
  sold: number;
} {
  return {
    current: input.purchased - input.sold,
    purchased: input.purchased,
    sold: input.sold,
  };
}

export function assertEnoughLiptonStock(available: number, requested: number) {
  if (requested > available) {
    throw new Error(
      `Stock insuffisant : ${available} pièce(s) Lipton disponible(s), ${requested} demandée(s)`,
    );
  }
}

export function liptonSaleTotals(quantity: number, unitPrice: MoneyInput) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("La quantité vendue doit être un entier supérieur à 0");
  }
  const price = money(unitPrice);
  return {
    unitPrice: price,
    totalAmount: money(price.mul(quantity)),
  };
}

export function estimatedSugarPieces(liptonQuantity: number, piecesPerLipton: number): number {
  if (!Number.isInteger(liptonQuantity) || liptonQuantity <= 0) return 0;
  if (!Number.isInteger(piecesPerLipton) || piecesPerLipton < 0) return 0;
  return liptonQuantity * piecesPerLipton;
}
