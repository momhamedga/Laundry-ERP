import { z } from "zod";
import type {
  CreateInvoiceInput,
  CreateInvoicePaymentInput,
  EmailInvoiceInput,
  UpdateInvoiceInput,
} from "@/types/invoice";
import type { CreatePaymentStatus, PaymentMethod } from "@/types/payment";

/**
 * تحقق مطابق لقواعد apps/api/src/modules/invoices/invoice.validator.ts
 * (طبقة دفاع أولى بالواجهة - المصدر الحقيقي يبقى الخادم)
 */
const MAX_NOTES_LENGTH = 1000;
const MAX_TAX_AMOUNT = 1_000_000;

const notesFieldSchema = z.string().trim().max(MAX_NOTES_LENGTH, "الملاحظات طويلة جداً");

const taxFieldSchema = z
  .string()
  .min(1, "الضريبة مطلوبة (أدخل 0 إن لم توجد)")
  .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "الضريبة يجب أن تكون رقماً موجباً أو صفراً")
  .refine((v) => Number(v) <= MAX_TAX_AMOUNT, "الضريبة كبيرة جداً")
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v.trim()), "الضريبة تدعم رقمين عشريين كحد أقصى");

const CREATE_STATUSES = ["DRAFT", "ISSUED"] as const;
const MANUALLY_SETTABLE_STATUSES = ["DRAFT", "ISSUED", "CANCELLED"] as const;

// ==================== Create Invoice ====================

export const createInvoiceFormSchema = z.object({
  orderId: z.string().min(1, "اختر الطلب"),
  status: z.enum(CREATE_STATUSES),
  tax: taxFieldSchema,
  /** yyyy-mm-dd أو فارغ = بلا تاريخ استحقاق */
  dueDate: z.string(),
  notes: notesFieldSchema,
});

export type CreateInvoiceFormValues = z.infer<typeof createInvoiceFormSchema>;

export function toCreateInvoiceInput(values: CreateInvoiceFormValues): CreateInvoiceInput {
  const notes = values.notes.trim();
  return {
    orderId: values.orderId,
    status: values.status,
    tax: Number(values.tax),
    dueDate: values.dueDate.trim() === "" ? undefined : values.dueDate,
    notes: notes === "" ? null : notes,
  };
}

// ==================== Update Invoice ====================

/** لا orderId هنا - غير قابل للتعديل بعد الإنشاء (Business Rule بالخادم) */
export const updateInvoiceFormSchema = z.object({
  status: z.enum(MANUALLY_SETTABLE_STATUSES),
  tax: taxFieldSchema,
  dueDate: z.string(),
  notes: notesFieldSchema,
});

export type UpdateInvoiceFormValues = z.infer<typeof updateInvoiceFormSchema>;

export function toUpdateInvoiceInput(values: UpdateInvoiceFormValues): UpdateInvoiceInput {
  const notes = values.notes.trim();
  return {
    status: values.status,
    tax: Number(values.tax),
    dueDate: values.dueDate.trim() === "" ? null : values.dueDate,
    notes: notes === "" ? null : notes,
  };
}

// ==================== Email Invoice ====================

const emailFieldSchema = z
  .string()
  .trim()
  .min(1, "البريد الإلكتروني مطلوب")
  .refine((v) => z.email().safeParse(v).success, "بريد إلكتروني غير صالح");

export const emailInvoiceFormSchema = z.object({
  email: emailFieldSchema,
});

export type EmailInvoiceFormValues = z.infer<typeof emailInvoiceFormSchema>;

export function toEmailInvoiceInput(values: EmailInvoiceFormValues): EmailInvoiceInput {
  return { email: values.email.trim() };
}

// ==================== Receive Invoice Payment ====================

const MAX_PAYMENT_AMOUNT = 1_000_000;
const MAX_REFERENCE_LENGTH = 100;

const paymentAmountSchema = z
  .string()
  .min(1, "المبلغ مطلوب")
  .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, "المبلغ يجب أن يكون أكبر من صفر")
  .refine((v) => Number(v) <= MAX_PAYMENT_AMOUNT, "المبلغ كبير جداً");

const PAYMENT_METHODS: readonly PaymentMethod[] = ["CASH", "CARD", "BANK_TRANSFER", "MOBILE_WALLET"];
const CREATE_PAYMENT_STATUSES: readonly CreatePaymentStatus[] = ["COMPLETED", "PENDING"];

export const receiveInvoicePaymentFormSchema = z.object({
  method: z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]]),
  status: z.enum(CREATE_PAYMENT_STATUSES as [CreatePaymentStatus, ...CreatePaymentStatus[]]),
  amount: paymentAmountSchema,
  reference: z.string().trim().max(MAX_REFERENCE_LENGTH, "المرجع طويل جداً"),
  notes: z.string().trim().max(500, "الملاحظات طويلة جداً"),
});

export type ReceiveInvoicePaymentFormValues = z.infer<typeof receiveInvoicePaymentFormSchema>;

export function toCreateInvoicePaymentInput(
  values: ReceiveInvoicePaymentFormValues,
): CreateInvoicePaymentInput {
  const reference = values.reference.trim();
  const notes = values.notes.trim();
  return {
    method: values.method,
    status: values.status,
    amount: Number(values.amount),
    reference: reference === "" ? null : reference,
    notes: notes === "" ? null : notes,
  };
}
