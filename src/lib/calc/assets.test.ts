import { describe, expect, it } from "vitest";
import { machineAmortization, monthsElapsed } from "./assets";

describe("machines — amortissement", () => {
  it("compte les mois écoulés", () => {
    expect(monthsElapsed(new Date("2026-01-14"), new Date("2026-10-14"))).toBe(9);
  });

  it("amortit linéairement une machine", () => {
    const result = machineAmortization({
      purchasePrice: 1_200_000,
      usefulLifeMonths: 12,
      purchaseDate: new Date("2026-01-14"),
      now: new Date("2026-10-14"),
    });
    expect(result.monthly.toNumber()).toBe(100_000);
    expect(result.elapsedMonths).toBe(9);
    expect(result.amortized.toNumber()).toBe(900_000);
    expect(result.remaining.toNumber()).toBe(300_000);
  });
});
