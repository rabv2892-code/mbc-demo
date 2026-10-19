import { Decimal } from "@prisma/client/runtime/library";

export type MoneyInput = Decimal | number | string;

export function toDecimal(value: MoneyInput): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

export function money(value: MoneyInput, places = 2): Decimal {
  return toDecimal(value).toDecimalPlaces(places);
}

export function money4(value: MoneyInput): Decimal {
  return toDecimal(value).toDecimalPlaces(4);
}

export function serializeDecimal(value: Decimal | null | undefined): string {
  return value ? value.toFixed() : "0";
}
