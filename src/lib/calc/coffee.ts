import { Decimal } from "@prisma/client/runtime/library";
import { money, money4, toDecimal, type MoneyInput } from "@/lib/decimal";

export function purchaseTotalFromKg(qtyKg: MoneyInput, pricePerKilogram: MoneyInput): Decimal {
  const qty = toDecimal(qtyKg);
  if (qty.lte(0)) {
    throw new Error("La quantité achetée doit être supérieure à 0");
  }
  const price = toDecimal(pricePerKilogram);
  if (price.lte(0)) {
    throw new Error("Fixez d'abord le prix du kilo dans Paramètres café");
  }
  return money(qty.mul(price));
}

export function pricePerKg(totalPrice: MoneyInput, qtyKg: MoneyInput): Decimal {
  const qty = toDecimal(qtyKg);
  if (qty.lte(0)) {
    throw new Error("La quantité achetée doit être supérieure à 0");
  }
  return money4(toDecimal(totalPrice).div(qty));
}

export function theoreticalCups(qtyKg: MoneyInput, cupsPerKg: MoneyInput): Decimal {
  return money4(toDecimal(qtyKg).mul(toDecimal(cupsPerKg)));
}

export function costPerCup(pricePerKilogram: MoneyInput, cupsPerKg: MoneyInput): Decimal {
  const cups = toDecimal(cupsPerKg);
  if (cups.lte(0)) {
    throw new Error("Le rendement (tasses / kg) doit être supérieur à 0");
  }
  return money4(toDecimal(pricePerKilogram).div(cups));
}

export function weightedAveragePricePerKg(
  purchases: Array<{ totalPrice: MoneyInput; qtyKg: MoneyInput }>,
): Decimal {
  if (purchases.length === 0) {
    return money4(0);
  }
  const totalPrice = purchases.reduce((acc, p) => acc.add(toDecimal(p.totalPrice)), new Decimal(0));
  const totalKg = purchases.reduce((acc, p) => acc.add(toDecimal(p.qtyKg)), new Decimal(0));
  if (totalKg.lte(0)) {
    return money4(0);
  }
  return money4(totalPrice.div(totalKg));
}

export function coffeeSaleTotals(input: {
  quantity: number;
  unitPrice: MoneyInput;
  costPerCup: MoneyInput;
}) {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new Error("La quantité vendue doit être un entier supérieur à 0");
  }
  const unitPrice = money(input.unitPrice);
  const totalAmount = money(unitPrice.mul(input.quantity));
  const costAmount = money(toDecimal(input.costPerCup).mul(input.quantity));
  const profitAmount = money(totalAmount.sub(costAmount));
  return {
    unitPrice,
    totalAmount,
    costAmount,
    profitAmount,
    waterOffered: 0,
  };
}

export function coffeeConsumedKg(cupsSold: number, cupsPerKg: MoneyInput): Decimal {
  const cups = toDecimal(cupsPerKg);
  if (cups.lte(0)) return money4(0);
  return money4(toDecimal(cupsSold).div(cups));
}

export function coffeeStockKg(purchasedKg: MoneyInput, cupsSold: number, cupsPerKg: MoneyInput) {
  const remaining = money4(toDecimal(purchasedKg).sub(coffeeConsumedKg(cupsSold, cupsPerKg)));
  return {
    purchasedKg: money4(purchasedKg),
    consumedKg: coffeeConsumedKg(cupsSold, cupsPerKg),
    remainingKg: remaining,
    current: remaining.toNumber(),
  };
}

export function assertEnoughCoffeeStock(remainingKg: MoneyInput, neededKg: MoneyInput) {
  if (toDecimal(neededKg).gt(toDecimal(remainingKg))) {
    throw new Error(
      `Stock café insuffisant : ${money4(remainingKg).toString()} kg restant(s), ${money4(neededKg).toString()} kg nécessaire(s)`,
    );
  }
}
