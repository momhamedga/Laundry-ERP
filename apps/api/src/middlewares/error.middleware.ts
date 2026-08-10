import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { ERROR_CODES } from "../constants/error-codes.js";

/**
 * خطأ تشغيلي معروف يمكن إظهار رسالته للعميل بأمان
 */
export class ApiError extends Error {
  /**
   * @param code رمز ثابت للحالات التي تتفرّع عندها الواجهة سلوكياً لا عرضياً.
   *
   * كانت الواجهة تطابق على نصّ الرسالة الإنجليزي حرفياً (شاشة «رابط منتهٍ»،
   * تلوين حقل كلمة السر الحالية)، فأسقطها تعريب الرسائل بصمت: لا خطأ ترجمة
   * ولا اختبار يسقط، فقط سلوك يختفي. الرمز عقدٌ مستقرّ لا يتأثّر بالصياغة.
   */
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** 404 - مسار غير موجود */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `المسار المطلوب غير موجود: ${req.method} ${req.originalUrl}`,
  });
}

/** المعالج المركزي للأخطاء */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "بيانات غير صالحة. راجع الحقول المُشار إليها.",
      errors: err.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
    return;
  }

  /**
   * أخطاء تحليل الجسم من body-parser تحمل حالتها الصحيحة وتسقط هنا بلا داعٍ.
   *
   * كانت حمولة تتجاوز الحدّ (1MB) تُرجِع 500 ورسالة «خطأ غير متوقّع في النظام»،
   * وهي إفادة خاطئة مرّتين: الحالة تقول عطل خادم بينما الخطأ من العميل، والسجلّ
   * يمتلئ بـ«Unhandled error» لكل طلب كبير — فيصير إغراق السجلّ ممكناً بطلبات
   * لا تحتاج مصادقة أصلاً.
   */
  const parseErr = err as { type?: string; status?: number; statusCode?: number };
  if (typeof parseErr.type === "string" && parseErr.type.startsWith("entity.")) {
    const status = parseErr.status ?? parseErr.statusCode ?? 400;
    res.status(status).json({
      success: false,
      message:
        status === 413
          ? "حجم البيانات المُرسَلة يتجاوز الحدّ المسموح."
          : "تعذّر قراءة البيانات المُرسَلة. تأكّد من صحّة الطلب.",
    });
    return;
  }

  console.error("💥 Unhandled error:", err);

  // انقطاع الاتصال بقاعدة البيانات ليس خطأً برمجياً، ورسالة «Internal server error»
  // تترك المستخدم بلا أي دليل على السبب أو الحل. نبقي على 500 حفاظاً على العقد
  // ونستبدل الرسالة بنصّ عربي يشرح السبب الفعلي وما يفعله المستخدم.
  const dbDown = isDatabaseUnreachable(err);
  const message = dbDown
    ? "تعذّر الاتصال بقاعدة البيانات. تحقّق من اتصال الإنترنت ثم أعد المحاولة."
    : env.isProduction
      ? "حدث خطأ غير متوقّع في النظام. أعد المحاولة، وإن تكرّر راجع الدعم الفني."
      : err instanceof Error
        ? err.message
        : "خطأ غير معروف";

  res.status(500).json({
    success: false,
    message,
    ...(dbDown ? { code: ERROR_CODES.DB_UNREACHABLE } : {}),
  });
}

/**
 * أكواد Prisma التي تعني «لم أصل إلى الخادم» لا «بياناتك خاطئة».
 *
 * P2024 هو ما يظهر فعلياً عند انقطاع الإنترنت: لا يفشل الاتصال فوراً بل تنتهي
 * مهلة سحب اتصال من التجمّع. أثبتته تجربة حيّة على جهاز المستخدم، وكان غائباً
 * عن القائمة الأولى لأنها بُنيت على أكواد الاتصال المباشرة (P1xxx) وحدها.
 */
const DB_UNREACHABLE_CODES = new Set(["P1000", "P1001", "P1002", "P1008", "P1017", "P2024"]);

/**
 * هل سبب الخطأ تعذّر بلوغ قاعدة البيانات؟
 *
 * نفحص بالبنية لا بالنوع كي لا نستورد أنواع Prisma في طبقة الأخطاء العامة،
 * ولأن أخطاء التهيئة قد تصل ملفوفة فيفقد `instanceof` قيمته.
 */
function isDatabaseUnreachable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;

  const code = (err as { errorCode?: string; code?: string }).errorCode ?? (err as { code?: string }).code;
  if (typeof code === "string" && DB_UNREACHABLE_CODES.has(code)) return true;

  if (err.name === "PrismaClientInitializationError") return true;

  // أخطاء المقبس الخام قبل أن تلفّها Prisma (DNS / رفض اتصال / مهلة)
  if (typeof code === "string" && ["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"].includes(code)) {
    return true;
  }

  // بعض الأخطاء تصل ملفوفة فيضيع حقل code ولا يبقى إلا النصّ
  return /can'?t reach database server|timed out fetching a new connection|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|getaddrinfo|connection.*(refused|timed out)/i.test(
    err.message,
  );
}
