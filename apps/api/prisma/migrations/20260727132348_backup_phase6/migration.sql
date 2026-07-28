-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "BackupProvider" AS ENUM ('LOCAL', 'S3', 'R2', 'BACKBLAZE');

-- CreateEnum
CREATE TYPE "BackupTrigger" AS ENUM ('MANUAL', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "BackupScheduleFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'BACKUP_RESTORED';
ALTER TYPE "AuditAction" ADD VALUE 'BACKUP_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'BACKUP_RETRIED';
ALTER TYPE "AuditAction" ADD VALUE 'BACKUP_SETTINGS_UPDATED';

-- CreateTable
CREATE TABLE "backup_records" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "provider" "BackupProvider" NOT NULL DEFAULT 'LOCAL',
    "trigger" "BackupTrigger" NOT NULL DEFAULT 'MANUAL',
    "status" "BackupStatus" NOT NULL DEFAULT 'PENDING',
    "storagePath" TEXT,
    "sizeBytes" INTEGER,
    "checksum" TEXT,
    "appVersion" TEXT,
    "compressed" BOOLEAN NOT NULL DEFAULT false,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "counts" JSONB,
    "durationMs" INTEGER,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "backup_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "provider" "BackupProvider" NOT NULL DEFAULT 'LOCAL',
    "compressionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "encryptionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "keepLastN" INTEGER NOT NULL DEFAULT 10,
    "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scheduleFrequency" "BackupScheduleFrequency" NOT NULL DEFAULT 'DAILY',
    "scheduleTime" TEXT NOT NULL DEFAULT '02:00',
    "scheduleTimezone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "scheduleRetryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "backup_records_status_idx" ON "backup_records"("status");

-- CreateIndex
CREATE INDEX "backup_records_createdAt_idx" ON "backup_records"("createdAt");

-- CreateIndex
CREATE INDEX "backup_records_deletedAt_idx" ON "backup_records"("deletedAt");

-- AddForeignKey
ALTER TABLE "backup_records" ADD CONSTRAINT "backup_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
