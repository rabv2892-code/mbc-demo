import { describe, expect, it } from "vitest";
import { consumeSupplies, supplyStock } from "./supply";

describe("fournitures", () => {
  it("calcule le stock courant", () => {
    expect(supplyStock(100, 40).current).toBe(60);
  });

  it("ne consomme jamais plus que le stock disponible", () => {
    expect(consumeSupplies(8, 20)).toBe(8);
  });

  it("ne descend pas en négatif si le stock est déjà à zéro", () => {
    expect(consumeSupplies(0, 5)).toBe(0);
    expect(consumeSupplies(-3, 5)).toBe(0);
  });

  it("refuse une quantité demandée négative", () => {
    expect(() => consumeSupplies(10, -1)).toThrow(/négative/);
  });
});
