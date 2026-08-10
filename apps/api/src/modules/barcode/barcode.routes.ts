import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { BarcodeController } from "./barcode.controller.js";
import {
  bulkGenerateSchema,
  createTemplateSchema,
  generateSchema,
  printSchema,
  scanSchema,
  updateBarcodeSchema,
  updateTemplateSchema,
} from "./barcode.validator.js";

/**
 * حدّ معدّل للتوليد الجماعي والمسح - عمليات متكرّرة قد تُغرق الخادم (نفس مكتبة
 * express-rate-limit المستخدمة أصلاً، بلا مكتبة جديدة).
 */
const bulkRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "طلبات جماعية كثيرة. انتظر قليلاً ثم أعد المحاولة." },
});

const scanRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300, // المسح متكرر بطبيعته - حدّ مرتفع لكل دقيقة
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "عمليات مسح كثيرة ومتلاحقة. تمهّل قليلاً." },
});

/**
 * مسارات الباركود - /api/v1/barcodes
 * barcode:view قراءة/مسح، barcode:create توليد، barcode:print طباعة، barcode:manage قوالب/حذف
 */
export function createBarcodeRouter(controller: BarcodeController): Router {
  const router = Router();
  router.use(authenticate);

  // ---- Dashboard ----
  router.get("/stats", requirePermission("barcode:view"), controller.stats);
  router.get("/random-sku", requirePermission("barcode:create"), controller.randomSku);

  // ---- Scan / Lookup ----
  router.get("/lookup", requirePermission("barcode:view"), controller.lookup);
  router.post("/scan", requirePermission("barcode:view"), scanRateLimiter, validateBody(scanSchema), controller.scan);
  router.get("/scans", requirePermission("barcode:view"), controller.scanHistory);

  // ---- Print ----
  router.post("/print", requirePermission("barcode:print"), validateBody(printSchema), controller.print);
  router.get("/print-history", requirePermission("barcode:view"), controller.printHistory);

  // ---- Bulk generate ----
  router.post(
    "/bulk-generate",
    requirePermission("barcode:create"),
    bulkRateLimiter,
    validateBody(bulkGenerateSchema),
    controller.bulkGenerate,
  );

  // ---- Templates ----
  router.get("/templates", requirePermission("barcode:view"), controller.listTemplates);
  router.post("/templates", requirePermission("barcode:manage"), validateBody(createTemplateSchema), controller.createTemplate);
  router.get("/templates/:id", requirePermission("barcode:view"), controller.getTemplate);
  router.patch("/templates/:id", requirePermission("barcode:manage"), validateBody(updateTemplateSchema), controller.updateTemplate);
  router.delete("/templates/:id", requirePermission("barcode:manage"), controller.deleteTemplate);

  // ---- Per-item barcode ----
  router.post("/items/:id/generate", requirePermission("barcode:create"), validateBody(generateSchema), controller.generate);
  router.post("/items/:id/regenerate", requirePermission("barcode:create"), validateBody(generateSchema), controller.regenerate);
  router.patch("/items/:id", requirePermission("barcode:manage"), validateBody(updateBarcodeSchema), controller.update);
  router.delete("/items/:id", requirePermission("barcode:manage"), controller.remove);

  return router;
}
