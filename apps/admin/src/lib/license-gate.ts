/**
 * حارس الترخيص خارج React (Phase 15B).
 *
 * نقطة تحقّق **واحدة** يمرّ منها كل إنشاء لبيانات مالية، بدل تكرار الفحص في كل
 * شاشة: تُركَّب على معترض طلبات axios، فتغطّي العملاء والطلبات والمدفوعات
 * والفواتير والمشتريات والموردين تلقائياً — الحالية والمستقبلية.
 *
 * المنع الحقيقي مفروض في العملية الرئيسية (حارس IPC + حارس الشبكة). هذه الطبقة
 * تمنع الطلب **قبل إرساله** كي يرى المستخدم حواراً واضحاً بدل خطأ شبكة غامض.
 */

import { desktopBridge, type DesktopLicenseStatus } from "@/lib/desktop";

/** مسارات الإنشاء الممنوعة — مطابقة لقائمة العملية الرئيسية. */
const BLOCKED_CREATE_PATHS = [
  "/customers",
  "/orders",
  "/payments",
  "/invoices",
  "/purchases",
  "/suppliers",
] as const;

/** الحدث الذي يفتح حوار المنع في الواجهة. */
export const LICENSE_BLOCKED_EVENT = "license:blocked";

/** رسالة موحّدة — نفس نصّ العملية الرئيسية. */
export const LICENSE_BLOCKED_MESSAGE =
  "انتهت صلاحية الترخيص. يمكنك الاستمرار في مشاهدة البيانات والنسخ الاحتياطي " +
  "والتقارير والطباعة، لكن لا يمكن إنشاء عمليات جديدة. يرجى تفعيل البرنامج.";

/** خطأ مميَّز كي تفرّقه الواجهة عن أخطاء الشبكة. */
export class LicenseBlockedError extends Error {
  readonly code = "LICENSE_BLOCKED";
  constructor() {
    super(LICENSE_BLOCKED_MESSAGE);
    this.name = "LicenseBlockedError";
  }
}

/** هل هذا الطلب إنشاء بيانات مالية؟ (POST فقط — التعديل والحذف مسموحان) */
export function isBlockedCreate(method: string | undefined, url: string | undefined): boolean {
  if ((method ?? "get").toUpperCase() !== "POST") return false;
  const path = (url ?? "").split("?")[0] ?? "";
  return BLOCKED_CREATE_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

// ==================== حالة مُخزَّنة مؤقتاً ====================

/**
 * استدعاء IPC لكل طلب POST مكلف بلا داعٍ، والحالة لا تتغيّر إلا بالاستيراد أو
 * بمرور يوم. نُخزّنها 60 ثانية، ويُبطلها الاستيراد فوراً.
 */
const TTL_MS = 60_000;
let cached: { status: DesktopLicenseStatus; at: number } | null = null;
let inFlight: Promise<DesktopLicenseStatus | null> | null = null;

/** يُبطل الكاش — يُستدعى بعد استيراد ترخيص ناجح. */
export function invalidateLicenseCache(): void {
  cached = null;
}

async function readStatus(): Promise<DesktopLicenseStatus | null> {
  const bridge = desktopBridge();
  if (!bridge) return null; // متصفّح عادي: لا ترخيص ⇒ لا منع

  if (cached && Date.now() - cached.at < TTL_MS) return cached.status;

  // طلب واحد مشترك مهما تعددت الطلبات المتزامنة
  inFlight ??= bridge.license
    .status()
    .then((s) => {
      cached = { status: s, at: Date.now() };
      return s;
    })
    .catch(() => null) // تعذّرت القراءة ⇒ لا نمنع المستخدم
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/**
 * يرمي `LicenseBlockedError` إذا كان الإنشاء ممنوعاً، ويفتح حوار المنع.
 * متساهل عمداً عند الشك: خارج Electron، أو عند تعذّر قراءة الحالة، يمرّ الطلب
 * (العملية الرئيسية هي المرجع النهائي على أي حال).
 */
export async function assertSellingAllowed(): Promise<void> {
  const status = await readStatus();
  if (status === null) return;
  if (status.valid || status.inGrace === true) return;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LICENSE_BLOCKED_EVENT));
  }
  throw new LicenseBlockedError();
}
