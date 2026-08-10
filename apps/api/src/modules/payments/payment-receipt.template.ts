import { Prisma } from "@prisma/client";
import type { PaymentMethod, PaymentTxStatus, SystemSettings } from "@prisma/client";
import { PDF_FONT_FACE_CSS, PDF_FONT_STACK } from "../../lib/pdf-fonts.js";
import type { PaymentRow } from "./payments.types.js";

/**
 * قالب HTML مُصغَّر لإيصال دفع - أصغر من مستند الفاتورة (نصف صفحة). يُستهلَك
 * من مسار الطباعة (HTML خام) وPDF (عبر محرّك lib/pdf المشترك). ملخص الرصيد
 * بدلالة الطلب (Order) لا الفاتورة - الإيصال مرتبط بالطلب فيتفادى لبس الضريبة.
 */

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "نقدي",
  CARD: "بطاقة",
  BANK_TRANSFER: "تحويل بنكي",
  MOBILE_WALLET: "محفظة إلكترونية",
};

const STATUS_LABELS: Record<PaymentTxStatus, string> = {
  PENDING: "قيد الانتظار",
  COMPLETED: "مكتملة",
  FAILED: "فشلت",
  CANCELLED: "ملغاة",
  REFUNDED: "مستردة",
};

const STATUS_COLORS: Record<PaymentTxStatus, string> = {
  PENDING: "#d97706",
  COMPLETED: "#16a34a",
  FAILED: "#dc2626",
  CANCELLED: "#64748b",
  REFUNDED: "#2563eb",
};

function formatMoney(value: Prisma.Decimal | string | number, currency: string): string {
  const n = Number(value);
  return `${n.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function formatDateTime(value: Date): string {
  return new Date(value).toLocaleString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildPaymentReceiptHtml(payment: PaymentRow, company: SystemSettings): string {
  const currency = company.defaultCurrency;
  const statusLabel = STATUS_LABELS[payment.status];
  const statusColor = STATUS_COLORS[payment.status];
  const receiptRef = payment.reference ?? payment.id.slice(0, 12);

  const orderTotal = payment.order.total;
  const orderPaid = payment.order.paidAmount;
  const orderRemaining = Prisma.Decimal.max(orderTotal.sub(orderPaid), new Prisma.Decimal(0));

  const netAmount = payment.amount.sub(payment.refundedAmount);

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>إيصال دفع ${escapeHtml(receiptRef)}</title>
<style>
  ${PDF_FONT_FACE_CSS}
  * { box-sizing: border-box; }
  body { font-family: ${PDF_FONT_STACK}; color: #0f172a; margin: 0; padding: 0; }
  .receipt { max-width: 480px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
  .header img { max-height: 48px; max-width: 140px; margin-bottom: 6px; }
  .header .name { font-size: 18px; font-weight: bold; }
  .header .line { font-size: 11px; color: #475569; margin-top: 1px; }
  .title { text-align: center; font-size: 15px; font-weight: bold; margin: 8px 0 16px; }
  .status-badge { display: inline-block; padding: 3px 12px; border-radius: 999px; color: #fff; font-size: 12px; font-weight: bold; background: ${statusColor}; }
  table.info { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  table.info td { padding: 7px 10px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
  table.info td.label { color: #64748b; width: 40%; }
  table.info td.value { font-weight: bold; text-align: left; }
  .amount-box { text-align: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 16px; }
  .amount-box .amt { font-size: 26px; font-weight: bold; color: ${statusColor}; }
  .amount-box .cap { font-size: 12px; color: #64748b; margin-top: 2px; }
  .summary { border-top: 1px dashed #cbd5e1; padding-top: 12px; }
  .summary .row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
  .summary .row .lbl { color: #64748b; }
  .summary .row.total { border-top: 2px solid #0f172a; margin-top: 6px; padding-top: 8px; font-weight: bold; }
  .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 20px; }
</style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      ${company.companyLogoUrl ? `<img src="${escapeHtml(company.companyLogoUrl)}" alt="logo" />` : ""}
      <div class="name">${escapeHtml(company.companyName)}</div>
      ${company.companyAddress ? `<div class="line">${escapeHtml(company.companyAddress)}</div>` : ""}
      ${company.companyPhone ? `<div class="line">هاتف: ${escapeHtml(company.companyPhone)}</div>` : ""}
    </div>

    <div class="title">إيصال دفع <span class="status-badge">${statusLabel}</span></div>

    <div class="amount-box">
      <div class="amt">${formatMoney(payment.amount, currency)}</div>
      <div class="cap">${METHOD_LABELS[payment.method]}${
        Number(payment.refundedAmount) > 0
          ? ` · صافٍ بعد الاسترداد: ${formatMoney(netAmount, currency)}`
          : ""
      }</div>
    </div>

    <table class="info">
      <tr><td class="label">رقم الإيصال / المرجع</td><td class="value" dir="ltr">${escapeHtml(receiptRef)}</td></tr>
      <tr><td class="label">التاريخ</td><td class="value">${formatDateTime(payment.createdAt)}</td></tr>
      <tr><td class="label">العميل</td><td class="value">${escapeHtml(payment.order.customer.name)}</td></tr>
      <tr><td class="label">رقم الطلب</td><td class="value" dir="ltr">${escapeHtml(payment.order.orderNumber)}</td></tr>
      <tr><td class="label">استلمها</td><td class="value">${escapeHtml(payment.receivedBy.name)}</td></tr>
    </table>

    <div class="summary">
      <div class="row"><span class="lbl">إجمالي الطلب</span><span>${formatMoney(orderTotal, currency)}</span></div>
      <div class="row"><span class="lbl">المدفوع حتى الآن</span><span>${formatMoney(orderPaid, currency)}</span></div>
      <div class="row total"><span class="lbl">المتبقّي على الطلب</span><span>${formatMoney(orderRemaining, currency)}</span></div>
    </div>

    <div class="footer">شكراً لتعاملكم معنا · ${escapeHtml(company.companyName)}</div>
  </div>
</body>
</html>`;
}
