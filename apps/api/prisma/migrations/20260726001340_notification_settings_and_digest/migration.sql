-- CreateEnum
CREATE TYPE "DigestMode" AS ENUM ('INSTANT', 'HOURLY', 'DAILY', 'WEEKLY');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TEST';

-- CreateTable
CREATE TABLE "user_notification_settings" (
    "id" TEXT NOT NULL,
    "globalInApp" BOOLEAN NOT NULL DEFAULT true,
    "globalEmail" BOOLEAN NOT NULL DEFAULT true,
    "globalSms" BOOLEAN NOT NULL DEFAULT true,
    "globalWhatsapp" BOOLEAN NOT NULL DEFAULT true,
    "globalPush" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "quietHoursTimezone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
    "digestMode" "DigestMode" NOT NULL DEFAULT 'INSTANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "user_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_settings_userId_key" ON "user_notification_settings"("userId");

-- AddForeignKey
ALTER TABLE "user_notification_settings" ADD CONSTRAINT "user_notification_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
