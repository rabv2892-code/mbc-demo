import { describe, expect, it } from "vitest";
import {
  assertEnoughLiptonStock,
  averagePieceCost,
  estimatedSugarPieces,
  liptonSaleTotals,
  liptonStock,
  totalPiecesFromPacks,
} from "./lipton";

describe("lipton — calculs", () => {
  it("calcule le nombre de pièces à partir des paquets", () => {
    expect(totalPiecesFromPacks(2, 100)).toBe(200);
  });

  it("calcule le prix moyen par pièce", () => {
    expect(averagePieceCost(200_000, 100).toNumber()).toBe(2000);
  });

  it("calcule le stock", () => {
    const stock = liptonStock({ purchased: 100, sold: 15 });
    expect(stock.current).toBe(85);
    expect(stock.sold).toBe(15);
  });

  it("empêche une vente si le stock est insuffisant", () => {
    expect(() => assertEnoughLiptonStock(5, 10)).toThrow(/Stock insuffisant/);
  });

  it("calcule une vente au prix catalogue 2000 GNF", () => {
    const sale = liptonSaleTotals(3, 2000);
    expect(sale.unitPrice.toNumber()).toBe(2000);
    expect(sale.totalAmount.toNumber()).toBe(6000);
  });

  it("estime le sucre (5 par Lipton) sans bloquer la vente", () => {
    expect(estimatedSugarPieces(4, 5)).toBe(20);
  });
});
