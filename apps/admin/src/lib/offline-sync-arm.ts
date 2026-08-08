import { desktopBridge } from "@/lib/desktop";
import { offlineApi } from "@/lib/offline-router";
import { useAuthStore } from "@/store/auth-store";

/**
 * يمدّ محرّك المزامنة برمز الوصول كلّما تغيّر.
 *
 * ═══════════ لماذا كان الطابور لا يُفرَّغ أبداً ═══════════
 * المحرّك مبنيّ بالكامل — إعادة محاولة، تراجع أسّي، رسائل فاشلة — لكن
 * setAuth لم يكن يُستدعى من أي مكان، فكان يبقى غير مُصادَق فيتخطّى كل دورة.
 * النتيجة: ما يُكتب دون اتصال يبقى محلّياً إلى الأبد ولا يصعد للخادم.
 *
 * نُمرّر الرمز عند كل تغيّر لا مرة واحدة: العمل دون اتصال قد يطول ساعات
 * فينتهي الرمز ويُجدَّد، والمحرّك يحتاج الرمز الحيّ لا الميت.
 *
 * الرمز يبقى في الذاكرة كما هو الآن — نمرّره لعملية Electron الرئيسية التي
 * تعمل بامتيازات المستخدم نفسه، ولا يُكتب على القرص في أي خطوة.
 */
export function armOfflineSync(): () => void {
  // لا نلتقط الجسر مرّة واحدة هنا: لو لم يكن جاهزاً لحظة التركيب كنّا نعود
  // بلا اشتراك إطلاقاً فلا يُسلَّح المحرّك ولا يُملأ الكاش بعد الدخول — عطل
  // صامت لا يظهر إلا يوم ينقطع الإنترنت. نقرأ الجسر عند كل استدعاء بدلاً
  // من ذلك، فالاشتراك يبقى قائماً ويعمل متى توفّر.
  const push = (token: string | null): void => {
    void offlineApi()?.sync.setAuth(token).catch(() => undefined);
  };

  push(useAuthStore.getState().accessToken);

  return useAuthStore.subscribe((state, prev) => {
    if (state.accessToken === prev.accessToken) return;
    push(state.accessToken);

    // أوّل رمز بعد تسجيل الدخول: نملأ الكاش الآن.
    //
    // التحديث عند الإقلاع يسبق الدخول فتُرفض طلباته بـ 401، والتحديث عند
    // عودة الاتصال لا يقع إن لم ينقطع الإنترنت أصلاً. فمستخدم يثبّت البرنامج
    // ويسجّل دخوله ويعمل يومه كاملاً متّصلاً كان سيبقى بكاش فارغ — ولا
    // يكتشف ذلك إلا أوّل مرة ينقطع فيها الإنترنت، وهي أسوأ لحظة للاكتشاف.
    if (prev.accessToken === null && state.accessToken !== null) {
      void refreshCacheQuietly();
    }
  });
}

async function refreshCacheQuietly(): Promise<void> {
  desktopBridge()?.log?.("info", "offline-cache: بدء التحديث بعد تسجيل الدخول");
  try {
    const { refreshOfflineCache } = await import("@/lib/offline-cache-sync");
    await refreshOfflineCache();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    desktopBridge()?.log?.("warn", `offline-cache: فشل التحديث بعد الدخول — ${msg}`);
  }
}
