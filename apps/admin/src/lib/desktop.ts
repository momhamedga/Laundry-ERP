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

interface DesktopBridge {
  license: DesktopLicenseApi;
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
