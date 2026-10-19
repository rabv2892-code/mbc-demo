-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN_CAFE', 'MOTARD');

-- CreateEnum
CREATE TYPE "MotorcycleStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "WaterMovementType" AS ENUM ('PURCHASE', 'OFFERED_WITH_COFFEE', 'SEPARATE_SALE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoffeeSettings" (
    "id" TEXT NOT NULL,
    "cupsPerKg" DECIMAL(12,4) NOT NULL,
    "cupSalePrice" DECIMAL(18,2) NOT NULL,
    "offerWaterWithCoffee" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoffeeSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoffeePurchase" (
    "id" TEXT NOT NULL,
    "qtyKg" DECIMAL(12,4) NOT NULL,
    "totalPrice" DECIMAL(18,2) NOT NULL,
    "pricePerKg" DECIMAL(18,4) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoffeePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoffeeSale" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "costAmount" DECIMAL(18,2) NOT NULL,
    "profitAmount" DECIMAL(18,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoffeeSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterSettings" (
    "id" TEXT NOT NULL,
    "sachetSalePrice" DECIMAL(18,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaterSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterPurchase" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalPrice" DECIMAL(18,2) NOT NULL,
    "avgUnitCost" DECIMAL(18,4) NOT NULL,
    "supplier" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaterPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterSale" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaterSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterStockMovement" (
    "id" TEXT NOT NULL,
    "type" "WaterMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "refId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaterStockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Motorcycle" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "purchasePrice" DECIMAL(18,2) NOT NULL,
    "insuranceFee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "registrationFee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "equipmentFee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "maintenanceFee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "otherFees" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(18,2) NOT NULL,
    "status" "MotorcycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Motorcycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotorcycleExpense" (
    "id" TEXT NOT NULL,
    "motorcycleId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MotorcycleExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rider" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "motorcycleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "distanceKm" DECIMAL(10,2),
    "comment" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "riderId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmortizationEntry" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "percent" DECIMAL(8,4) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmortizationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSettings" (
    "id" TEXT NOT NULL,
    "amortizationPercentPerDelivery" DECIMAL(8,4) NOT NULL,
    "nextMotorcycleTarget" DECIMAL(18,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Motorcycle_plate_key" ON "Motorcycle"("plate");
CREATE UNIQUE INDEX "Rider_userId_key" ON "Rider"("userId");
CREATE UNIQUE INDEX "AmortizationEntry_deliveryId_key" ON "AmortizationEntry"("deliveryId");
CREATE INDEX "CoffeePurchase_occurredAt_idx" ON "CoffeePurchase"("occurredAt");
CREATE INDEX "CoffeePurchase_employeeId_idx" ON "CoffeePurchase"("employeeId");
CREATE INDEX "CoffeeSale_occurredAt_idx" ON "CoffeeSale"("occurredAt");
CREATE INDEX "CoffeeSale_employeeId_idx" ON "CoffeeSale"("employeeId");
CREATE INDEX "WaterPurchase_occurredAt_idx" ON "WaterPurchase"("occurredAt");
CREATE INDEX "WaterPurchase_employeeId_idx" ON "WaterPurchase"("employeeId");
CREATE INDEX "WaterSale_occurredAt_idx" ON "WaterSale"("occurredAt");
CREATE INDEX "WaterSale_employeeId_idx" ON "WaterSale"("employeeId");
CREATE INDEX "WaterStockMovement_type_idx" ON "WaterStockMovement"("type");
CREATE INDEX "WaterStockMovement_occurredAt_idx" ON "WaterStockMovement"("occurredAt");
CREATE INDEX "MotorcycleExpense_motorcycleId_idx" ON "MotorcycleExpense"("motorcycleId");
CREATE INDEX "Delivery_occurredAt_idx" ON "Delivery"("occurredAt");
CREATE INDEX "Delivery_riderId_idx" ON "Delivery"("riderId");
CREATE INDEX "Delivery_employeeId_idx" ON "Delivery"("employeeId");
CREATE INDEX "AuditLog_occurredAt_idx" ON "AuditLog"("occurredAt");
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- AddForeignKey
ALTER TABLE "CoffeePurchase" ADD CONSTRAINT "CoffeePurchase_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoffeeSale" ADD CONSTRAINT "CoffeeSale_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WaterPurchase" ADD CONSTRAINT "WaterPurchase_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WaterSale" ADD CONSTRAINT "WaterSale_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MotorcycleExpense" ADD CONSTRAINT "MotorcycleExpense_motorcycleId_fkey" FOREIGN KEY ("motorcycleId") REFERENCES "Motorcycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rider" ADD CONSTRAINT "Rider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Rider" ADD CONSTRAINT "Rider_motorcycleId_fkey" FOREIGN KEY ("motorcycleId") REFERENCES "Motorcycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AmortizationEntry" ADD CONSTRAINT "AmortizationEntry_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
