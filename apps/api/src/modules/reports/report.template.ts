import type { SystemSettings } from "@prisma/client";
import { PDF_FONT_FACE_CSS, PDF_FONT_STACK } from "../../lib/pdf-fonts.js";

/**
 * قالب HTML مشترك بين PDF (عبر lib/pdf.ts المُعاد استخدامه) وPrint (HTML خام) -
 * مصدر حقيقة واحد لمستند التقرير، بنفس أسلوب invoice.template.ts حرفياً
 * (خطّ مضمَّن مشترك, RTL, escapeHtml, صناديق معلومات، جدول، ملخص) لاتساق بصري
 * عبر كل مستندات المشروع.
 */

export interface ReportColumn {
  key: string;
  label: string;
  align?: "start" | "end";
}

export interface ReportTotal {
  label: string;
  value: string;
}

export interface ReportTemplateOptions {
  title: string;
  company: SystemSettings;
  generatedAt: Date;
  generatedByName: string;
  /** أسطر وصفية جاهزة للفلاتر المُطبَّقة - "الكل" إن لم تُطبَّق فلاتر */
  filterLines: string[];
  columns: ReportColumn[];
  /** صفوف جاهزة كنصوص مُنسَّقة مسبقاً (Service يتولى التنسيق - القالب للعرض فقط) */
  rows: Record<string, string>[];
  totals: ReportTotal[];
  /** landscape قرار عرض فقط - لا يُغيّر بيانات */
  landscape: boolean;
  /** ملاحظة صادقة عند تطبيق حدّ أقصى لعدد الصفوف بمستندات PDF/Print (راجع القيود بالتقرير) */
  truncationNote?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDateTime(value: Date): string {
  return value.toLocaleString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildReportHtml({
  title,
  company,
  generatedAt,
  generatedByName,
  filterLines,
  columns,
  rows,
  totals,
  landscape,
  truncationNote,
}: ReportTemplateOptions): string {
  const headerCells = columns
    .map((c) => `<th class="${c.align === "end" ? "num" : ""}">${escapeHtml(c.label)}</th>`)
    .join("");

  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map((c) => `<td class="${c.align === "end" ? "num" : ""}">${escapeHtml(row[c.key] ?? "—")}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const totalsRow =
    totals.length > 0
      ? `<div class="totals"><table>${totals
          .map((t) => `<tr><td class="label">${escapeHtml(t.label)}</td><td class="value">${escapeHtml(t.value)}</td></tr>`)
          .join("")}</table></div>`
      : "";

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  ${PDF_FONT_FACE_CSS}
  * { box-sizing: border-box; }
  body { font-family: ${PDF_FONT_STACK}; color: #0f172a; margin: 0; padding: 0; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
  .company img { max-height: 56px; max-width: 160px; margin-bottom: 6px; }
  .company .name { font-size: 18px; font-weight: bold; }
  .company .line { font-size: 11px; color: #475569; margin-top: 2px; }
  .report-meta { text-align: left; }
  .report-meta .title { font-size: 20px; font-weight: bold; }
  .report-meta .line { font-size: 11px; color: #475569; margin-top: 4px; }
  .filters { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 18px; font-size: 12px; color: #334155; }
  .filters strong { color: #0f172a; }
  table.data { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  table.data th { background: #0f172a; color: #fff; padding: 8px 10px; font-size: 11.5px; text-align: right; }
  table.data td { padding: 7px 10px; font-size: 11.5px; border-bottom: 1px solid #e2e8f0; }
  table.data td.num, table.data th.num { text-align: left; }
  table.data tr:nth-child(even) { background: #f8fafc; }
  .totals { display: flex; justify-content: flex-end; margin-bottom: 12px; }
  .totals table { width: 320px; border-collapse: collapse; }
  .totals td { padding: 5px 4px; font-size: 12.5px; }
  .totals td.label { color: #64748b; }
  .totals td.value { text-align: left; font-weight: bold; }
  .truncation-note { font-size: 11px; color: #b45309; background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; margin-bottom: 14px; }
  .ltr { direction: ltr; unicode-bidi: isolate; white-space: nowrap; display: inline-block; }
</style>
</head>
<body>
  <div class="header">
    <div class="company">
      ${company.companyLogoUrl ? `<img src="${escapeHtml(company.companyLogoUrl)}" alt="logo" />` : ""}
      <div class="name">${escapeHtml(company.companyName)}</div>
      ${company.companyAddress ? `<div class="line">${escapeHtml(company.companyAddress)}</div>` : ""}
    </div>
    <div class="report-meta">
      <div class="title">${escapeHtml(title)}</div>
      <div class="line">أُنشئ بواسطة ${escapeHtml(generatedByName)}</div>
      <div class="line">${formatDateTime(generatedAt)}</div>
    </div>
  </div>

  <div class="filters">
    <strong>الفلاتر المُطبَّقة:</strong> ${filterLines.length > 0 ? escapeHtml(filterLines.join(" | ")) : "بلا فلاتر (كل البيانات)"}
  </div>

  ${truncationNote ? `<div class="truncation-note">${escapeHtml(truncationNote)}</div>` : ""}

  <table class="data">
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>

  ${totalsRow}
</body>
</html>`;
}

/** Footer الحقيقي لـPuppeteer (span.pageNumber/totalPages مُدارتان داخلياً بكروميوم - راجع lib/pdf.ts) */
export function buildReportFooterTemplate(): string {
  return `<div style="width:100%; font-size:9px; color:#64748b; text-align:center; padding-top:4px;">
    صفحة <span class="pageNumber"></span> من <span class="totalPages"></span>
  </div>`;
}
