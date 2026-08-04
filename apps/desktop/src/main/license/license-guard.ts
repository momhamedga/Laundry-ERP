import { dialog, type Session } from "electron";
import { scoped } from "../logger.js";
import { notify } from "../services/notifications.js";
import { getMainWindow } from "../windows/main-window.js";
import { getLicenseStatus, isSellingAllowed } from "./license-service.js";

const log = scoped("license-guard");

/**
 * نقطة التحقق الموحّدة لفرض الترخيص (Phase 15B).
 *
 * قاعدة واحدة تُعاد الاستخدام في كل طبقات الكتابة بدل تكرار `if (!license)`
 * في كل شاشة:
 *
 *   1. `assertSellingAllowed()` — يحرس معالجات IPC للمستودع المحلّي.
 *   2. `installNetworkGuard()`  — يحرس طلبات POST للـ API المحلّي (الحاجز
 *      الأخير الذي لا يستطيع الـ renderer تجاوزه مهما عُدّلت شيفرته).
 *   3. `warnOnStartup()`        — تنبيهات اقتراب الانتهاء عند الإقلاع.
 *
 * ما يُمنع: إنشاء بيانات مالية جديدة فقط.
 * ما يبقى متاحاً دائماً: القراءة، البحث، التصفية، التقارير، الطباعة، التصدير،
 * النسخ الاحتياطي والاستعادة، الإعدادات، الإشعارات، واستيراد الترخيص.
 */

/** رسالة المنع الموحّدة — نصّ واحد يظهر في كل الطبقات. */
export const LICENSE_BLOCKED_MESSAGE =
  "انتهت صلاحية الترخيص. يمكنك الاستمرار في مشاهدة البيانات والنسخ الاحتياطي " +
  "والتقارير والطباعة، لكن لا يمكن إنشاء عمليات جديدة. يرجى تفعيل البرنامج.";

/** رمز يميّز خطأ الترخيص عن أي خطأ آخر في الـ renderer. */
export const LICENSE_BLOCKED_CODE = "LICENSE_BLOCKED";

/**
 * يرمي خطأً موحّداً إذا كان البيع ممنوعاً. يُستدعى في بداية أي معالج ينشئ
 * بيانات مالية. الخطأ يُلتقط في غلاف `handle` ويعود للـ renderer كنتيجة
 * `{ ok: false }` — بلا انهيار ولا استثناء غير مُلتقَط.
 */
export function assertSellingAllowed(operation: string): void {
  if (isSellingAllowed()) return;
  log.warn(`blocked ${operation} — الترخيص غير صالح وانتهت فترة السماح`);
  throw new Error(`${LICENSE_BLOCKED_CODE}: ${LICENSE_BLOCKED_MESSAGE}`);
}

/**
 * مسارات الـ API التي تُنشئ بيانات مالية جديدة.
 * تُطابَق كبادئة على مسار الطلب، وتُفحص مع POST فقط — فالتعديل والحذف
 * والقراءة تبقى متاحة (العميل يجب أن يستطيع تصحيح بياناته وإغلاق طلباته).
 */
const BLOCKED_CREATE_PATHS = [
  "/api/v1/customers",
  "/api/v1/orders",
  "/api/v1/payments",
  "/api/v1/invoices",
  "/api/v1/purchases",
  "/api/v1/suppliers",
] as const;

/** هل هذا الطلب عملية إنشاء بيانات مالية؟ */
export function isBlockedCreateRequest(method: string, url: string): boolean {
  if (method.toUpperCase() !== "POST") return false;
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return false;
  }
  return BLOCKED_CREATE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * الحاجز الأخير: يلغي طلبات الإنشاء على مستوى الشبكة داخل جلسة التطبيق.
 *
 * حارس الواجهة يمنع العملية ويعرض الحوار قبل الوصول إلى هنا؛ هذا الحاجز موجود
 * لأن الـ renderer لا يُوثق به — لو عُدّلت شيفرة الواجهة يبقى المنع قائماً في
 * العملية الرئيسية. القراءة والتقارير والنسخ الاحتياطي لا تمرّ من هنا إطلاقاً.
 */
export function installNetworkGuard(session: Session): void {
  session.webRequest.onBeforeRequest((details, callback) => {
    if (!isBlockedCreateRequest(details.method, details.url)) {
      callback({ cancel: false });
      return;
    }
    if (isSellingAllowed()) {
      callback({ cancel: false });
      return;
    }
    log.warn(`blocked network create: ${details.method} ${details.url}`);
    showBlockedDialog();
    callback({ cancel: true });
  });
  log.info(`network guard installed on ${BLOCKED_CREATE_PATHS.length} create paths`);
}

/** يمنع تكرار الحوار عند تعدّد الطلبات المتزامنة. */
let dialogOpen = false;

/** حوار المنع الاحترافي — لا يُوقف التطبيق ولا يحجب النافذة أكثر من مرّة. */
export function showBlockedDialog(): void {
  if (dialogOpen) return;
  dialogOpen = true;
  const win = getMainWindow();
  const opts = {
    type: "warning" as const,
    title: "الترخيص غير مُفعَّل",
    message: "انتهت صلاحية الترخيص",
    detail:
      "يمكنك الاستمرار في:\n" +
      "  ✔ مشاهدة البيانات\n" +
      "  ✔ النسخ الاحتياطي والاستعادة\n" +
      "  ✔ التقارير والتصدير\n" +
      "  ✔ الطباعة\n\n" +
      "لكن لا يمكن إنشاء عمليات جديدة.\n\n" +
      "يرجى تفعيل البرنامج من صفحة «الترخيص».",
    buttons: ["حسناً"],
    noLink: true,
  };
  const done = (): void => {
    dialogOpen = false;
  };
  (win ? dialog.showMessageBox(win, opts) : dialog.showMessageBox(opts)).then(done, done);
}

/**
 * تنبيهات الإقلاع حسب قرب انتهاء الترخيص.
 *
 * 7 أيام  → إشعار هادئ غير مزعج
 * 3 أيام  → تحذير
 * اليوم الأخير أو بعد الانتهاء → حوار عند التشغيل
 *
 * يُستدعى مرّة واحدة بعد جاهزية النافذة.
 */
export function warnOnStartup(): void {
  const s = getLicenseStatus();

  // انتهت فترة السماح — البيع موقوف بالفعل
  if (!s.valid && s.inGrace !== true) {
    showBlockedDialog();
    return;
  }

  // داخل فترة السماح — نبّه بوضوح، والنظام ما زال يعمل كاملاً
  if (!s.valid) {
    const left = s.graceDaysRemaining ?? 0;
    if (left <= 1) {
      showGraceDialog(left);
    } else {
      notify(
        "الترخيص يحتاج تفعيلاً",
        `النظام يعمل كاملاً لمدة ${left} يوماً أخرى. فعّل البرنامج من صفحة «الترخيص».`,
      );
    }
    log.warn(`license in grace — ${left} days remaining`);
    return;
  }

  // ترخيص صالح — نبّه قبل الانتهاء
  const days = s.daysRemaining;
  if (days === null || days === undefined) return; // ترخيص دائم

  if (days <= 1) {
    showExpiringDialog(days);
  } else if (days <= 3) {
    notify("تحذير: الترخيص على وشك الانتهاء", `يتبقّى ${days} أيام. يرجى التجديد لتفادي توقّف البيع.`);
  } else if (days <= 7) {
    notify("تذكير بتجديد الترخيص", `يتبقّى ${days} أيام على انتهاء الترخيص.`);
  }
  if (days <= 7) log.warn(`license expiring in ${days} day(s)`);
}

function showExpiringDialog(days: number): void {
  const win = getMainWindow();
  const opts = {
    type: "warning" as const,
    title: "الترخيص على وشك الانتهاء",
    message: days <= 0 ? "ينتهي الترخيص اليوم" : "يتبقّى يوم واحد على انتهاء الترخيص",
    detail:
      "بعد الانتهاء سيستمر البرنامج في العمل، لكن إنشاء الطلبات والمدفوعات " +
      "سيتوقّف بعد فترة سماح قدرها 14 يوماً.\n\n" +
      "يرجى التواصل مع مورّد النظام لتجديد الترخيص.",
    buttons: ["حسناً"],
    noLink: true,
  };
  void (win ? dialog.showMessageBox(win, opts) : dialog.showMessageBox(opts));
}

function showGraceDialog(daysLeft: number): void {
  const win = getMainWindow();
  const opts = {
    type: "warning" as const,
    title: "الترخيص غير مُفعَّل",
    message:
      daysLeft <= 0
        ? "فترة السماح تنتهي اليوم"
        : `يتبقّى ${daysLeft} يوم على انتهاء فترة السماح`,
    detail:
      "النظام يعمل كاملاً حتى الآن، لكن بعد انتهاء فترة السماح سيتوقّف إنشاء " +
      "العمليات الجديدة بينما تبقى القراءة والتقارير والنسخ الاحتياطي متاحة.\n\n" +
      "يرجى تفعيل البرنامج من صفحة «الترخيص».",
    buttons: ["حسناً"],
    noLink: true,
  };
  void (win ? dialog.showMessageBox(win, opts) : dialog.showMessageBox(opts));
}
