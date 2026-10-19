import { describe, expect, it } from "vitest";
import { gnfAmountSchema, positiveIntQtySchema, MAX_GNF_AMOUNT } from "./validation";
import { coffeeSaleSchema } from "@/server/cafe/service";
import { deliverySchema } from "@/server/transport/service";

describe("montants et quantités", () => {
  it("refuse un montant nul, négatif ou non fini", () => {
    expect(gnfAmountSchema.safeParse(0).success).toBe(false);
    expect(gnfAmountSchema.safeParse(-10).success).toBe(false);
    expect(gnfAmountSchema.safeParse(Number.POSITIVE_INFINITY).success).toBe(false);
  });

  it("refuse un montant au-delà du plafond", () => {
    expect(gnfAmountSchema.safeParse(MAX_GNF_AMOUNT + 1).success).toBe(false);
  });

  it("accepte un montant de livraison valide", () => {
    const parsed = deliverySchema.parse({
      client: "Client",
      origin: "A",
      destination: "B",
      amount: 25_000,
    });
    expect(parsed.amount).toBe(25_000);
  });

  it("ignore un total envoyé par le client sur une vente café", () => {
    const parsed = coffeeSaleSchema.parse({ quantity: 12, totalAmount: 1, unitPrice: 1 });
    expect(parsed).toEqual({ quantity: 12 });
    expect("totalAmount" in parsed).toBe(false);
  });

  it("refuse une quantité non entière", () => {
    expect(positiveIntQtySchema.safeParse(1.5).success).toBe(false);
    expect(positiveIntQtySchema.safeParse(0).success).toBe(false);
  });
});
