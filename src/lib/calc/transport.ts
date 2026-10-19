import { Decimal } from "@prisma/client/runtime/library";
import { money, toDecimal, type MoneyInput } from "@/lib/decimal";

export function motorcycleTotalCost(input: {
  purchasePrice: MoneyInput;
  insuranceFee?: MoneyInput;
  registrationFee?: MoneyInput;
  equipmentFee?: MoneyInput;
  maintenanceFee?: MoneyInput;
  otherFees?: MoneyInput;
}): Decimal {
  return money(
    toDecimal(input.purchasePrice)
      .add(toDecimal(input.insuranceFee ?? 0))
      .add(toDecimal(input.registrationFee ?? 0))
      .add(toDecimal(input.equipmentFee ?? 0))
      .add(toDecimal(input.maintenanceFee ?? 0))
      .add(toDecimal(input.otherFees ?? 0)),
  );
}

export function amortizationAmount(deliveryAmount: MoneyInput, percent: MoneyInput): Decimal {
  const p = toDecimal(percent);
  if (p.lt(0) || p.gt(100)) {
    throw new Error("Le pourcentage d'amortissement doit être entre 0 et 100");
  }
  return money(toDecimal(deliveryAmount).mul(p).div(100));
}

export function nextMotorcycleProgress(fund: MoneyInput, target: MoneyInput) {
  const t = toDecimal(target);
  const f = toDecimal(fund);
  if (t.lte(0)) {
    return {
      fund: money(f),
      target: money(t),
      remaining: money(0),
      percent: money(0),
    };
  }
  const remaining = money(Decimal.max(t.sub(f), 0));
  const percent = money(Decimal.min(f.div(t).mul(100), 100));
  return {
    fund: money(f),
    target: money(t),
    remaining,
    percent,
  };
}
