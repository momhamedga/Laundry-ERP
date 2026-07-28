import { apiClient } from "@/lib/axios";
import { openBlobInNewTab } from "@/lib/open-blob";
import type {
  AnyExportFilters,
  ExportFiltersByType,
  ExportReportType,
} from "@/types/report-export";

/**
 * خدمة تصدير التقارير - تستدعي /reports/export/{csv|excel|pdf|print}. تعيد
 * استخدام نفس أنماط التنزيل القائمة بالمشروع حرفياً: تحليل Content-Disposition
 * + createObjectURL + نقرة رابط (كـdownloadInvoice) للتنزيل، وopenBlobInNewTab
 * (كمستندات الفاتورة) للعرض/الطباعة. لا منطق جديد.
 */

/** يبني معاملات الاستعلام: النوع + الفلاتر الفعّالة فقط (يُسقِط undefined/فارغ وpage/limit) */
function buildExportParams(
  type: ExportReportType,
  filters: AnyExportFilters,
): Record<string, string> {
  const params: Record<string, string> = { type };
  for (const [key, value] of Object.entries(filters)) {
    // page/limit لا معنى لهما بالتصدير (كل الصفوف تُصدَّر) - نُسقِطهما صراحة
    if (key === "page" || key === "limit") continue;
    if (value !== undefined && value !== "") params[key] = String(value);
  }
  return params;
}

/** يستخرج اسم الملف من Content-Disposition، أو يبني اسماً افتراضياً مطابقاً لنمط الخادم */
function resolveFilename(disposition: string | undefined, fallback: string): string {
  const match = disposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

/** تنزيل إجباري لـBlob باسم ملف - نفس نمط downloadInvoice حرفياً */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** GET /reports/export/csv - تنزيل ملف .csv (UTF-8 BOM، آمن للعربية بExcel) */
export async function exportReportCsv<T extends ExportReportType>(
  type: T,
  filters: ExportFiltersByType[T],
): Promise<void> {
  const response = await apiClient.get<Blob>("/reports/export/csv", {
    params: buildExportParams(type, filters),
    responseType: "blob",
  });
  const disposition = response.headers["content-disposition"] as string | undefined;
  triggerDownload(response.data, resolveFilename(disposition, `${type}-report.csv`));
}

/** GET /reports/export/excel - تنزيل ملف .xlsx */
export async function exportReportExcel<T extends ExportReportType>(
  type: T,
  filters: ExportFiltersByType[T],
): Promise<void> {
  const response = await apiClient.get<Blob>("/reports/export/excel", {
    params: buildExportParams(type, filters),
    responseType: "blob",
  });
  const disposition = response.headers["content-disposition"] as string | undefined;
  triggerDownload(response.data, resolveFilename(disposition, `${type}-report.xlsx`));
}

/** GET /reports/export/pdf - عرض PDF بتبويب جديد (inline) */
export async function exportReportPdf<T extends ExportReportType>(
  type: T,
  filters: ExportFiltersByType[T],
): Promise<void> {
  const response = await apiClient.get<Blob>("/reports/export/pdf", {
    params: buildExportParams(type, filters),
    responseType: "blob",
  });
  openBlobInNewTab(response.data);
}

/** GET /reports/export/print - HTML جاهز للطباعة، يُفتح بتبويب جديد ويستدعي window.print تلقائياً */
export async function exportReportPrint<T extends ExportReportType>(
  type: T,
  filters: ExportFiltersByType[T],
): Promise<void> {
  const response = await apiClient.get<Blob>("/reports/export/print", {
    params: buildExportParams(type, filters),
    responseType: "blob",
  });
  openBlobInNewTab(response.data, true);
}
