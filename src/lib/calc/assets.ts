import { Decimal } from "@prisma/client/runtime/library";
import { money, toDecimal, type MoneyInput } from "@/lib/decimal";

export function monthsElapsed(purchaseDate: Date, now: Date): number {
  const years = now.getFullYear() - purchaseDate.getFullYear();
  const months = now.getMonth() - purchaseDate.getMonth();
  const total = years * 12 + months + (now.getDate() >= purchaseDate.getDate() ? 0 : -1);
  return Math.max(0, total);
}

export function machineAmortization(input: {
  purchasePrice: MoneyInput;
  usefulLifeMonths: number;
  purchaseDate: Date;
  now: Date;
}) {
  if (!Number.isInteger(input.usefulLifeMonths) || input.usefulLifeMonths <= 0) {
    throw new Error("La durée d'amortissement doit être un nombre de mois supérieur à 0");
  }
  const price = toDecimal(input.purchasePrice);
  const monthly = money(price.div(input.usefulLifeMonths));
  const elapsed = Math.min(monthsElapsed(input.purchaseDate, input.now), input.usefulLifeMonths);
  const amortized = money(Decimal.min(price, monthly.mul(elapsed)));
  const remaining = money(Decimal.max(price.sub(amortized), 0));
  const percent = price.gt(0) ? money(amortized.div(price).mul(100)) : money(0);
  return {
    monthly,
    elapsedMonths: elapsed,
    usefulLifeMonths: input.usefulLifeMonths,
    amortized,
    remaining,
    percent,
  };
}
