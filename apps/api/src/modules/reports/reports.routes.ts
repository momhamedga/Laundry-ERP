import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import type { ReportsController } from "./reports.controller.js";
import type { BarcodeReportsController } from "./reports.barcode.controller.js";
import type { InventoryReportsController } from "./reports.inventory.controller.js";
import type { LoyaltyReportsController } from "./reports.loyalty.controller.js";

/**
 * مسارات التقارير - /api/v1/reports
 * reports:view → ADMIN, MANAGER (نفس صلاحية Dashboard الحالية، بلا صلاحية جديدة)
 * قراءة فقط - لا تُسجَّل في AuditLog
 */
export function createReportsRouter(
  controller: ReportsController,
  inventory: InventoryReportsController,
  barcode: BarcodeReportsController,
  loyalty: LoyaltyReportsController,
): Router {
  const router = Router();

  router.use(authenticate);
  router.use(requirePermission("reports:view"));

  router.get("/orders", controller.orders);
  router.get("/payments", controller.payments);
  router.get("/customers", controller.customers);
  router.get("/services", controller.services);
  router.get("/branches", controller.branches);
  router.get("/employees", controller.employees);

  // Phase 7 - تقارير المخزون (مدمجة، نفس صلاحية reports:view)
  router.get("/inventory", inventory.inventory);
  router.get("/inventory-movements", inventory.movements);
  router.get("/inventory-suppliers", inventory.suppliers);
  router.get("/inventory-purchases", inventory.purchases);
  router.get("/inventory-stock-value", inventory.stockValue);

  // Phase 8 - تقارير الباركود (نفس صلاحية reports:view)
  router.get("/barcode-most-scanned", barcode.mostScanned);
  router.get("/barcode-print-history", barcode.printHistory);
  router.get("/barcode-missing", barcode.missing);
  router.get("/barcode-invalid", barcode.invalid);
  router.get("/barcode-unused", barcode.unused);

  // Phase 9 - تقارير الولاء/الكوبونات/العضوية
  router.get("/loyalty-top-customers", loyalty.topCustomers);
  router.get("/loyalty-points-balance", loyalty.pointsBalance);
  router.get("/loyalty-points-history", loyalty.pointsHistory);
  router.get("/loyalty-expired-points", loyalty.expiredPoints);
  router.get("/loyalty-referral", loyalty.referral);
  router.get("/coupon-usage", loyalty.couponUsage);
  router.get("/coupon-performance", loyalty.couponPerformance);
  router.get("/membership-distribution", loyalty.membershipDistribution);

  return router;
}
