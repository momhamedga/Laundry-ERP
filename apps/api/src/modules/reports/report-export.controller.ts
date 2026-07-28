import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { getRequestContext } from "../auth/auth.utils.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type { SettingsRepository } from "../settings/index.js";
import { exportQuerySchema, type ExportQuery } from "./export.validator.js";
import type { ReportExportService } from "./report-export.service.js";
import { getReportTitle } from "./report-export.service.js";
import type { ReportPdfService } from "./report-pdf.service.js";
import type { ReportsRepository } from "./reports.repository.js";

/** يضمن وجود req.user - تُستدعى فقط بعد authenticate */
function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "Authentication required");
  return req.user;
}

function parseExportQuery(req: Request): ExportQuery {
  return exportQuerySchema.parse(req.query);
}

function buildFilename(query: ExportQuery, ext: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${query.type}-report-${date}.${ext}`;
}

export class ReportExportController {
  constructor(
    private readonly exportService: ReportExportService,
    private readonly pdfService: ReportPdfService,
    private readonly settingsRepo: SettingsRepository,
    /** لتسجيل Audit فقط - يُعيد استخدام repository التقارير الحالي (نفس نمط الوحدات الأخرى) */
    private readonly reportsRepo: ReportsRepository,
  ) {}

  private async audit(req: Request, query: ExportQuery, format: string, rowCount: number): Promise<void> {
    await this.reportsRepo.createAuditLog({
      action: "REPORT_EXPORTED",
      userId: requireUser(req).id,
      ipAddress: getRequestContext(req).ipAddress,
      userAgent: getRequestContext(req).userAgent,
      metadata: { reportType: query.type, format, rowCount, filters: query },
    });
  }

  /** GET /reports/export/csv - تدفّق مباشر (Streaming) - UTF-8 BOM، آمن للعربية */
  exportCsv: RequestHandler = asyncHandler(async (req, res) => {
    const query = parseExportQuery(req);
    const filename = buildFilename(query, "csv");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const rowCount = await this.exportService.writeCsv(res, query);
    res.end();
    await this.audit(req, query, "csv", rowCount);
  });

  /** GET /reports/export/excel - exceljs Streaming Writer مباشرة للاستجابة */
  exportExcel: RequestHandler = asyncHandler(async (req, res) => {
    const query = parseExportQuery(req);
    const filename = buildFilename(query, "xlsx");
    const company = await this.settingsRepo.getOrCreate();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const rowCount = await this.exportService.writeExcel(res, query, company.companyName);
    await this.audit(req, query, "excel", rowCount);
  });

  /** GET /reports/export/pdf - عبر Puppeteer المشترك (lib/pdf.ts) - عرض مباشر (inline) */
  exportPdf: RequestHandler = asyncHandler(async (req, res) => {
    const query = parseExportQuery(req);
    const actor = requireUser(req);
    const filename = buildFilename(query, "pdf");
    const company = await this.settingsRepo.getOrCreate();

    const buffer = await this.pdfService.renderPdf(query, company, actor.email);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.status(200).send(buffer);
    await this.audit(req, query, "pdf", buffer.length);
  });

  /** GET /reports/export/print - HTML خام لـwindow.print() بالواجهة - بلا Puppeteer */
  exportPrint: RequestHandler = asyncHandler(async (req, res) => {
    const query = parseExportQuery(req);
    const actor = requireUser(req);
    const company = await this.settingsRepo.getOrCreate();

    const html = await this.pdfService.renderPrintHtml(query, company, actor.email);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
    await this.audit(req, query, "print", 0);
  });
}

// إعادة تصدير مفيدة لملفات الاختبار/التوصيل بلا استيراد إضافي
export { getReportTitle };
