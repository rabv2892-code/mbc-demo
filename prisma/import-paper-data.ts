import { PrismaClient } from "@prisma/client";
import { formatImportReport, importPaperData } from "../src/server/catalog/import-paper";

const db = new PrismaClient();

async function snapshot() {
  const [coffeeSettings, waterSettings, cafeLots, waterSeed, catalog] = await Promise.all([
    db.coffeeSettings.findMany(),
    db.waterSettings.findMany(),
    db.coffeePurchase.findMany({ where: { reference: "CAFE_1KG" } }),
    db.waterStockMovement.findMany({ where: { refId: "EAU_SACHET" } }),
    db.catalogItem.findMany({ orderBy: { businessKey: "asc" } }),
  ]);
  return JSON.stringify({
    coffeeSettings,
    waterSettings,
    cafeLots: cafeLots.map((r) => ({
      id: r.id,
      qtyKg: r.qtyKg.toString(),
      totalPrice: r.totalPrice.toString(),
      pricePerKg: r.pricePerKg.toString(),
      reference: r.reference,
    })),
    waterSeed: waterSeed.map((r) => ({ id: r.id, quantity: r.quantity, refId: r.refId, type: r.type })),
    catalog: catalog.map((r) => ({
      businessKey: r.businessKey,
      name: r.name,
      payload: r.payload,
    })),
  });
}

async function main() {
  const before = await snapshot();
  const first = await importPaperData(db);
  const afterFirst = await snapshot();
  const second = await importPaperData(db);
  const afterSecond = await snapshot();

  const unmodifiedAfterFirstOperational =
    JSON.parse(before).coffeeSettings[0] &&
    JSON.stringify(JSON.parse(before).coffeeSettings) === JSON.stringify(JSON.parse(afterFirst).coffeeSettings) &&
    JSON.stringify(JSON.parse(before).waterSettings) === JSON.stringify(JSON.parse(afterFirst).waterSettings);

  const idempotent = afterFirst === afterSecond && second.added.length === 0;

  console.log("=== PREMIÈRE EXÉCUTION ===");
  console.log(formatImportReport(first));
  console.log("");
  console.log("=== DEUXIÈME EXÉCUTION ===");
  console.log(formatImportReport(second));
  console.log("");
  console.log("TEST D'IDEMPOTENCE :");
  console.log(`- ${idempotent ? "PASS" : "FAIL"}`);
  if (JSON.parse(before).coffeeSettings.length) {
    console.log(
      unmodifiedAfterFirstOperational
        ? "- Paramètres café/eau existants inchangés : PASS"
        : "- Paramètres café/eau existants inchangés : FAIL",
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
