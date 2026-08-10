import { PaymentMethod, PaymentTxStatus } from "@prisma/client";
import { z } from "zod";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_NOTES_LENGTH,
  MAX_PAGE_SIZE,
  MAX_PAYMENT_AMOUNT,
  MAX_REFERENCE_LENGTH,
  MAX_SEARCH_LENGTH,
  PAYMENT_SORTABLE_FIELDS,
  SORT_ORDERS,
} from "./payments.constants.js";

/** Business Rule: جميع المبالغ Decimal بدقة قرشين وموجبة */
const amountSchema = z
  .number()
  .positive("Amount must be greater than zero")
  .max(MAX_PAYMENT_AMOUNT)
  .multipleOf(0.01, "Amount supports at most 2 decimal places");

const notesSchema = z.string().trim().max(MAX_NOTES_LENGTH, "Notes too long");
const referenceSchema = z.string().trim().max(MAX_REFERENCE_LENGTH).min(1);

// ==================== Params ====================

export const paymentIdParamSchema = z.object({
  id: z.cuid("Invalid payment id"),
});

// ==================== Body ====================

export const createPaymentSchema = z.object({
  orderId: z.cuid("Invalid order id"),
  amount: amountSchema,
  method: z.enum(PaymentMethod).default("CASH"),
  /** الإنشاء يقبل PENDING (تحويل بانتظار تأكيد) أو COMPLETED (كاش فوري) */
  status: z
    .enum([PaymentTxStatus.PENDING, PaymentTxStatus.COMPLETED])
    .default("COMPLETED"),
  reference: referenceSchema.nullish(),
  notes: notesSchema.nullish(),
});

/** التعديل مسموح للدفعات PENDING فقط (انظر ALLOW_COMPLETED_PAYMENT_EDIT) */
export const updatePaymentSchema = z
  .object({
    amount: amountSchema,
    method: z.enum(PaymentMethod),
    reference: referenceSchema.nullable(),
    notes: notesSchema.nullable(),
    /** ترحيل الدفعة المعلقة: تأكيد أو فشل */
    status: z.enum([PaymentTxStatus.COMPLETED, PaymentTxStatus.FAILED]),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "لا توجد حقول للتعديل." });

export const refundPaymentSchema = z.object({
  /** بدون مبلغ = استرداد كامل المتبقي */
  amount: amountSchema.optional(),
  reason: notesSchema.nullish(),
});

export const cancelPaymentSchema = z.object({
  reason: notesSchema.nullish(),
});

// ==================== Query ====================

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  /** بحث بالمرجع أو رقم الطلب أو اسم العميل */
  search: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
  orderId: z.cuid().optional(),
  method: z.enum(PaymentMethod).optional(),
  status: z.enum(PaymentTxStatus).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  sortBy: z.enum(PAYMENT_SORTABLE_FIELDS).default("createdAt"),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
});
