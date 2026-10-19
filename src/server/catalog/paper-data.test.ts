import { describe, expect, it } from "vitest";
import { decideInsert } from "./paper-data";

describe("import fiche papier — insert si absent", () => {
  it("n'insère pas si la donnée existe", () => {
    expect(decideInsert(true)).toBe("skip");
  });

  it("insère uniquement si la donnée est absente", () => {
    expect(decideInsert(false)).toBe("insert");
  });
});
