-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'SETTINGS_UPDATED';

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "companyName" TEXT NOT NULL DEFAULT 'Laundry ERP',
    "companyEmail" TEXT,
    "companyPhone" TEXT,
    "companyAddress" TEXT,
    "companyLogoUrl" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'EGP',
    "defaultTimezone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'ar',
    "defaultTheme" TEXT NOT NULL DEFAULT 'system',
    "rtlEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "timeFormat" TEXT NOT NULL DEFAULT '24h',
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inAppNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "passwordExpirationDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);
