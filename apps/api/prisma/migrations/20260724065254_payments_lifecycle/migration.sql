-- =====================================================================
-- Payments Module: spec-compliant methods, per-payment status,
-- cumulative refunds, and payment audit actions
-- =====================================================================

-- 1) PaymentMethod values per spec (table is empty - rename is safe)
ALTER TYPE "PaymentMethod" RENAME VALUE 'TRANSFER' TO 'BANK_TRANSFER';
ALTER TYPE "PaymentMethod" RENAME VALUE 'WALLET' TO 'MOBILE_WALLET';

-- 2) Per-payment status (distinct from the order-level PaymentStatus)
CREATE TYPE "PaymentTxStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- 3) Payment columns (payments table is empty - NOT NULL without backfill is safe)
ALTER TABLE "payments" ADD COLUMN "status" "PaymentTxStatus" NOT NULL DEFAULT 'COMPLETED';
ALTER TABLE "payments" ADD COLUMN "refundedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "payments" ADD COLUMN "notes" TEXT;
ALTER TABLE "payments" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL;
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- 4) Audit actions for payment operations
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_REFUNDED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_CANCELLED';
