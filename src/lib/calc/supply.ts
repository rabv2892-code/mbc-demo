export function supplyStock(purchased: number, consumed: number) {
  return {
    purchased,
    consumed,
    current: purchased - consumed,
  };
}

export function consumeSupplies(available: number, requested: number) {
  if (!Number.isFinite(available) || !Number.isInteger(requested)) {
    throw new Error("Quantité de fournitures invalide");
  }
  if (requested < 0) {
    throw new Error("La quantité demandée ne peut pas être négative");
  }
  const stock = Math.max(0, available);
  if (requested === 0 || stock === 0) return 0;
  return Math.min(stock, requested);
}
