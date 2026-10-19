import { describe, expect, it } from "vitest";
import {
  coffeeSaleTotals,
  coffeeStockKg,
  costPerCup,
  pricePerKg,
  purchaseTotalFromKg,
  theoreticalCups,
  weightedAveragePricePerKg,
} from "./coffee";

describe("café — calculs", () => {
  it("calcule le prix par kilogramme", () => {
    expect(pricePerKg(1_000_000, 20).toNumber()).toBe(50_000);
  });

  it("calcule le total d'un achat à partir des kilos et du prix/kg fixé", () => {
    expect(purchaseTotalFromKg(2, 40_000).toNumber()).toBe(80_000);
  });

  it("refuse une quantité nulle", () => {
    expect(() => pricePerKg(1000, 0)).toThrow();
  });

  it("calcule le nombre théorique de tasses", () => {
    expect(theoreticalCups(20, 50).toNumber()).toBe(1000);
  });

  it("calcule le coût par tasse", () => {
    expect(costPerCup(50_000, 50).toNumber()).toBe(1000);
  });

  it("calcule le bénéfice d'une vente", () => {
    const sale = coffeeSaleTotals({
      quantity: 100,
      unitPrice: 5000,
      costPerCup: 1000,
    });
    expect(sale.totalAmount.toNumber()).toBe(500_000);
    expect(sale.costAmount.toNumber()).toBe(100_000);
    expect(sale.profitAmount.toNumber()).toBe(400_000);
    expect(sale.waterOffered).toBe(0);
  });

  it("calcule le stock café en kg", () => {
    const stock = coffeeStockKg(2, 55, 55);
    expect(stock.consumedKg.toNumber()).toBe(1);
    expect(stock.current).toBe(1);
  });

  it("ignore un prix envoyé côté client en recalculant depuis les paramètres", () => {
    const configuredPrice = 5000;
    const forgedClientPrice = 1;
    const sale = coffeeSaleTotals({
      quantity: 20,
      unitPrice: configuredPrice,
      costPerCup: 1000,
    });
    expect(sale.unitPrice.toNumber()).toBe(5000);
    expect(sale.totalAmount.toNumber()).toBe(100_000);
    expect(sale.unitPrice.toNumber()).not.toBe(forgedClientPrice);
  });

  it("calcule un prix/kg moyen pondéré", () => {
    const avg = weightedAveragePricePerKg([
      { totalPrice: 1_000_000, qtyKg: 20 },
      { totalPrice: 600_000, qtyKg: 10 },
    ]);
    expect(avg.toNumber()).toBeCloseTo(53_333.3333, 3);
  });
});
