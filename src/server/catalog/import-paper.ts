import type { Prisma, PrismaClient } from "@prisma/client";
import { nowServer } from "@/lib/timezone";
import {
  decideInsert,
  PAPER_CAFE,
  PAPER_EAU,
  PAPER_KEYS,
  PAPER_LIPTON,
  PAPER_SUCRE,
} from "@/server/catalog/paper-data";

export type ImportReport = {
  kept: string[];
  added: string[];
  skippedExisting: string[];
  duplicatesCreated: number;
  recordsModified: number;
};

const emptyReport = (): ImportReport => ({
  kept: [],
  added: [],
  skippedExisting: [],
  duplicatesCreated: 0,
  recordsModified: 0,
});

async function catalogExists(db: PrismaClient, businessKey: string) {
  const row = await db.catalogItem.findUnique({ where: { businessKey } });
  return Boolean(row);
}

async function insertCatalogIfMissing(
  db: PrismaClient,
  report: ImportReport,
  input: { businessKey: string; name: string; payload: Record<string, unknown> },
) {
  const exists = await catalogExists(db, input.businessKey);
  if (decideInsert(exists) === "skip") {
    report.skippedExisting.push(input.businessKey);
    report.kept.push(`${input.businessKey} (${input.name})`);
    return;
  }
  await db.catalogItem.create({
    data: {
      businessKey: input.businessKey,
      name: input.name,
      payload: input.payload as Prisma.InputJsonValue,
    },
  });
  report.added.push(`${input.businessKey} (${input.name})`);
}

export async function importPaperData(db: PrismaClient): Promise<ImportReport> {
  const report = emptyReport();
  const admin = await db.user.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const coffeeSettings = await db.coffeeSettings.findFirst();
  if (coffeeSettings) {
    report.skippedExisting.push("paramètres café (CoffeeSettings)");
    report.kept.push(
      `Café — rendement ${coffeeSettings.cupsPerKg.toString()} tasses/kg, prix tasse ${coffeeSettings.cupSalePrice.toString()} GNF`,
    );
  } else {
    await db.coffeeSettings.create({
      data: {
        cupsPerKg: PAPER_CAFE.cupsPerKg,
        purchasePricePerKg: PAPER_CAFE.purchasePrice,
        cupSalePrice: PAPER_CAFE.cupSalePrice,
        offerWaterWithCoffee: true,
      },
    });
    report.added.push(
      `Paramètres café — ${PAPER_CAFE.cupsPerKg} tasses/kg, tasse ${PAPER_CAFE.cupSalePrice} GNF`,
    );
  }

  const cafeLot = await db.coffeePurchase.findFirst({
    where: { reference: PAPER_KEYS.CAFE_1KG },
  });
  if (cafeLot) {
    report.skippedExisting.push(`${PAPER_KEYS.CAFE_1KG} (achat café)`);
    report.kept.push(`Achat café ${PAPER_KEYS.CAFE_1KG}`);
  } else if (admin) {
    await db.coffeePurchase.create({
      data: {
        qtyKg: PAPER_CAFE.qtyKg,
        totalPrice: PAPER_CAFE.purchasePrice,
        pricePerKg: PAPER_CAFE.purchasePrice / PAPER_CAFE.qtyKg,
        reference: PAPER_KEYS.CAFE_1KG,
        notes: "Import fiche papier — 1 kg",
        occurredAt: nowServer(),
        employeeId: admin.id,
      },
    });
    report.added.push(`Achat café ${PAPER_KEYS.CAFE_1KG} — 1 kg / ${PAPER_CAFE.purchasePrice} GNF`);
  }

  if (await catalogExists(db, PAPER_KEYS.CAFE_1KG) || coffeeSettings) {
    if (await catalogExists(db, PAPER_KEYS.CAFE_1KG)) {
      report.skippedExisting.push(PAPER_KEYS.CAFE_1KG);
      report.kept.push(`${PAPER_KEYS.CAFE_1KG} (catalogue)`);
    } else if (coffeeSettings) {
      report.skippedExisting.push(`${PAPER_KEYS.CAFE_1KG} — café déjà présent, catalogue non dupliqué`);
      report.kept.push("Café 1 kg déjà géré par CoffeeSettings");
    }
  } else {
    await insertCatalogIfMissing(db, report, {
      businessKey: PAPER_KEYS.CAFE_1KG,
      name: PAPER_CAFE.name,
      payload: {
        qtyKg: PAPER_CAFE.qtyKg,
        purchasePrice: PAPER_CAFE.purchasePrice,
        cupsPerKg: PAPER_CAFE.cupsPerKg,
        cupSalePrice: PAPER_CAFE.cupSalePrice,
        waterWithCup: PAPER_CAFE.waterWithCup,
      },
    });
  }

  const waterSettings = await db.waterSettings.findFirst();
  if (waterSettings) {
    report.skippedExisting.push("paramètres eau (WaterSettings)");
    report.kept.push(`Eau — prix sachet ${waterSettings.sachetSalePrice.toString()} GNF`);
  } else {
    await db.waterSettings.create({
      data: {
        sachetSalePrice: PAPER_EAU.sachetSalePrice,
        sachetsPerPack: 5,
      },
    });
    report.added.push(`Paramètres eau — sachet ${PAPER_EAU.sachetSalePrice} GNF`);
  }

  const waterSeed = await db.waterStockMovement.findFirst({
    where: { refId: PAPER_KEYS.EAU_SACHET },
  });
  if (waterSeed) {
    report.skippedExisting.push(PAPER_KEYS.EAU_SACHET + " (stock)");
    report.kept.push(`Stock initial eau ${PAPER_KEYS.EAU_SACHET}`);
  } else {
    await db.waterStockMovement.create({
      data: {
        type: "PURCHASE",
        quantity: PAPER_EAU.initialStock,
        refId: PAPER_KEYS.EAU_SACHET,
        occurredAt: nowServer(),
      },
    });
    report.added.push(`Stock initial eau ${PAPER_KEYS.EAU_SACHET} — ${PAPER_EAU.initialStock} sachets`);
  }

  if (await catalogExists(db, PAPER_KEYS.EAU_SACHET) || waterSettings) {
    if (await catalogExists(db, PAPER_KEYS.EAU_SACHET)) {
      report.skippedExisting.push(PAPER_KEYS.EAU_SACHET);
      report.kept.push(`${PAPER_KEYS.EAU_SACHET} (catalogue)`);
    } else if (waterSettings) {
      report.skippedExisting.push(`${PAPER_KEYS.EAU_SACHET} — eau déjà présente, catalogue non dupliqué`);
      report.kept.push("Eau déjà gérée par WaterSettings");
    }
  } else {
    await insertCatalogIfMissing(db, report, {
      businessKey: PAPER_KEYS.EAU_SACHET,
      name: PAPER_EAU.name,
      payload: {
        initialStock: PAPER_EAU.initialStock,
        sachetSalePrice: PAPER_EAU.sachetSalePrice,
      },
    });
  }

  await insertCatalogIfMissing(db, report, {
    businessKey: PAPER_KEYS.LIPTON_PAQUET_100,
    name: PAPER_LIPTON.name,
    payload: {
      piecesPerPack: PAPER_LIPTON.piecesPerPack,
      pieceSalePrice: PAPER_LIPTON.pieceSalePrice,
    },
  });

  const liptonSettings = await db.liptonSettings.findFirst();
  if (liptonSettings) {
    report.skippedExisting.push("paramètres Lipton (LiptonSettings)");
    report.kept.push(`Lipton — prix pièce ${liptonSettings.pieceSalePrice.toString()} GNF`);
  } else {
    await db.liptonSettings.create({
      data: {
        pieceSalePrice: PAPER_LIPTON.pieceSalePrice,
        piecesPerPack: PAPER_LIPTON.piecesPerPack,
      },
    });
    report.added.push(
      `Paramètres Lipton — pièce ${PAPER_LIPTON.pieceSalePrice} GNF, ${PAPER_LIPTON.piecesPerPack} pièces/paquet`,
    );
  }

  await insertCatalogIfMissing(db, report, {
    businessKey: PAPER_KEYS.SUCRE_PAQUET_250,
    name: PAPER_SUCRE.name,
    payload: {
      piecesPerPack: PAPER_SUCRE.piecesPerPack,
      piecesPerCoffeeCup: PAPER_SUCRE.piecesPerCoffeeCup,
      piecesPerLiptonCup: PAPER_SUCRE.piecesPerLiptonCup,
    },
  });

  return report;
}

export function formatImportReport(report: ImportReport) {
  return [
    "DONNÉES EXISTANTES CONSERVÉES :",
    ...(report.kept.length ? report.kept.map((x) => `- ${x}`) : ["- (aucune)"]),
    "",
    "DONNÉES NOUVELLES AJOUTÉES :",
    ...(report.added.length ? report.added.map((x) => `- ${x}`) : ["- (aucune)"]),
    "",
    "DONNÉES IGNORÉES CAR DÉJÀ EXISTANTES :",
    ...(report.skippedExisting.length ? report.skippedExisting.map((x) => `- ${x}`) : ["- (aucune)"]),
    "",
    "DOUBLONS CRÉÉS :",
    `- ${report.duplicatesCreated}`,
    "",
    "DONNÉES MODIFIÉES :",
    `- ${report.recordsModified}`,
  ].join("\n");
}
