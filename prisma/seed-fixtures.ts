import type { PrismaClient } from "@prisma/client";
import { assertFixtureDataAllowed } from "../src/lib/env";

export async function seedFixtureData(db: PrismaClient) {
  if (process.env.SEED_FIXTURE_DATA !== "true") return;
  assertFixtureDataAllowed();

  const admin = await db.user.findFirst({ where: { role: "SUPER_ADMIN", isActive: true } });
  if (!admin) {
    throw new Error("SEED_FIXTURE_DATA exige un Super Admin déjà créé (ADMIN_EMAIL / ADMIN_PASSWORD).");
  }

  if ((await db.coffeePurchase.count()) > 0) {
    console.log("Seed: données fictives déjà présentes, aucune copie.");
    return;
  }

  const occurredAt = new Date();

  await db.$transaction(async (tx) => {
    await tx.coffeePurchase.create({
      data: {
        qtyKg: 5,
        totalPrice: 200_000,
        pricePerKg: 40_000,
        reference: "DEMO-CAFE-01",
        notes: "Lot fictif de démonstration",
        occurredAt,
        employeeId: admin.id,
      },
    });

    await tx.coffeeSale.create({
      data: {
        quantity: 20,
        unitPrice: 5_000,
        totalAmount: 100_000,
        costAmount: 16_000,
        profitAmount: 84_000,
        occurredAt,
        employeeId: admin.id,
      },
    });

    const water = await tx.waterPurchase.create({
      data: {
        packCount: 20,
        sachetsPerPack: 1,
        bidonCount: 20,
        quantity: 20,
        totalPrice: 80_000,
        avgUnitCost: 4_000,
        supplier: "Fournisseur démo",
        occurredAt,
        employeeId: admin.id,
      },
    });
    await tx.waterStockMovement.create({
      data: { type: "PURCHASE", quantity: 20, refId: water.id, occurredAt },
    });

    const lipton = await tx.liptonPurchase.create({
      data: {
        packCount: 2,
        piecesPerPack: 100,
        quantity: 200,
        totalPrice: 60_000,
        avgUnitCost: 300,
        supplier: "Fournisseur démo",
        occurredAt,
        employeeId: admin.id,
      },
    });
    await tx.liptonStockMovement.create({
      data: { type: "PURCHASE", quantity: 200, refId: lipton.id, occurredAt },
    });
  });

  console.log("Seed: données fictives de démonstration créées.");
}
