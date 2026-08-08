import type { DesktopOfflineApi, SyncState } from "@/lib/offline-types";

/**
 * وصول مُصان بالأنواع لجسر Electron (window.desktop).
 *
 * نفس واجهة الأدمن تعمل في المتصفّح وداخل تطبيق سطح المكتب، فالجسر قد لا يكون
 * موجوداً. كل المستهلكين يجب أن يتعاملوا مع null بدل افتراض وجوده.
 */

/** حالة الترخيص كما يعيدها الـ main — مطابقة لـ LicenseStatus في @laundry/license-sdk */
export interface DesktopLicenseStatus {
  valid: boolean;
  reason?:
    | "no_license"
    | "malformed"
    | "signature_invalid"
    | "machine_mismatch"
    | "expired"
    | "not_yet_valid"
    | "version_unsupported"
    | "clock_tampered";
  message?: string;
  payload?: {
    licenseId: string;
    customerName: string;
    companyName: string;
    type: "trial" | "starter" | "professional" | "enterprise";
    expiryDate: string | null;
    issueDate: string;
    maxUsers: number;
    maxDevices: number;
    maxBranches: number;
    features: string[];
    machine: { machineId: string };
  };
  machineScore?: number;
  daysRemaining?: number | null;
  inGrace?: boolean;
  graceDaysRemaining?: number;
}

interface DesktopLicenseApi {
  status(): Promise<DesktopLicenseStatus>;
  machineId(): Promise<string>;
  exportRequest(): Promise<string | null>;
  import(content?: string): Promise<DesktopLicenseStatus | null>;
}

/** حالة الخادم المحلّي المُدمج — يبثّها main أثناء الإقلاع */
export type DesktopBackendStatus =
  | "starting"
  | "ready"
  | "reusing-external"
  | "crashed"
  | "restarting"
  | "stopped"
  | "unconfigured";

/** حالة الاتصال كما يقيسها الـ main: نجاح فحص /health الذي يلمس قاعدة البيانات */
export type DesktopNetStatus = "online" | "offline";

interface DesktopBridge {
  license: DesktopLicenseApi;
  system?: {
    /** يفتح مستنداً بعارض النظام الافتراضي؛ يعيد مسار الملفّ المؤقّت */
    openDocument(base64: string, fileName: string): Promise<string>;
  };
  status?: {
    backend(): Promise<DesktopBackendStatus>;
    net(): Promise<DesktopNetStatus>;
  };
  /** طبقة SQLite المحلّية + طابور المزامنة (Phase 11.6) */
  offline?: DesktopOfflineApi;
  /** يكتب في سجلّ التطبيق — يجمع سطور الواجهة والـ main في ملفّ واحد */
  log?(level: "info" | "warn" | "error", message: string): void;
  on?: {
    /** يعيد دالة إلغاء الاشتراك */
    netStatus(cb: (s: DesktopNetStatus) => void): () => void;
    syncStatus(cb: (s: SyncState) => void): () => void;
  };
}

/**
 * رسالة دقيقة عند تعذّر الوصول للخادم داخل تطبيق سطح المكتب.
 *
 * الخادم مُدمج ومحلّي ويأخذ ~25 ثانية ليقلع، فرسالة «تأكد من اتصالك بالشبكة»
 * مضلّلة تماماً: المستخدم يفحص الواي فاي بينما المشكلة أن النظام لم يجهز بعد.
 * نُعيد null خارج Electron أو إن تعذّر تحديد الحالة، فيُستخدم النصّ العام.
 */
export async function desktopBackendHint(): Promise<string | null> {
  const b = desktopBridge();
  if (!b?.status) return null;
  try {
    switch (await b.status.backend()) {
      case "starting":
      case "restarting":
        return "جارٍ تشغيل النظام… انتظر لحظات ثم أعد المحاولة.";
      case "unconfigured":
        return "لم يكتمل تجهيز هذا الجهاز. راجع مورّد النظام.";
      case "crashed":
        return "تعذّر تشغيل خادم النظام. أعد تشغيل البرنامج، وإن تكرّر راجع الدعم الفني.";
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/** الجسر إن كنّا داخل Electron، وإلا null (متصفّح عادي). */
export function desktopBridge(): DesktopBridge | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { desktop?: DesktopBridge };
  return w.desktop?.license ? w.desktop : null;
}

/** هل نعمل داخل تطبيق سطح المكتب؟ */
export function isDesktop(): boolean {
  return desktopBridge() !== null;
}

/** أسماء أنواع التراخيص بالعربية للعرض */
export const LICENSE_TYPE_LABEL: Record<string, string> = {
  trial: "تجريبي",
  starter: "أساسي",
  professional: "احترافي",
  enterprise: "مؤسسي",
};

/** رسالة عربية موجزة لكل سبب فشل (تكمّل رسالة الـ main) */
export const LICENSE_REASON_LABEL: Record<string, string> = {
  no_license: "لا يوجد ترخيص مُثبَّت",
  malformed: "ملفّ الترخيص تالف",
  signature_invalid: "توقيع الترخيص غير صالح أو الملفّ مُعدَّل",
  machine_mismatch: "الترخيص صادر لجهاز آخر",
  expired: "انتهت صلاحية الترخيص",
  not_yet_valid: "تاريخ بدء الترخيص لم يحن بعد",
  version_unsupported: "الترخيص لا يدعم هذا الإصدار",
  clock_tampered: "ساعة النظام غير صحيحة",
};

/** -1 تعني غير محدود في حدود الترخيص */
export function limitLabel(n: number | undefined): string {
  if (n === undefined) return "—";
  return n === -1 ? "غير محدود" : String(n);
}
