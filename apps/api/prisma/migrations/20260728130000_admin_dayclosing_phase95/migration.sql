-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TERMINATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "DayStatus" AS ENUM ('OPEN', 'CLOSED', 'REOPENED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'DAY_OPENED';
ALTER TYPE "AuditAction" ADD VALUE 'DAY_CLOSED';
ALTER TYPE "AuditAction" ADD VALUE 'DAY_REOPENED';
ALTER TYPE "AuditAction" ADD VALUE 'DAY_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'EMPLOYEE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_FORCE_LOGOUT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'DAY_OPENED';
ALTER TYPE "NotificationType" ADD VALUE 'DAY_CLOSED';
ALTER TYPE "NotificationType" ADD VALUE 'DAY_REOPENED';

-- CreateTable
CREATE TABLE "employee_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeCode" TEXT,
    "jobTitle" TEXT,
    "department" TEXT,
    "employmentType" "ContractType" NOT NULL DEFAULT 'FULL_TIME',
    "status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "hireDate" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "nationalId" TEXT,
    "personalPhone" TEXT,
    "personalEmail" TEXT,
    "address" TEXT,
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "baseSalary" DECIMAL(12,2),
    "contractUrl" TEXT,
    "idCardUrl" TEXT,
    "photoUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "day_closings" (
    "id" TEXT NOT NULL,
    "branchId" TEXT,
    "businessDate" DATE NOT NULL,
    "status" "DayStatus" NOT NULL DEFAULT 'OPEN',
    "openingCash" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cashIn" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cashOut" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "expectedCash" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualCash" DECIMAL(12,2),
    "cashDifference" DECIMAL(12,2),
    "differenceNote" TEXT,
    "snapshot" JSONB,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenedById" TEXT,
    "reopenReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "lockedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "day_closings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_userId_key" ON "employee_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_employeeCode_key" ON "employee_profiles"("employeeCode");

-- CreateIndex
CREATE INDEX "employee_profiles_status_idx" ON "employee_profiles"("status");

-- CreateIndex
CREATE INDEX "employee_profiles_department_idx" ON "employee_profiles"("department");

-- CreateIndex
CREATE INDEX "day_closings_status_idx" ON "day_closings"("status");

-- CreateIndex
CREATE INDEX "day_closings_businessDate_idx" ON "day_closings"("businessDate");

-- CreateIndex
CREATE UNIQUE INDEX "day_closings_branchId_businessDate_key" ON "day_closings"("branchId", "businessDate");

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

