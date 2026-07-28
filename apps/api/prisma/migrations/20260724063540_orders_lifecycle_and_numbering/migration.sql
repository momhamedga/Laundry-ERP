-- =====================================================================
-- Orders Module: full lifecycle, formatted order numbers, item discount,
-- and order status history
-- =====================================================================

-- 1) OrderStatus: full laundry lifecycle (remove IN_PROGRESS - unused by any row)
CREATE TYPE "OrderStatus_new" AS ENUM ('RECEIVED', 'INSPECTING', 'WASHING', 'DRYING', 'IRONING', 'PACKING', 'READY', 'DELIVERED', 'CANCELLED');
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'RECEIVED';

-- 2) orderNumber: Int autoincrement -> String "ORD-YYYY-000001"
--    existing rows are reformatted using their receivedAt year
ALTER TABLE "orders" ALTER COLUMN "orderNumber" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "orderNumber" TYPE TEXT
  USING ('ORD-' || to_char("receivedAt", 'YYYY') || '-' || lpad("orderNumber"::text, 6, '0'));
DROP SEQUENCE IF EXISTS "orders_orderNumber_seq";

-- 3) OrderItem: per-item discount
ALTER TABLE "order_items" ADD COLUMN "discount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- 4) Order Status History
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "oldStatus" "OrderStatus",
    "newStatus" "OrderStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_status_history_orderId_idx" ON "order_status_history"("orderId");

ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changedById_fkey"
  FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
