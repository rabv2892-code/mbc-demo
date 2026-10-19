import { Decimal } from "@prisma/client/runtime/library";
import { money, money4, toDecimal, type MoneyInput } from "@/lib/decimal";

export function totalSachetsFromPacks(packCount: number, sachetsPerPack: number): number {
  if (!Number.isInteger(packCount) || packCount <= 0) {
    throw new Error("Le nombre de paquets doit être un entier supérieur à 0");
  }
  if (!Number.isInteger(sachetsPerPack) || sachetsPerPack <= 0) {
    throw new Error("Le nombre de sachets par paquet doit être un entier supérieur à 0");
  }
  return packCount * sachetsPerPack;
}

export function averageSachetCost(totalPrice: MoneyInput, quantity: number): Decimal {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("La quantité achetée doit être un entier supérieur à 0");
  }
  return money4(toDecimal(totalPrice).div(quantity));
}

export function waterStock(input: {
  purchased: number;
  offered: number;
  sold: number;
}): { current: number; purchased: number; offered: number; sold: number } {
  const current = input.purchased - input.offered - input.sold;
  return {
    current,
    purchased: input.purchased,
    offered: input.offered,
    sold: input.sold,
  };
}

export function assertEnoughStock(available: number, requested: number) {
  if (requested > available) {
    throw new Error(
      `Stock insuffisant : ${available} bidon(s) disponible(s), ${requested} demandé(s)`,
    );
  }
}

export function waterSaleTotals(quantity: number, unitPrice: MoneyInput) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("La quantité vendue doit être un entier supérieur à 0");
  }
  const price = money(unitPrice);
  return {
    unitPrice: price,
    totalAmount: money(price.mul(quantity)),
  };
}

export function offeredWithCoffeeQuantity(cupsSold: number, offerEnabled: boolean): number {
  if (!offerEnabled) return 0;
  if (!Number.isInteger(cupsSold) || cupsSold < 0) {
    throw new Error("La quantité de tasses doit être un entier positif");
  }
  return cupsSold;
}

export function remainingAfterMovements(movements: Array<{ type: string; quantity: number }>): number {
  return movements.reduce((stock, m) => {
    if (m.type === "PURCHASE") return stock + m.quantity;
    return stock - m.quantity;
  }, 0);
}

export function zeroDecimal(): Decimal {
  return money(0);
}
