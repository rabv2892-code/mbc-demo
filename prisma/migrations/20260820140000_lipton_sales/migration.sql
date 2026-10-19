-- CreateEnum
CREATE TYPE "LiptonMovementType" AS ENUM ('PURCHASE', 'SALE');

-- CreateTable
CREATE TABLE "LiptonSettings" (
    "id" TEXT NOT NULL,
    "pieceSalePrice" DECIMAL(18,2) NOT NULL,
    "piecesPerPack" INTEGER NOT NULL DEFAULT 100,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiptonSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiptonPurchase" (
    "id" TEXT NOT NULL,
    "packCount" INTEGER NOT NULL,
    "piecesPerPack" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalPrice" DECIMAL(18,2) NOT NULL,
    "avgUnitCost" DECIMAL(18,4) NOT NULL,
    "supplier" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiptonPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiptonSale" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiptonSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiptonStockMovement" (
    "id" TEXT NOT NULL,
    "type" "LiptonMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "refId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiptonStockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiptonPurchase_occurredAt_idx" ON "LiptonPurchase"("occurredAt");

-- CreateIndex
CREATE INDEX "LiptonPurchase_employeeId_idx" ON "LiptonPurchase"("employeeId");

-- CreateIndex
CREATE INDEX "LiptonSale_occurredAt_idx" ON "LiptonSale"("occurredAt");

-- CreateIndex
CREATE INDEX "LiptonSale_employeeId_idx" ON "LiptonSale"("employeeId");

-- CreateIndex
CREATE INDEX "LiptonStockMovement_type_idx" ON "LiptonStockMovement"("type");

-- CreateIndex
CREATE INDEX "LiptonStockMovement_occurredAt_idx" ON "LiptonStockMovement"("occurredAt");

-- AddForeignKey
ALTER TABLE "LiptonPurchase" ADD CONSTRAINT "LiptonPurchase_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiptonSale" ADD CONSTRAINT "LiptonSale_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
