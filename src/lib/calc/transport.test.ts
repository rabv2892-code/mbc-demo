import { describe, expect, it } from "vitest";
import { amortizationAmount, motorcycleTotalCost, nextMotorcycleProgress } from "./transport";

describe("transport — calculs", () => {
  it("calcule le coût total d'une moto", () => {
    const total = motorcycleTotalCost({
      purchasePrice: 12_000_000,
      insuranceFee: 500_000,
      registrationFee: 300_000,
      equipmentFee: 200_000,
      maintenanceFee: 100_000,
      otherFees: 50_000,
    });
    expect(total.toNumber()).toBe(13_150_000);
  });

  it("calcule l'amortissement par livraison", () => {
    expect(amortizationAmount(50_000, 20).toNumber()).toBe(10_000);
  });

  it("calcule la progression vers la prochaine moto", () => {
    const progress = nextMotorcycleProgress(8_500_000, 15_000_000);
    expect(progress.remaining.toNumber()).toBe(6_500_000);
    expect(progress.percent.toNumber()).toBeCloseTo(56.67, 2);
  });
});
