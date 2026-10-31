-- Retire les défauts historiques de 20260815120000_water_packs.
-- Le modèle Prisma exige ces valeurs ; l'achat au bidon écrit 1, pas 5.
ALTER TABLE "WaterPurchase" ALTER COLUMN "packCount" DROP DEFAULT;
ALTER TABLE "WaterPurchase" ALTER COLUMN "sachetsPerPack" DROP DEFAULT;
