import { ExpenseCategory, ExpenseStatus } from "@prisma/client";
import { z } from "zod";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  EXPENSE_SORTABLE_FIELDS,
  MAX_CANCEL_REASON_LENGTH,
  MAX_EXPENSE_AMOUNT,
  MAX_NOTES_LENGTH,
  MAX_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  SORT_ORDERS,
} from "./expenses.constants.js";

export const expenseIdParamSchema = z.object({ id: z.cuid("مُعرِّف مصروف غير صالح") });

/**
 * المبلغ.
 *
 * `finite()` صراحةً: Number("Infinity") و1e400 كلاهما يمرّ من positive()، ثم
 * يصل إلى Decimal فيفسد الإجمالي أو يفشل الإدراج برسالة قاعدة بيانات غامضة.
 * والرفض هنا يعطي المستخدم سبباً مفهوماً.
 *
 * والصفر مرفوض: مصروفٌ بلا مبلغ ليس واقعة مالية، وتسجيله يضخّم عدد السجلات
 * بلا أثر على أي إجمالي.
 */
const amountSchema = z.coerce
  .number({ error: "المبلغ مطلوب" })
  .refine(Number.isFinite, "مبلغ غير صالح")
  .positive("المبلغ يجب أن يكون أكبر من صفر")
  .max(MAX_EXPENSE_AMOUNT, "المبلغ يتجاوز الحدّ المسموح");

const notesSchema = z.string().trim().max(MAX_NOTES_LENGTH, "الوصف طويل جداً");

export const createExpenseSchema = z.object({
  amount: amountSchema,
  category: z.enum(ExpenseCategory, { error: "فئة مصروف غير صالحة" }),
  branchId: z.cuid("مُعرِّف فرع غير صالح"),
  expenseDate: z.coerce.date({ error: "تاريخ غير صالح" }),
  notes: notesSchema.nullish(),
});

/**
 * التعديل.
 *
 * الحقول التي يديرها النظام غائبة عمداً: id وcreatedById وcreatedAt والحالة.
 * غيابها من المخطّط يعني أن Zod يُسقطها من الجسم قبل بلوغ الخدمة — فلا تُمرَّر
 * إلى Prisma حتى لو أرسلها العميل. هذا هو الحاجز ضد mass assignment، لا الثقة
 * في أن الواجهة لن ترسلها.
 */
export const updateExpenseSchema = z
  .object({
    amount: amountSchema,
    category: z.enum(ExpenseCategory, { error: "فئة مصروف غير صالحة" }),
    branchId: z.cuid("مُعرِّف فرع غير صالح"),
    expenseDate: z.coerce.date({ error: "تاريخ غير صالح" }),
    notes: notesSchema.nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "لا توجد حقول للتعديل." });

export const cancelExpenseSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "سبب الإلغاء مطلوب")
    .max(MAX_CANCEL_REASON_LENGTH, "السبب طويل جداً"),
});

export const listExpensesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
  category: z.enum(ExpenseCategory).optional(),
  status: z.enum(ExpenseStatus).optional(),
  branchId: z.cuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sortBy: z.enum(EXPENSE_SORTABLE_FIELDS).default("expenseDate"),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
});

export const operatingSummaryQuerySchema = z.object({
  from: z.coerce.date({ error: "تاريخ البداية مطلوب" }),
  to: z.coerce.date({ error: "تاريخ النهاية مطلوب" }),
  branchId: z.cuid().optional(),
});

export type CreateExpenseDto = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseDto = z.infer<typeof updateExpenseSchema>;
export type CancelExpenseDto = z.infer<typeof cancelExpenseSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
export type OperatingSummaryQuery = z.infer<typeof operatingSummaryQuerySchema>;
