import * as Sentry from "@sentry/node";
import { env } from "./env.js";
import { readApplicationVersion } from "../modules/backup/backup.utils.js";

/**
 * تتبّع الأخطاء عبر Sentry.
 *
 * العطل الذي يعالجه: كل ما يُعرف عن أعطال الإنتاج هو 15 نداء console.error
 * تذهب إلى سجلّ Railway الذي يُمسح مع كل نشر. فحين يقول موظّف «النظام مش شغال»
 * لا يبقى أثرٌ يُقرأ، ولا وسيلة لمعرفة أن عطلاً يتكرّر أصلاً ما لم يبلّغ أحد.
 *
 * اختياري بالكامل: بلا SENTRY_DSN لا يُهيَّأ شيء ولا يتغيّر أي سلوك — نفس نمط
 * RESEND_API_KEY وBACKUP_B2_*. لا يجوز أن يعتمد تشغيل النظام على خدمة مراقبة.
 *
 * الخصوصية هي القيد الحاكم هنا: النظام يحمل أسماء عملاء وأرقام هواتفهم
 * وفواتيرهم وكلمات سرّ في أجسام الطلبات. إرسال ذلك إلى طرف ثالث تسريبٌ لا
 * «تشخيص»، ولذلك يُقصّ كل ما قد يحمل بيانات قبل الإرسال، لا بعده.
 */

/** رؤوس تُحذف كاملةً — تحمل رموز جلسات أو كلمات سرّ */
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-restore-confirm",
  "x-expected-checksum",
]);

/** شكل الحدث الذي يهمّنا من Sentry — نتجنّب أنواعه الداخلية في التوقيع */
interface SanitizableEvent {
  request?: {
    data?: unknown;
    cookies?: unknown;
    query_string?: unknown;
    headers?: Record<string, string>;
  };
}

/**
 * يقصّ كل ما قد يحمل بيانات شخصية أو أسراراً قبل مغادرة الخادم.
 *
 * مُصدَّرة لتُختبَر مباشرةً: اختبارها عبر محاكاة Sentry يختبر آلية التمرير لا
 * التنقية نفسها، والتنقية هي ما يفصل بين تشخيصٍ وتسريب.
 */
export function sanitizeEvent<T extends SanitizableEvent>(event: T): T {
  if (!event.request) return event;

  // جسم الطلب: كلمات السرّ وبيانات العملاء تمرّ هنا. لا يُرسَل أبداً.
  delete event.request.data;
  delete event.request.cookies;
  // المسار قد يحمل معرّفات أو أرقام هواتف في سلسلة الاستعلام
  delete event.request.query_string;

  if (event.request.headers) {
    event.request.headers = Object.fromEntries(
      Object.entries(event.request.headers).filter(
        ([k]) => !SENSITIVE_HEADERS.has(k.toLowerCase()),
      ),
    );
  }
  return event;
}

export function initObservability(): void {
  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: env.NODE_ENV,
    release: readApplicationVersion(),

    // بلا تتبّع أداء: يضاعف الاستهلاك ولا نحتاجه الآن، ويستحقّ قراراً منفصلاً
    tracesSampleRate: 0,

    /**
     * الافتراضي في Sentry إرسال معلومات المستخدم وعنوان الـIP. نُطفئه ونرسل
     * المعرّف وحده يدوياً: المعرّف يكفي لربط الأعطال بمستخدم، ولا يكشف بريده
     * ولا اسمه ولا موقعه.
     */
    sendDefaultPii: false,

    beforeSend: (event) => sanitizeEvent(event),
  });

  console.log(`🛡️  تتبّع الأخطاء مفعّل (${env.NODE_ENV})`);
}

/** هل التتبّع مفعّل فعلاً؟ */
export function isObservabilityEnabled(): boolean {
  return Boolean(env.SENTRY_DSN?.trim());
}

/**
 * يُبلّغ عن خطأ غير متوقَّع.
 *
 * الأخطاء التشغيلية المعروفة (ApiError: «العميل غير موجود»، «كلمة السر غير
 * صحيحة») لا تُرسَل: هي سلوك صحيح لا عطل، وإرسالها يُغرق التنبيهات بضجيج حتى
 * تُتجاهَل كلّها — فيضيع العطل الحقيقي وسطها.
 */
export function captureError(
  error: unknown,
  context?: { userId?: string; route?: string; extra?: Record<string, unknown> },
): void {
  if (!isObservabilityEnabled()) return;

  Sentry.withScope((scope) => {
    if (context?.userId) scope.setUser({ id: context.userId });
    if (context?.route) scope.setTag("route", context.route);
    if (context?.extra) scope.setContext("تفاصيل", context.extra);
    Sentry.captureException(error);
  });
}

/** إفراغ ما لم يُرسَل بعد — يُستدعى عند الإغلاق النظيف حتى لا يضيع آخر عطل */
export async function flushObservability(timeoutMs = 2000): Promise<void> {
  if (!isObservabilityEnabled()) return;
  await Sentry.flush(timeoutMs).catch(() => undefined);
}
