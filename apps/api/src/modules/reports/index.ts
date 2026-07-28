import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { SettingsRepository } from "../settings/index.js";
import { ReportExportController } from "./report-export.controller.js";
import { ReportExportService } from "./report-export.service.js";
import { ReportPdfService } from "./report-pdf.service.js";
import { createReportExportRouter } from "./report-export.routes.js";
import { ReportsController } from "./reports.controller.js";
import { BarcodeReportsController } from "./reports.barcode.controller.js";
import { InventoryReportsController } from "./reports.inventory.controller.js";
import { LoyaltyReportsController } from "./reports.loyalty.controller.js";
import { ReportsRepository } from "./reports.repository.js";
import { createReportsRouter } from "./reports.routes.js";
import { ReportsService } from "./reports.service.js";

/**
 * Composition Root لوحدة التقارير
 * تصدير التقارير (Phase 5) يُركَّب هنا كراوتر فرعي تحت /export - يرث
 * authenticate + requirePermission("reports:view") من الراوتر الأب تلقائياً،
 * بلا أي تعديل على app.ts أو reports.routes.ts الحاليين.
 */
export function buildReportsModule(): Router {
  const repository = new ReportsRepository(prisma);
  const service = new ReportsService(repository);
  const controller = new ReportsController(service);
  const inventoryController = new InventoryReportsController(repository);
  const barcodeController = new BarcodeReportsController(repository);
  const loyaltyController = new LoyaltyReportsController(repository);
  const router = createReportsRouter(controller, inventoryController, barcodeController, loyaltyController);

  const settingsRepository = new SettingsRepository(prisma);
  const exportService = new ReportExportService(repository);
  const pdfService = new ReportPdfService(exportService);
  const exportController = new ReportExportController(exportService, pdfService, settingsRepository, repository);
  router.use("/export", createReportExportRouter(exportController));

  return router;
}

export { ReportsService } from "./reports.service.js";
export type {
  BranchesReportResult,
  CustomersReportResult,
  EmployeesReportResult,
  OrdersReportResult,
  PaymentsReportResult,
  ServicesReportResult,
} from "./reports.types.js";
