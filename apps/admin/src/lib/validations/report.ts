import { z } from "zod";

/**
 * تحقق مطابق حرفياً لـ apps/api/src/modules/reports/reports.constants.ts +
 * reports.validator.ts (طبقة دفاع أولى بالواجهة - المصدر الحقيقي يبقى الخادم)
 * لا Endpoint كتابة بهذه الوحدة - لذا لا نماذج Create/Update هنا، فقط تحقق الفلاتر
 */

export const REPORT_DEFAULT_PAGE = 1;
export const REPORT_DEFAULT_PAGE_SIZE = 20;
export const REPORT_MAX_PAGE_SIZE = 100;

export const REPORT_TOP_CUSTOMERS_DEFAULT = 10;
export const REPORT_TOP_CUSTOMERS_MAX = 50;

/**
 * from/to بلا نطاق افتراضي ثابت (يطابق dateRangeShape بالخادم) - يتحقق أن
 * from <= to إن وُجدا معاً فقط (نفس refineDateRange بالخادم)
 */
export const reportDateRangeSchema = z
  .object({
    from: z.string().trim().optional(),
    to: z.string().trim().optional(),
  })
  .refine(
    (v) => !v.from || !v.to || new Date(v.from).getTime() <= new Date(v.to).getTime(),
    { message: "تاريخ البداية يجب أن يسبق أو يساوي تاريخ النهاية", path: ["to"] },
  );

export type ReportDateRangeValues = z.infer<typeof reportDateRangeSchema>;

/** رسالة الخطأ إن وُجدت، أو undefined إن كان النطاق صالحاً - لعرض فوري بدون انتظار رفض الخادم */
export function getReportDateRangeError(from: string, to: string): string | undefined {
  const result = reportDateRangeSchema.safeParse({
    from: from || undefined,
    to: to || undefined,
  });
  return result.success ? undefined : result.error.issues[0]?.message;
}

export const reportTopLimitSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(REPORT_TOP_CUSTOMERS_MAX);
