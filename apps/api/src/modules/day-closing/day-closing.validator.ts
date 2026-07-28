import { z } from "zod";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./day-closing.constants.js";

export const dayIdParamSchema = z.object({ id: z.cuid("Invalid day closing id") });

const money = z.coerce.number().min(0).max(100_000_000);

/** فتح يوم عمل - الرصيد الافتتاحي للصندوق (اختياري، صفر افتراضاً) */
export const openDaySchema = z.object({
  openingCash: money.optional(),
  branchId: z.cuid().nullable().optional(),
  notes: z.string().trim().max(500).optional(),
});

/**
 * إغلاق اليوم - النقد المعدود فعلاً بالصندوق + حركة نقدية يدوية اختيارية.
 * differenceNote مطلوب فقط عند وجود فرق (يُفرض بالخدمة، لا هنا).
 */
export const closeDaySchema = z.object({
  actualCash: money,
  cashIn: money.optional(),
  cashOut: money.optional(),
  differenceNote: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(500).optional(),
  /** تجاوز تحذيرات ما قبل الإغلاق (ADMIN فقط) - لا يتجاوز الموانع الصارمة */
  force: z.coerce.boolean().optional(),
});

/** إعادة فتح يوم مُغلق - ADMIN فقط + سبب إلزامي */
export const reopenDaySchema = z.object({
  reason: z.string().trim().min(3, "سبب إعادة الفتح مطلوب").max(500),
});

/** حركة نقدية يدوية على الوردية المفتوحة (إيداع/سحب) */
export const cashMovementSchema = z.object({
  type: z.enum(["IN", "OUT"]),
  amount: z.coerce.number().positive().max(100_000_000),
  note: z.string().trim().max(300).optional(),
});

export const listDayClosingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  status: z.enum(["OPEN", "CLOSED", "REOPENED"]).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
