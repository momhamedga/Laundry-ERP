import { InvoiceStatus, PaymentMethod, PaymentTxStatus } from "@prisma/client";
import { z } from "zod";
import {
  MAX_PAYMENT_AMOUNT,
  MAX_NOTES_LENGTH as MAX_PAYMENT_NOTES_LENGTH,
  MAX_REFERENCE_LENGTH,
} from "../payments/payments.constants.js";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  INVOICE_NUMBER_REGEX,
  INVOICE_SORTABLE_FIELDS,
  MANUALLY_SETTABLE_STATUSES,
  MAX_NOTES_LENGTH,
  MAX_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  MAX_TAX_AMOUNT,
  SORT_ORDERS,
} from "./invoice.constants.js";

const notesSchema = z.string().trim().max(MAX_NOTES_LENGTH, "Notes too long");
const taxSchema = z
  .number()
  .nonnegative("Tax cannot be negative")
  .max(MAX_TAX_AMOUNT)
  .multipleOf(0.01, "Tax supports at most 2 decimal places");

/** حالات يقبلها الإنشاء فقط - لا CANCELLED مباشرة، ولا PARTIALLY_PAID/PAID (تُشتق تلقائياً) */
const CREATE_STATUSES = ["DRAFT", "ISSUED"] as const;

// ==================== Params ====================

export const invoiceIdParamSchema = z.object({
  id: z.cuid("Invalid invoice id"),
});

export const invoiceNumberParamSchema = z.object({
  invoiceNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(INVOICE_NUMBER_REGEX, "Invalid invoice number format (INV-YYYY-000001)"),
});

// ==================== Body ====================

/**
 * الإنشاء يقبل orderId فقط كمصدر بيانات - subtotal/discount/items تُنسخ من
 * الطلب بالخادم (Business Rule: لا نعيد حساب ما حسبته وحدة orders بالفعل)
 */
export const createInvoiceSchema = z.object({
  orderId: z.cuid("Invalid order id"),
  status: z.enum(CREATE_STATUSES).default("ISSUED"),
  tax: taxSchema.default(0),
  dueDate: z.coerce.date("Invalid dueDate date").optional(),
  notes: notesSchema.nullish(),
});

export const updateInvoiceSchema = z
  .object({
    status: z.enum(MANUALLY_SETTABLE_STATUSES as [InvoiceStatus, ...InvoiceStatus[]]),
    tax: taxSchema,
    dueDate: z.coerce.date("Invalid dueDate date").nullable(),
    notes: notesSchema.nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "لا توجد حقول للتعديل." });

// ==================== Documents (Print/PDF/Email) ====================

export const emailInvoiceSchema = z.object({
  email: z.email("Invalid email address"),
});

// ==================== Payments (تكامل الفاتورة ↔ المدفوعات) ====================

/**
 * إنشاء دفعة عبر الفاتورة - نفس شكل createPaymentSchema بوحدة payments لكن
 * بلا orderId (يُشتق من طلب الفاتورة بالخادم). القواعد مطابقة لثوابت payments.
 */
export const createInvoicePaymentSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be greater than zero")
    .max(MAX_PAYMENT_AMOUNT)
    .multipleOf(0.01, "Amount supports at most 2 decimal places"),
  method: z.enum(PaymentMethod).default("CASH"),
  /** الإنشاء يقبل PENDING (تحويل بانتظار تأكيد) أو COMPLETED (كاش فوري) - نفس payments */
  status: z.enum([PaymentTxStatus.PENDING, PaymentTxStatus.COMPLETED]).default("COMPLETED"),
  reference: z.string().trim().max(MAX_REFERENCE_LENGTH).min(1).nullish(),
  notes: z.string().trim().max(MAX_PAYMENT_NOTES_LENGTH, "Notes too long").nullish(),
});

/** قائمة مدفوعات الفاتورة - ترقيم + ترتيب بنفس حقول payments المسموحة */
export const listInvoicePaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  sortBy: z.enum(["createdAt", "amount"]).default("createdAt"),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
});

// ==================== Query ====================

export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  /** بحث برقم الفاتورة أو اسم/هاتف العميل */
  search: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
  status: z.enum(InvoiceStatus).optional(),
  customerId: z.cuid().optional(),
  branchId: z.string().trim().min(1).optional(),
  orderId: z.cuid().optional(),
  issuedFrom: z.coerce.date().optional(),
  issuedTo: z.coerce.date().optional(),
  sortBy: z.enum(INVOICE_SORTABLE_FIELDS).default("issuedAt"),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
});
