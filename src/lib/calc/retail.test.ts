import { describe, expect, it } from "vitest";
import { piecesFromPacks, retailSaleTotals, salePieceQuantity } from "./retail";

describe("cigarettes / jus", () => {
  it("convertit un paquet en pièces", () => {
    expect(piecesFromPacks(2, 20)).toBe(40);
  });

  it("vend au paquet ou au détail", () => {
    const pack = retailSaleTotals("PACK", 1, 10_000, 600);
    expect(pack.totalAmount.toNumber()).toBe(10_000);
    const piece = retailSaleTotals("PIECE", 3, 10_000, 600);
    expect(piece.totalAmount.toNumber()).toBe(1_800);
  });

  it("déduit le stock en pièces", () => {
    expect(salePieceQuantity("PACK", 2, 20)).toBe(40);
    expect(salePieceQuantity("PIECE", 5, 20)).toBe(5);
  });
});
