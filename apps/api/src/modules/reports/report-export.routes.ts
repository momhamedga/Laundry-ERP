import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import type { ReportExportController } from "./report-export.controller.js";

/**
 * مسارات تصدير التقارير - /api/v1/reports/export/*
 * تُركَّب داخل createReportsRouter الحالي (بعد authenticate+requirePermission("reports:view")
 * المُطبَّقتين هناك بالفعل) - لا صلاحية جديدة، لا تعديل على app.ts.
 *
 * Rate Limit: توليد Excel/PDF لآلاف الصفوف عملية مكلفة (Puppeteer/exceljs) -
 * حدّ صارم يحمي الخادم من إغراق طلبات تصدير متزامنة (نفس مكتبة express-rate-limit
 * المُستخدَمة أصلاً بـauth.middleware.ts - بلا مكتبة جديدة).
 */
const exportRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many export requests. Try again later" },
});

export function createReportExportRouter(controller: ReportExportController): Router {
  const router = Router();

  router.use(exportRateLimiter);
  // reports:view تُطبَّق بالفعل على مستوى الراوتر الأب (createReportsRouter) - لا تكرار هنا

  router.get("/csv", controller.exportCsv);
  router.get("/excel", controller.exportExcel);
  router.get("/pdf", controller.exportPdf);
  router.get("/print", controller.exportPrint);

  return router;
}
