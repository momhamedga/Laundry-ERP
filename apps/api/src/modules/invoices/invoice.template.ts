import type { SystemSettings } from "@prisma/client";
import { PDF_FONT_FACE_CSS, PDF_FONT_STACK } from "../../lib/pdf-fonts.js";
import type { InvoiceDetail } from "./invoice.types.js";
import { AR_LOCALE } from "../../constants/locale.js";

/**
 * قالب HTML واحد مُشترَك بين Print (خام) وPDF (عبر Puppeteer) ومرفق البريد -
 * مصدر حقيقة واحد لتفادي تكرار بناء مستند الفاتورة 3 مرات (راجع القرارات المعمارية)
 */

export const INVOICE_STATUS_LABELS: Record<InvoiceDetail["status"], string> = {
  DRAFT: "مسودة",
  ISSUED: "صادرة",
  PARTIALLY_PAID: "مدفوعة جزئياً",
  PAID: "مدفوعة بالكامل",
  CANCELLED: "ملغاة",
};

const STATUS_COLORS: Record<InvoiceDetail["status"], string> = {
  DRAFT: "#64748b",
  ISSUED: "#2563eb",
  PARTIALLY_PAID: "#d97706",
  PAID: "#16a34a",
  CANCELLED: "#dc2626",
};

function formatMoney(value: unknown, currency: string): string {
  const n = Number(value);
  return `${n.toLocaleString(AR_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(AR_LOCALE, { year: "numeric", month: "long", day: "numeric" });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export interface InvoiceTemplateOptions {
  invoice: InvoiceDetail;
  company: SystemSettings;
  qrDataUrl: string;
  barcodeDataUrl: string;
}

export function buildInvoiceHtml({ invoice, company, qrDataUrl, barcodeDataUrl }: InvoiceTemplateOptions): string {
  const currency = company.defaultCurrency;
  const statusLabel = INVOICE_STATUS_LABELS[invoice.status];
  const statusColor = STATUS_COLORS[invoice.status];

  const itemsRows = invoice.items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.serviceNameSnapshot)}</td>
        <td class="num">${Number(item.quantity).toLocaleString(AR_LOCALE)}</td>
        <td class="num">${formatMoney(item.unitPrice, currency)}</td>
        <td class="num">${formatMoney(item.total, currency)}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>فاتورة ${escapeHtml(invoice.invoiceNumber)}</title>
<style>
  ${PDF_FONT_FACE_CSS}
  * { box-sizing: border-box; }
  body { font-family: ${PDF_FONT_STACK}; color: #0f172a; margin: 0; padding: 0; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
  .company img { max-height: 64px; max-width: 180px; margin-bottom: 8px; }
  .company .name { font-size: 20px; font-weight: bold; }
  .company .line { font-size: 12px; color: #475569; margin-top: 2px; }
  .invoice-meta { text-align: left; }
  .invoice-meta .num { font-size: 22px; font-weight: bold; }
  .status-badge { display: inline-block; padding: 4px 14px; border-radius: 999px; color: #fff; font-size: 13px; font-weight: bold; margin-top: 8px; background: ${statusColor}; }
  .info-grid { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
  .info-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
  .info-box h3 { margin: 0 0 8px; font-size: 12px; color: #64748b; }
  .info-box p { margin: 0; font-size: 14px; line-height: 1.6; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  table.items th { background: #0f172a; color: #fff; padding: 10px 12px; font-size: 13px; text-align: right; }
  table.items td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
  table.items td.num, table.items th.num { text-align: left; }
  .summary { display: flex; justify-content: flex-end; margin-bottom: 24px; }
  .summary table { width: 280px; border-collapse: collapse; }
  .summary td { padding: 6px 4px; font-size: 13px; }
  .summary td.label { color: #64748b; }
  .summary td.value { text-align: left; font-weight: bold; }
  .summary tr.total td { border-top: 2px solid #0f172a; padding-top: 10px; font-size: 15px; }
  .codes { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
  .codes img { height: 60px; }
  .notes { margin: 16px 0; font-size: 12px; color: #475569; }
  /** نصوص LTR (أرقام طلب/هواتف) داخل سياق RTL - isolate+nowrap يمنعان انعكاس Bidi عند التفاف السطر */
  .ltr { direction: ltr; unicode-bidi: isolate; white-space: nowrap; display: inline-block; }
</style>
</head>
<body>
  <div class="header">
    <div class="company">
      ${company.companyLogoUrl ? `<img src="${escapeHtml(company.companyLogoUrl)}" alt="logo" />` : ""}
      <div class="name">${escapeHtml(company.companyName)}</div>
      ${company.companyAddress ? `<div class="line">${escapeHtml(company.companyAddress)}</div>` : ""}
      ${company.companyPhone ? `<div class="line">هاتف: ${escapeHtml(company.companyPhone)}</div>` : ""}
      ${company.companyEmail ? `<div class="line">${escapeHtml(company.companyEmail)}</div>` : ""}
    </div>
    <div class="invoice-meta">
      <div class="num">${escapeHtml(invoice.invoiceNumber)}</div>
      <div class="status-badge">${statusLabel}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>العميل</h3>
      <p>${escapeHtml(invoice.customer.name)}</p>
      <p class="ltr">${escapeHtml(invoice.customer.phone)}</p>
    </div>
    <div class="info-box">
      <h3>الفرع</h3>
      <p>${escapeHtml(invoice.branch.name)}</p>
      ${invoice.branch.address ? `<p>${escapeHtml(invoice.branch.address)}</p>` : ""}
      ${invoice.branch.phone ? `<p class="ltr">${escapeHtml(invoice.branch.phone)}</p>` : ""}
    </div>
    <div class="info-box">
      <h3>تفاصيل الفاتورة</h3>
      <p>رقم الطلب: <strong class="ltr">${escapeHtml(invoice.order.orderNumber)}</strong></p>
      <p>تاريخ الإصدار: ${formatDate(invoice.issuedAt)}</p>
      <p>تاريخ الاستحقاق: ${formatDate(invoice.dueDate)}</p>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th>الخدمة</th>
        <th class="num">الكمية</th>
        <th class="num">سعر الوحدة</th>
        <th class="num">الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="summary">
    <table>
      <tr><td class="label">المجموع الفرعي</td><td class="value">${formatMoney(invoice.subtotal, currency)}</td></tr>
      <tr><td class="label">الخصم</td><td class="value">-${formatMoney(invoice.discount, currency)}</td></tr>
      <tr><td class="label">الضريبة</td><td class="value">${formatMoney(invoice.tax, currency)}</td></tr>
      <tr class="total"><td class="label">الإجمالي</td><td class="value">${formatMoney(invoice.total, currency)}</td></tr>
      <tr><td class="label">المدفوع</td><td class="value">${formatMoney(invoice.paidAmount, currency)}</td></tr>
      <tr><td class="label">المتبقي</td><td class="value">${formatMoney(invoice.remainingAmount, currency)}</td></tr>
    </table>
  </div>

  ${invoice.notes ? `<div class="notes">ملاحظات: ${escapeHtml(invoice.notes)}</div>` : ""}

  <div class="codes">
    <img src="${barcodeDataUrl}" alt="barcode" />
    <img src="${qrDataUrl}" alt="qrcode" />
  </div>
</body>
</html>`;
}
