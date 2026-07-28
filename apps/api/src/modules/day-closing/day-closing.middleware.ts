import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import type { DayClosingService } from "./day-closing.service.js";

/**
 * المسارات التشغيلية التي يقفلها إغلاق اليوم (Read-Only بعد الإغلاق - Phase 9.6).
 * توسّعت من المالية فقط لتشمل المشتريات/المخزون/الولاء/الكوبونات/العضوية/الباركود
 * بحيث تصبح كل الدفاتر Read-Only بعد الإغلاق حتى إعادة الفتح (نمط الترحيل المحاسبي).
 * لا تشمل مسارات الإدارة/الإعدادات/الموظفين/التقارير (ليست دفاتر معاملات يومية).
 */
const GUARDED_PREFIXES = [
  "/api/v1/orders",
  "/api/v1/payments",
  "/api/v1/invoices",
  "/api/v1/purchases",
  "/api/v1/inventory",
  "/api/v1/loyalty",
  "/api/v1/coupons",
  "/api/v1/membership",
  "/api/v1/barcodes",
];

/** طرق القراءة لا تُقفَل أبداً */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** مدة صلاحية الكاش الصغير لحالة "اليوم مقفل" - تفادي استعلام لكل طلب كتابة */
const CACHE_TTL_MS = 5_000;

/**
 * قفل الفترة المحاسبية (عام في app.ts). قاعدة متوافقة رجعياً تماماً:
 * يُمنع فقط الكتابة على المسارات التشغيلية عندما يوجد سجل إغلاق لتاريخ اليوم
 * وحالته CLOSED. إن لم يوجد أي سجل لليوم (النظام لم يبدأ استخدام إغلاق اليوم بعد)
 * أو كان اليوم مفتوحاً/معاداً فتحه ⇒ يمر الطلب دون أي تغيير في السلوك القائم.
 * لا يمسّ أي وحدة أخرى ولا أي Response قائم.
 */
export function createPeriodLockMiddleware(service: DayClosingService) {
  let cached: { locked: boolean; at: number } | null = null;

  async function isLocked(): Promise<boolean> {
    const now = Date.now();
    if (cached && now - cached.at < CACHE_TTL_MS) return cached.locked;
    const locked = await service.isTodayLocked();
    cached = { locked, at: now };
    return locked;
  }

  return function periodLock(req: Request, _res: Response, next: NextFunction): void {
    if (SAFE_METHODS.has(req.method)) return next();
    const path = req.originalUrl.split("?")[0] ?? "";
    if (!GUARDED_PREFIXES.some((p) => path.startsWith(p))) return next();

    isLocked()
      .then((locked) => {
        if (locked) {
          next(
            new ApiError(
              423,
              "اليوم المحاسبي مُغلق - لا يمكن إجراء عمليات جديدة حتى تُعيد فتح اليوم",
            ),
          );
        } else {
          next();
        }
      })
      .catch(() => next()); // فشل الفحص لا يجب أن يمنع العمليات (متوافق رجعياً)
  };
}
