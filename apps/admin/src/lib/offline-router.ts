import { desktopBridge } from "@/lib/desktop";
import type { DesktopOfflineApi } from "@/lib/offline-types";
import { useConnectivityStore } from "@/store/connectivity-store";

/**
 * يختار مصدر البيانات: الخادم عند الاتصال، SQLite المحلّية عند انقطاعه.
 *
 * ═══════════ لماذا لا نلمس الخادم إطلاقاً ═══════════
 * طبقة الأوفلاين تعيش في عملية Electron الرئيسية لا في الخادم، فمسار
 * الأوفلاين يتخطّى الخادم و Prisma و Neon بالكامل:
 *
 *   متّصل   : الواجهة ← axios ← الخادم ← Neon
 *   منقطع  : الواجهة ← IPC   ← SQLite محلّية
 *
 * لذلك لا يحتاج هذا العمل أي تغيير في الـ API ولا في المصادقة: الرمز الذي
 * انتهت صلاحيته لا يعني شيئاً لعملية لا ترسل أي طلب HTTP أصلاً.
 */

/** متاح فقط داخل تطبيق سطح المكتب حيث توجد قاعدة محلّية */
export function offlineApi(): DesktopOfflineApi | null {
  return desktopBridge()?.offline ?? null;
}

/** هل مسار الأوفلاين متاح وصالح للاستخدام الآن؟ */
export function canUseOffline(): boolean {
  return useConnectivityStore.getState().status === "offline" && offlineApi() !== null;
}

/**
 * ينفّذ العملية عبر الخادم، ويتحوّل للمحلّي عند انقطاع قاعدة البيانات.
 *
 * المسار المحلّي اختياري: العمليات التي لا معنى لها بلا اتصال (التقارير،
 * إدارة المستخدمين، الإعدادات) تُمرَّر بلا `local` فتفشل برسالتها المعتادة
 * بدل أن تكذب على المستخدم بنجاح وهمي.
 *
 * نتحقّق من الحالة قبل المحاولة وبعد الفشل معاً: قد ينقطع الاتصال أثناء
 * الطلب نفسه، فالمراقب لا يكتشفه إلا في دورته التالية (حتى خمس ثوانٍ).
 */
export async function route<T>(opts: {
  remote: () => Promise<T>;
  local?: () => Promise<T>;
  /** لتشخيص المسار المتّخذ في السجلّات */
  label: string;
}): Promise<T> {
  const { remote, local, label } = opts;

  if (local && canUseOffline()) {
    logRoute(label, "local");
    return local();
  }

  try {
    const res = await remote();
    // نُسجّل المسار البعيد أيضاً: غياب أي سطر كان يعني «لم يُستدعَ الموجّه»
    // أو «استُدعي وذهب بعيداً»، وهما تشخيصان مختلفان تماماً لا يمكن التمييز
    // بينهما بلا هذا السطر — وقد كلّفنا ذلك دورة تشخيص كاملة.
    logRoute(label, "remote");
    return res;
  } catch (err) {
    if (!local || !offlineApi() || !looksLikeConnectivityFailure(err)) {
      logRoute(label, "remote-failed");
      throw err;
    }
    logRoute(label, "local-after-failure");
    // المراقب لم يلتقط الانقطاع بعد — نُصحّح الحالة فوراً بدل انتظار دورته
    useConnectivityStore.getState().setStatus("offline");
    return local();
  }
}

/**
 * هل يعني هذا الفشل «تعذّر بلوغ قاعدة البيانات» لا «طلبك خاطئ»؟
 *
 * حالتان مختلفتان تماماً تصلان إلى هنا:
 *  - الخادم المحلّي نفسه لا يستجيب  → لا استجابة إطلاقاً
 *  - الخادم يستجيب لكن Neon بعيدة   → 503 من /health أو 500 برسالتنا العربية
 *
 * الثانية هي الشائعة: الخادم مُدمج ومحلّي فهو حيّ دائماً تقريباً.
 */
function looksLikeConnectivityFailure(err: unknown): boolean {
  const e = err as { response?: { status?: number; data?: unknown }; code?: string } | undefined;
  if (!e) return false;

  if (!e.response) return e.code !== "ERR_CANCELED"; // إلغاء المستخدم ليس انقطاعاً
  if (e.response.status === 503) return true;
  if (e.response.status !== 500) return false;

  // الرمز أولاً: عقدٌ مستقرّ لا يتأثّر بصياغة الرسالة. مطابقة النصّ تبقى
  // احتياطاً لخادم أقدم لا يرسل الرمز بعد (نسخة مدمجة لم تُحدَّث).
  const body = e.response.data as { message?: string; code?: string } | undefined;
  if (body?.code === "DB_UNREACHABLE") return true;
  return typeof body?.message === "string" && body.message.includes("قاعدة البيانات");
}

function logRoute(
  label: string,
  path: "local" | "remote" | "remote-failed" | "local-after-failure",
): void {
  const net = useConnectivityStore.getState().status;
  const hasLocal = offlineApi() !== null;
  desktopBridge()?.log?.("info", `offline-route: ${label} → ${path} (net=${net} local=${hasLocal})`);
}

/** ترقيم مطابق لما يعيده الخادم — يُحسب بعد الترشيح المحلّي لا قبله */
export function localMeta(page: number, limit: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}
