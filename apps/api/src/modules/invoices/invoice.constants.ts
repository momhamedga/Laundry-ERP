import type { InvoiceStatus } from "@prisma/client";

// ==================== Pagination ====================

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ==================== Sorting ====================

/** الحقول المسموح الترتيب بها - Whitelist صارمة */
export const INVOICE_SORTABLE_FIELDS = [
  "issuedAt",
  "dueDate",
  "total",
  "invoiceNumber",
  "createdAt",
] as const;
export type InvoiceSortableField = (typeof INVOICE_SORTABLE_FIELDS)[number];

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

// ==================== Search ====================

export const MAX_SEARCH_LENGTH = 100;

// ==================== Invoice Number ====================

/** صيغة رقم الفاتورة: INV-YYYY-000001 - بنفس فكرة ORD-YYYY-000001 بوحدة orders */
export const INVOICE_NUMBER_PREFIX = "INV";
export const INVOICE_NUMBER_SEQ_LENGTH = 6;
export const INVOICE_NUMBER_REGEX = /^INV-\d{4}-\d{6}$/;

/** محاولات إعادة التوليد عند تصادم الرقم (سباق نادر) */
export const INVOICE_NUMBER_MAX_RETRIES = 3;

// ==================== Status Rules ====================

/**
 * حالات تُضبَط يدوياً عبر PUT فقط (DRAFT/ISSUED/CANCELLED) - PARTIALLY_PAID
 * وPAID تُشتق دائماً تلقائياً من paidAmount مقابل total، لا تُقبل كطلب يدوي مباشر
 */
export const MANUALLY_SETTABLE_STATUSES: readonly InvoiceStatus[] = [
  "DRAFT",
  "ISSUED",
  "CANCELLED",
];

/** حالة نهائية - لا تعديل بعدها إطلاقاً */
export const TERMINAL_STATUSES: readonly InvoiceStatus[] = ["CANCELLED"];

// ==================== Limits ====================

export const MAX_NOTES_LENGTH = 1000;
/** حد أقصى للضريبة - حماية من أخطاء الإدخال (لا يوجد معدل ضريبة نظامي بعد - راجع القرارات المعمارية بالتقرير) */
export const MAX_TAX_AMOUNT = 1_000_000;
