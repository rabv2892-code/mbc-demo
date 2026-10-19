-- AlterTable
ALTER TABLE "WaterSettings" ADD COLUMN "sachetsPerPack" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "WaterPurchase" ADD COLUMN "packCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "WaterPurchase" ADD COLUMN "sachetsPerPack" INTEGER NOT NULL DEFAULT 5;
