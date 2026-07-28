import { z } from "zod";
import type {
  CreatePaymentInput,
  CreatePaymentStatus,
  PaymentMethod,
  RefundPaymentInput,
} from "@/types/payment";

/**
 * تحقق مطابق لقواعد apps/api/src/modules/payments/payments.validator.ts
 * (طبقة دفاع أولى بالواجهة - المصدر الحقيقي يبقى الخادم)
 */
const MAX_PAYMENT_AMOUNT = 1_000_000;
const MAX_REFERENCE_LENGTH = 100;
const MAX_NOTES_LENGTH = 500;

const amountFieldSchema = z
  .string()
  .min(1, "المبلغ مطلوب")
  .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, "المبلغ يجب أن يكون أكبر من صفر")
  .refine((v) => Number(v) <= MAX_PAYMENT_AMOUNT, "المبلغ كبير جداً");

const referenceFieldSchema = z.string().trim().max(MAX_REFERENCE_LENGTH, "المرجع طويل جداً");
const notesFieldSchema = z.string().trim().max(MAX_NOTES_LENGTH, "الملاحظات طويلة جداً");

const METHODS: readonly PaymentMethod[] = ["CASH", "CARD", "BANK_TRANSFER", "MOBILE_WALLET"];
const methodFieldSchema = z.enum(METHODS as [PaymentMethod, ...PaymentMethod[]]);

const CREATE_STATUSES: readonly CreatePaymentStatus[] = ["COMPLETED", "PENDING"];
const createStatusFieldSchema = z.enum(
  CREATE_STATUSES as [CreatePaymentStatus, ...CreatePaymentStatus[]],
);

// ==================== Create Payment ====================

export const createPaymentFormSchema = z.object({
  orderId: z.string().min(1, "اختر الطلب"),
  method: methodFieldSchema,
  status: createStatusFieldSchema,
  amount: amountFieldSchema,
  reference: referenceFieldSchema,
  notes: notesFieldSchema,
});

export type CreatePaymentFormValues = z.infer<typeof createPaymentFormSchema>;

export function toCreatePaymentInput(values: CreatePaymentFormValues): CreatePaymentInput {
  const reference = values.reference.trim();
  const notes = values.notes.trim();
  return {
    orderId: values.orderId,
    method: values.method,
    status: values.status,
    amount: Number(values.amount),
    reference: reference === "" ? null : reference,
    notes: notes === "" ? null : notes,
  };
}

// ==================== Refund Payment ====================

/**
 * amount اختياري (فراغ = استرداد كامل المتبقي) ولا يتجاوز remaining
 * (Business Rule: Refund Amount <= المتبقي القابل للاسترداد = payment.amount - payment.refundedAmount)
 * reason هو نفس الحقل الذي يُحفظ كملاحظة الدفعة بالخادم - لا حقل منفصل
 */
export function buildRefundFormSchema(remaining: number) {
  return z.object({
    amount: z
      .string()
      .refine(
        (v) => v.trim() === "" || (!Number.isNaN(Number(v)) && Number(v) > 0),
        "مبلغ غير صالح",
      )
      .refine(
        (v) => v.trim() === "" || Number(v) <= remaining,
        "لا يمكن أن يتجاوز المبلغ المتبقي القابل للاسترداد",
      ),
    reason: notesFieldSchema,
  });
}

export type RefundFormValues = z.infer<ReturnType<typeof buildRefundFormSchema>>;

export function toRefundPaymentInput(values: RefundFormValues): RefundPaymentInput {
  const reason = values.reason.trim();
  return {
    amount: values.amount.trim() === "" ? undefined : Number(values.amount),
    reason: reason === "" ? null : reason,
  };
}
