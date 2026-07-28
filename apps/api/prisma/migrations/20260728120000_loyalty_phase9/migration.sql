-- CreateEnum
CREATE TYPE "LoyaltyTxType" AS ENUM ('EARN', 'REDEEM', 'REVERSE', 'EXPIRE', 'ADJUST', 'BONUS', 'WELCOME', 'BIRTHDAY', 'REFERRAL');

-- CreateEnum
CREATE TYPE "LoyaltyTxSource" AS ENUM ('ORDER', 'INVOICE', 'MANUAL', 'CAMPAIGN', 'REFERRAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "LoyaltyEarnMode" AS ENUM ('FIXED_PER_ORDER', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "MembershipLevel" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('FIXED', 'PERCENTAGE', 'FREE_SERVICE', 'FREE_DELIVERY', 'GIFT', 'REFERRAL', 'BIRTHDAY');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('BONUS', 'WELCOME', 'BIRTHDAY', 'REFERRAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'LOYALTY_POINTS_EARNED';
ALTER TYPE "AuditAction" ADD VALUE 'LOYALTY_POINTS_REDEEMED';
ALTER TYPE "AuditAction" ADD VALUE 'LOYALTY_POINTS_REVERSED';
ALTER TYPE "AuditAction" ADD VALUE 'LOYALTY_POINTS_EXPIRED';
ALTER TYPE "AuditAction" ADD VALUE 'LOYALTY_POINTS_ADJUSTED';
ALTER TYPE "AuditAction" ADD VALUE 'LOYALTY_SETTINGS_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_UPGRADED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_DOWNGRADED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_TIER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'COUPON_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'COUPON_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'COUPON_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'COUPON_REDEEMED';
ALTER TYPE "AuditAction" ADD VALUE 'CAMPAIGN_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CAMPAIGN_UPDATED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'POINTS_EARNED';
ALTER TYPE "NotificationType" ADD VALUE 'POINTS_REDEEMED';
ALTER TYPE "NotificationType" ADD VALUE 'POINTS_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE 'MEMBERSHIP_UPGRADED';
ALTER TYPE "NotificationType" ADD VALUE 'MEMBERSHIP_DOWNGRADED';
ALTER TYPE "NotificationType" ADD VALUE 'COUPON_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'COUPON_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE 'COUPON_USED';

-- CreateTable
CREATE TABLE "loyalty_accounts" (
    "id" TEXT NOT NULL,
    "currentPoints" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "redeemedPoints" INTEGER NOT NULL DEFAULT 0,
    "expiredPoints" INTEGER NOT NULL DEFAULT 0,
    "membershipLevel" "MembershipLevel" NOT NULL DEFAULT 'BRONZE',
    "levelSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,

    CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_transactions" (
    "id" TEXT NOT NULL,
    "type" "LoyaltyTxType" NOT NULL,
    "source" "LoyaltyTxSource" NOT NULL DEFAULT 'SYSTEM',
    "points" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3),
    "reversed" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT NOT NULL,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "earnMode" "LoyaltyEarnMode" NOT NULL DEFAULT 'PERCENTAGE',
    "pointsPerCurrency" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "minOrderForPoints" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxPointsPerOrder" INTEGER,
    "redeemValue" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "minPointsToRedeem" INTEGER NOT NULL DEFAULT 0,
    "pointExpiryDays" INTEGER,
    "welcomeBonus" INTEGER NOT NULL DEFAULT 0,
    "birthdayBonus" INTEGER NOT NULL DEFAULT 0,
    "referralBonus" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_tier_configs" (
    "id" TEXT NOT NULL,
    "level" "MembershipLevel" NOT NULL,
    "minLifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "extraPointsPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "priority" BOOLEAN NOT NULL DEFAULT false,
    "freeService" BOOLEAN NOT NULL DEFAULT false,
    "benefits" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_tier_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "type" "CouponType" NOT NULL DEFAULT 'PERCENTAGE',
    "value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxDiscount" DECIMAL(10,2),
    "minOrder" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "usagePerCustomer" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "allowedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedServices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedCustomers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "membershipLevels" "MembershipLevel"[] DEFAULT ARRAY[]::"MembershipLevel"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" TEXT NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "reversed" BOOLEAN NOT NULL DEFAULT false,
    "orderId" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "couponId" TEXT NOT NULL,
    "customerId" TEXT,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CampaignType" NOT NULL DEFAULT 'BONUS',
    "points" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "membershipLevels" "MembershipLevel"[] DEFAULT ARRAY[]::"MembershipLevel"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_accounts_customerId_key" ON "loyalty_accounts"("customerId");

-- CreateIndex
CREATE INDEX "loyalty_accounts_membershipLevel_idx" ON "loyalty_accounts"("membershipLevel");

-- CreateIndex
CREATE INDEX "loyalty_transactions_customerId_createdAt_idx" ON "loyalty_transactions"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "loyalty_transactions_type_idx" ON "loyalty_transactions"("type");

-- CreateIndex
CREATE INDEX "loyalty_transactions_orderId_idx" ON "loyalty_transactions"("orderId");

-- CreateIndex
CREATE INDEX "loyalty_transactions_expiresAt_idx" ON "loyalty_transactions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "membership_tier_configs_level_key" ON "membership_tier_configs"("level");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_isActive_idx" ON "coupons"("isActive");

-- CreateIndex
CREATE INDEX "coupons_type_idx" ON "coupons"("type");

-- CreateIndex
CREATE INDEX "coupon_redemptions_couponId_createdAt_idx" ON "coupon_redemptions"("couponId", "createdAt");

-- CreateIndex
CREATE INDEX "coupon_redemptions_customerId_idx" ON "coupon_redemptions"("customerId");

-- CreateIndex
CREATE INDEX "coupon_redemptions_orderId_idx" ON "coupon_redemptions"("orderId");

-- CreateIndex
CREATE INDEX "campaigns_isActive_idx" ON "campaigns"("isActive");

-- CreateIndex
CREATE INDEX "campaigns_type_idx" ON "campaigns"("type");

-- AddForeignKey
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

