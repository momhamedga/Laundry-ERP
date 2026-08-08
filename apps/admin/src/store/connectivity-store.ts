import { create } from "zustand";
import { desktopBridge, type DesktopNetStatus } from "@/lib/desktop";

/**
 * حالة الاتصال الفعليّة بقاعدة البيانات — لا بالشبكة.
 *
 * ═══════════ لماذا لا نستخدم navigator.onLine ═══════════
 * يقول «متّصل» لمجرّد وجود واي فاي، فالحاسوب المتّصل براوتر بلا إنترنت يبدو
 * متّصلاً. وهو ما يهمّنا فعلاً ليس الشبكة بل: هل نصل إلى Neon؟
 *
 * الـ main يقيس هذا بدقّة: يستدعي /health كل خمس ثوانٍ، وتلك النقطة تنفّذ
 * SELECT 1 على القاعدة وترجع 503 إن تعذّرت. فنستهلك إشارته بدل اختراع أخرى.
 *
 * خارج Electron (متصفّح عادي) نبقى "online" دائماً: لا طبقة محلّية أصلاً،
 * ولا معنى لوضع أوفلاين بلا مكان يُكتب فيه.
 */
interface ConnectivityState {
  status: DesktopNetStatus;
  /** هل بدأنا الاستماع؟ يمنع تكرار الاشتراك عند إعادة التركيب */
  initialized: boolean;
  /** آخر لحظة كنّا فيها متّصلين — تُستخدم في رسائل الواجهة */
  lastOnlineAt: number | null;
  init(): void;
  setStatus(s: DesktopNetStatus): void;
}

export const useConnectivityStore = create<ConnectivityState>((set, get) => ({
  status: "online",
  initialized: false,
  lastOnlineAt: null,

  setStatus(s) {
    const prev = get().status;
    if (prev === s) return;
    set({ status: s, lastOnlineAt: s === "online" ? Date.now() : get().lastOnlineAt });

    // نسجّل من جهة الواجهة لا الـ main وحده: الـ main قد يعرف بالانقطاع
    // بينما لا يصل الخبر إلى الواجهة، وحينها يبقى الموجّه يظنّ نفسه متّصلاً
    // بلا أي أثر يميّز الحالتين في السجلّ.
    desktopBridge()?.log?.("info", `offline-net: الواجهة استلمت ${prev} → ${s}`);

    // عودة الاتصال: نجدّد الكاش فوراً كي لا يعتمد الانقطاع القادم على كتالوج قديم
    if (prev === "offline" && s === "online") void refreshCacheQuietly();
  },

  init() {
    if (get().initialized) return;
    const bridge = desktopBridge();
    if (!bridge?.status || !bridge.on) return; // متصفّح عادي — نبقى online

    set({ initialized: true });

    // القيمة الابتدائية: الاشتراك يبثّ عند التحوّل فقط، فلو أقلعنا ونحن
    // غير متّصلين لن يصلنا شيء حتى يعود الاتصال.
    void bridge.status
      .net()
      .then((s) => get().setStatus(s))
      .catch(() => undefined);

    bridge.on.netStatus((s) => get().setStatus(s));

    // ملء أوّلي: أول تشغيل بعد التثبيت يبدأ بكاش فارغ، فلو انقطع الإنترنت
    // قبل أي تحديث لن يجد المستخدم خدمة واحدة يختارها
    void refreshCacheQuietly();
  },
}));

/**
 * تحديث الكاش بلا إزعاج المستخدم.
 *
 * الاستيراد ديناميكي كي لا يجرّ متجرَ الاتصال — وهو من أوائل ما يُحمَّل —
 * سلسلةَ استيرادات طبقة الخدمات وعميل HTTP معها.
 */
async function refreshCacheQuietly(): Promise<void> {
  try {
    const { refreshOfflineCache } = await import("@/lib/offline-cache-sync");
    await refreshOfflineCache();
  } catch {
    // تجاهل متعمّد — الكاش تحسين لا شرط
  }
}

/** هل نعمل الآن بلا وصول لقاعدة البيانات؟ */
export function isOffline(): boolean {
  return useConnectivityStore.getState().status === "offline";
}
