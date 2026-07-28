-- AlterEnum
ALTER TYPE "ServiceUnit" ADD VALUE 'FIXED';

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "services_categoryId_name_key" ON "services"("categoryId", "name");

