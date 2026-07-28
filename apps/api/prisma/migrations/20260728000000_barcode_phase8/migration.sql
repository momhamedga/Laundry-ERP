-- CreateEnum
CREATE TYPE "BarcodeType" AS ENUM ('CODE128', 'CODE39', 'EAN13', 'EAN8', 'UPC', 'QR');

-- CreateEnum
CREATE TYPE "LabelSize" AS ENUM ('A4', 'THERMAL_58', 'THERMAL_80', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ScanAction" AS ENUM ('VIEW', 'ADJUST', 'MOVEMENT', 'RECEIVE', 'SELL', 'TRANSFER', 'COUNT', 'LOOKUP');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'BARCODE_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'BARCODE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'BARCODE_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'LABEL_PRINTED';
ALTER TYPE "AuditAction" ADD VALUE 'BARCODE_SCANNED';
ALTER TYPE "AuditAction" ADD VALUE 'LABEL_TEMPLATE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'LABEL_TEMPLATE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'LABEL_TEMPLATE_DELETED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'BARCODE_GENERATED';
ALTER TYPE "NotificationType" ADD VALUE 'LABEL_PRINTED';
ALTER TYPE "NotificationType" ADD VALUE 'LOW_STOCK_SCANNED';
ALTER TYPE "NotificationType" ADD VALUE 'INVALID_SCAN';

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "barcodeType" "BarcodeType",
ADD COLUMN     "labelTemplateId" TEXT,
ADD COLUMN     "lastPrintedAt" TIMESTAMP(3),
ADD COLUMN     "printCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "qrCode" TEXT;

-- CreateTable
CREATE TABLE "label_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" "LabelSize" NOT NULL DEFAULT 'A4',
    "widthMm" INTEGER,
    "heightMm" INTEGER,
    "showName" BOOLEAN NOT NULL DEFAULT true,
    "showSku" BOOLEAN NOT NULL DEFAULT true,
    "showBarcode" BOOLEAN NOT NULL DEFAULT true,
    "showQr" BOOLEAN NOT NULL DEFAULT false,
    "showPrice" BOOLEAN NOT NULL DEFAULT true,
    "showCategory" BOOLEAN NOT NULL DEFAULT false,
    "showSupplier" BOOLEAN NOT NULL DEFAULT false,
    "showLogo" BOOLEAN NOT NULL DEFAULT false,
    "showCompanyName" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "label_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "label_print_logs" (
    "id" TEXT NOT NULL,
    "size" "LabelSize" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemId" TEXT,
    "templateId" TEXT,
    "templateName" TEXT,
    "createdById" TEXT,

    CONSTRAINT "label_print_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barcode_scan_logs" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "action" "ScanAction" NOT NULL DEFAULT 'LOOKUP',
    "success" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemId" TEXT,
    "createdById" TEXT,

    CONSTRAINT "barcode_scan_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "label_templates_isActive_idx" ON "label_templates"("isActive");

-- CreateIndex
CREATE INDEX "label_print_logs_itemId_createdAt_idx" ON "label_print_logs"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "label_print_logs_createdAt_idx" ON "label_print_logs"("createdAt");

-- CreateIndex
CREATE INDEX "barcode_scan_logs_itemId_createdAt_idx" ON "barcode_scan_logs"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "barcode_scan_logs_success_idx" ON "barcode_scan_logs"("success");

-- CreateIndex
CREATE INDEX "barcode_scan_logs_createdAt_idx" ON "barcode_scan_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_barcode_key" ON "inventory_items"("barcode");

-- CreateIndex
CREATE INDEX "inventory_items_barcodeType_idx" ON "inventory_items"("barcodeType");

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_labelTemplateId_fkey" FOREIGN KEY ("labelTemplateId") REFERENCES "label_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "label_templates" ADD CONSTRAINT "label_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "label_print_logs" ADD CONSTRAINT "label_print_logs_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "label_print_logs" ADD CONSTRAINT "label_print_logs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_scan_logs" ADD CONSTRAINT "barcode_scan_logs_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_scan_logs" ADD CONSTRAINT "barcode_scan_logs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

