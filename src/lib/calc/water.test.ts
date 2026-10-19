import { describe, expect, it } from "vitest";
import {
  assertEnoughStock,
  averageSachetCost,
  offeredWithCoffeeQuantity,
  remainingAfterMovements,
  totalSachetsFromPacks,
  waterSaleTotals,
  waterStock,
} from "./water";

describe("eau — calculs", () => {
  it("calcule le nombre de sachets à partir des paquets", () => {
    expect(totalSachetsFromPacks(10, 5)).toBe(50);
  });

  it("calcule le prix moyen par sachet", () => {
    expect(averageSachetCost(100_000, 200).toNumber()).toBe(500);
  });

  it("calcule le stock", () => {
    const stock = waterStock({ purchased: 1000, offered: 100, sold: 50 });
    expect(stock.current).toBe(850);
    expect(stock.offered).toBe(100);
    expect(stock.sold).toBe(50);
  });

  it("empêche une vente si le stock est insuffisant", () => {
    expect(() => assertEnoughStock(10, 20)).toThrow(/Stock insuffisant/);
  });

  it("calcule une vente séparée", () => {
    const sale = waterSaleTotals(10, 1000);
    expect(sale.totalAmount.toNumber()).toBe(10_000);
  });

  it("offre 1 sachet par tasse si la règle est active", () => {
    expect(offeredWithCoffeeQuantity(100, true)).toBe(100);
    expect(offeredWithCoffeeQuantity(100, false)).toBe(0);
  });

  it("reconstruit le stock depuis les mouvements", () => {
    const stock = remainingAfterMovements([
      { type: "PURCHASE", quantity: 200 },
      { type: "OFFERED_WITH_COFFEE", quantity: 80 },
      { type: "SEPARATE_SALE", quantity: 20 },
    ]);
    expect(stock).toBe(100);
  });
});
