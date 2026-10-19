export type MoneyInput = number | string;

function toNumber(value: MoneyInput): number {
  if (typeof value === "number") return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatGnf(value: MoneyInput): string {
  return (
    new Intl.NumberFormat("fr-GN", {
      maximumFractionDigits: 0,
    }).format(Math.round(toNumber(value))) + " GNF"
  );
}

export function formatNumber(value: MoneyInput, digits = 2): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(toNumber(value));
}
