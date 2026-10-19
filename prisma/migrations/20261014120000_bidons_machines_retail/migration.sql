-- CreateEnum
CREATE TYPE "MotorcycleOwnership" AS ENUM ('OWNED', 'PARTNER');
CREATE TYPE "SupplyKind" AS ENUM ('CUP', 'SPOON');
CREATE TYPE "SupplyMovementType" AS ENUM ('PURCHASE', 'CONSUMED');
CREATE TYPE "RetailKind" AS ENUM ('CIGARETTE', 'JUICE');
CREATE TYPE "RetailUnit" AS ENUM ('PACK', 'PIECE');
CREATE TYPE "RetailMovementType" AS ENUM ('PURCHASE', 'SALE');

-- AlterTable Water
ALTER TABLE "WaterSettings" ADD COLUMN "bidonSalePrice" DECIMAL(18,2) NOT NULL DEFAULT 0;
UPDATE "WaterSettings" SET "bidonSalePrice" = "sachetSalePrice" WHERE "bidonSalePrice" = 0;

ALTER TABLE "WaterPurchase" ADD COLUMN "bidonCount" INTEGER NOT NULL DEFAULT 0;
UPDATE "WaterPurchase" SET "bidonCount" = "quantity" WHERE "bidonCount" = 0;

-- AlterTable Motorcycle
ALTER TABLE "Motorcycle" ADD COLUMN "ownership" "MotorcycleOwnership" NOT NULL DEFAULT 'OWNED';
ALTER TABLE "Motorcycle" ADD COLUMN "ownerName" TEXT;

-- CreateTable SupplyPurchase
CREATE TABLE "SupplyPurchase" (
    "id" TEXT NOT NULL,
    "kind" "SupplyKind" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalPrice" DECIMAL(18,2) NOT NULL,
    "supplier" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplyPurchase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplyStockMovement" (
    "id" TEXT NOT NULL,
    "kind" "SupplyKind" NOT NULL,
    "type" "SupplyMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "refId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplyStockMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "purchasePrice" DECIMAL(18,2) NOT NULL,
    "usefulLifeMonths" INTEGER NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RetailProduct" (
    "id" TEXT NOT NULL,
    "kind" "RetailKind" NOT NULL,
    "name" TEXT NOT NULL,
    "piecesPerPack" INTEGER NOT NULL,
    "packPurchasePrice" DECIMAL(18,2) NOT NULL,
    "packSalePrice" DECIMAL(18,2) NOT NULL,
    "pieceSalePrice" DECIMAL(18,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RetailPurchase" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "packCount" INTEGER NOT NULL,
    "piecesPerPack" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalPrice" DECIMAL(18,2) NOT NULL,
    "avgUnitCost" DECIMAL(18,4) NOT NULL,
    "supplier" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailPurchase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RetailSale" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unit" "RetailUnit" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pieceQuantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailSale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RetailStockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "RetailMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "refId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailStockMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RetailProduct_kind_name_key" ON "RetailProduct"("kind", "name");
CREATE INDEX "SupplyPurchase_kind_idx" ON "SupplyPurchase"("kind");
CREATE INDEX "SupplyPurchase_occurredAt_idx" ON "SupplyPurchase"("occurredAt");
CREATE INDEX "SupplyStockMovement_kind_type_idx" ON "SupplyStockMovement"("kind", "type");
CREATE INDEX "SupplyStockMovement_occurredAt_idx" ON "SupplyStockMovement"("occurredAt");
CREATE INDEX "Machine_occurredAt_idx" ON "Machine"("occurredAt");
CREATE INDEX "RetailPurchase_occurredAt_idx" ON "RetailPurchase"("occurredAt");
CREATE INDEX "RetailPurchase_productId_idx" ON "RetailPurchase"("productId");
CREATE INDEX "RetailSale_occurredAt_idx" ON "RetailSale"("occurredAt");
CREATE INDEX "RetailSale_productId_idx" ON "RetailSale"("productId");
CREATE INDEX "RetailStockMovement_productId_type_idx" ON "RetailStockMovement"("productId", "type");
CREATE INDEX "RetailStockMovement_occurredAt_idx" ON "RetailStockMovement"("occurredAt");

ALTER TABLE "SupplyPurchase" ADD CONSTRAINT "SupplyPurchase_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RetailPurchase" ADD CONSTRAINT "RetailPurchase_productId_fkey" FOREIGN KEY ("productId") REFERENCES "RetailProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RetailPurchase" ADD CONSTRAINT "RetailPurchase_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RetailSale" ADD CONSTRAINT "RetailSale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "RetailProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RetailSale" ADD CONSTRAINT "RetailSale_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RetailStockMovement" ADD CONSTRAINT "RetailStockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "RetailProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
