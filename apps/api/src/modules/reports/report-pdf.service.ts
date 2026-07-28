import type { SystemSettings } from "@prisma/client";
import { renderHtmlToPdf } from "../../lib/pdf.js";
import type { ExportQuery } from "./export.validator.js";
import {
  buildFilterLines,
  getReportColumns,
  getReportTitle,
  MAX_DOCUMENT_EXPORT_ROWS,
  type ReportExportService,
} from "./report-export.service.js";
import { buildReportFooterTemplate, buildReportHtml } from "./report.template.js";

/**
 * PDF/Print للتقارير - يُعيد استخدام lib/pdf.ts المشترك حرفياً (بلا متصفح جديد،
 * بلا تكرار كود invoice.pdf) + report.template.ts لبناء HTML. المستند بالكامل
 * يُبنى بالذاكرة دفعة واحدة (قيد Puppeteer/HTML الحقيقي غير القابل للتدفّق -
 * راجع "القيود" بالتقرير النهائي) لذا سقف صفوف أشد صرامة من CSV/Excel.
 */
export class ReportPdfService {
  constructor(private readonly exportService: ReportExportService) {}

  private async buildHtml(
    query: ExportQuery,
    company: SystemSettings,
    generatedByName: string,
  ): Promise<string> {
    const [{ rows, truncated }, totals] = await Promise.all([
      this.exportService.collectRowsForDocument(query),
      this.exportService.getTotals(query),
    ]);

    return buildReportHtml({
      title: getReportTitle(query.type),
      company,
      generatedAt: new Date(),
      generatedByName,
      filterLines: buildFilterLines(query),
      columns: getReportColumns(query.type),
      rows,
      totals,
      landscape: true, // جداول التقارير عريضة الأعمدة دائماً - Landscape ثابت لكل الأنواع الستة
      truncationNote: truncated
        ? `تم عرض أول ${MAX_DOCUMENT_EXPORT_ROWS.toLocaleString("ar-EG")} صف فقط - استخدم تصدير CSV أو Excel للحصول على البيانات الكاملة`
        : undefined,
    });
  }

  /** PDF حقيقي عبر Puppeteer المشترك - Landscape + ترقيم صفحات حقيقي (footerTemplate) */
  async renderPdf(query: ExportQuery, company: SystemSettings, generatedByName: string): Promise<Buffer> {
    const html = await this.buildHtml(query, company, generatedByName);
    return renderHtmlToPdf(html, { landscape: true, footerTemplate: buildReportFooterTemplate() });
  }

  /** HTML خام لـwindow.print() بالواجهة - بلا Puppeteer إطلاقاً (نفس نمط invoice print) */
  async renderPrintHtml(query: ExportQuery, company: SystemSettings, generatedByName: string): Promise<string> {
    return this.buildHtml(query, company, generatedByName);
  }
}
