import { scoreMatch } from "./fingerprint.js";
import { verifyLicenseSignature } from "./crypto.js";
import {
  GRACE_PERIOD_DAYS,
  MACHINE_MATCH_THRESHOLD,
  type LicenseFile,
  type LicensePayload,
  type LicenseStatus,
  type MachineFingerprint,
} from "./types.js";

/**
 * منطق التحقق من الترخيص (Phase 15B).
 *
 * ترتيب الفحوص مقصود: التوقيع أولاً، فلا نثق بأي حقل قبل إثبات أصالته. ثم
 * الجهاز، ثم الصلاحية الزمنية، ثم الإصدار.
 */

const DAY_MS = 86_400_000;

/** فحص شكل الحمولة قبل استخدامها (دفاع ضد ملفّ موقَّع بمخطّط قديم/غريب). */
function isWellFormed(p: unknown): p is LicensePayload {
  if (!p || typeof p !== "object") return false;
  const x = p as Record<string, unknown>;
  return (
    x.schema === 1 &&
    typeof x.licenseId === "string" &&
    typeof x.customerName === "string" &&
    typeof x.type === "string" &&
    typeof x.issueDate === "string" &&
    (x.expiryDate === null || typeof x.expiryDate === "string") &&
    typeof x.machine === "object" &&
    x.machine !== null &&
    Array.isArray(x.features)
  );
}

/** يقارن إصدارين بصيغة major.minor فقط. يعيد سالباً/صفراً/موجباً. */
function compareVersion(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 2; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}

export interface ValidateInput {
  license: LicenseFile | null;
  publicKeyPem: string;
  fingerprint: MachineFingerprint;
  appVersion: string;
  /** الوقت الحالي — يُمرَّر للاختبار ولكشف تلاعب الساعة */
  now?: Date;
  /**
   * آخر وقت رآه التطبيق (مخزَّن في قاعدة مشفّرة). لو كانت ساعة النظام أقدم منه
   * بفارق معتبر فهذه محاولة إرجاع للساعة لتمديد الصلاحية.
   */
  lastSeen?: Date | null;
  /** متى بدأت فترة السماح (إن كانت بدأت) */
  graceStartedAt?: Date | null;
}

/** يحسب حالة الترخيص كاملة. لا يرمي أبداً. */
export function validateLicense(input: ValidateInput): LicenseStatus {
  const now = input.now ?? new Date();
  const { license, publicKeyPem, fingerprint, appVersion } = input;

  const withGrace = (status: LicenseStatus): LicenseStatus => {
    if (status.valid) return status;
    // فترة السماح تبدأ من أول فشل وتستمر GRACE_PERIOD_DAYS يوماً
    const start = input.graceStartedAt ?? now;
    const used = Math.floor((now.getTime() - start.getTime()) / DAY_MS);
    const remaining = GRACE_PERIOD_DAYS - used;
    if (remaining > 0) {
      return { ...status, inGrace: true, graceDaysRemaining: remaining };
    }
    return { ...status, inGrace: false, graceDaysRemaining: 0 };
  };

  if (!license) {
    return withGrace({ valid: false, reason: "no_license", message: "لا يوجد ترخيص مُثبَّت" });
  }

  // كشف إرجاع ساعة النظام — قبل أي فحص زمني آخر
  if (input.lastSeen && now.getTime() < input.lastSeen.getTime() - DAY_MS) {
    return withGrace({
      valid: false,
      reason: "clock_tampered",
      message: "ساعة النظام أقدم من آخر تشغيل مُسجَّل — صحّح التاريخ والوقت",
    });
  }

  // 1) التوقيع أولاً — لا نثق بأي حقل قبله
  if (!verifyLicenseSignature(license, publicKeyPem)) {
    return withGrace({
      valid: false,
      reason: "signature_invalid",
      message: "توقيع الترخيص غير صالح أو الملفّ مُعدَّل",
    });
  }

  if (!isWellFormed(license.payload)) {
    return withGrace({ valid: false, reason: "malformed", message: "بنية الترخيص غير مدعومة" });
  }
  const p = license.payload;

  // 2) الجهاز — مطابقة بالنقاط (3 من 5)
  const score = scoreMatch(fingerprint.components, p.machine.components);
  if (score < MACHINE_MATCH_THRESHOLD) {
    return withGrace({
      valid: false,
      reason: "machine_mismatch",
      message: `الترخيص صادر لجهاز آخر (تطابق ${score} من ${MACHINE_MATCH_THRESHOLD} المطلوبة)`,
      machineScore: score,
      payload: p,
    });
  }

  // 3) الصلاحية الزمنية
  const issued = new Date(p.issueDate);
  if (!Number.isNaN(issued.getTime()) && now.getTime() < issued.getTime() - DAY_MS) {
    return withGrace({
      valid: false,
      reason: "not_yet_valid",
      message: "تاريخ إصدار الترخيص في المستقبل",
      machineScore: score,
      payload: p,
    });
  }

  let daysRemaining: number | null = null;
  if (p.expiryDate !== null) {
    const expiry = new Date(p.expiryDate);
    if (Number.isNaN(expiry.getTime())) {
      return withGrace({ valid: false, reason: "malformed", message: "تاريخ انتهاء غير صالح", payload: p });
    }
    daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / DAY_MS);
    if (daysRemaining <= 0) {
      return withGrace({
        valid: false,
        reason: "expired",
        message: `انتهت صلاحية الترخيص بتاريخ ${p.expiryDate.slice(0, 10)}`,
        machineScore: score,
        daysRemaining: 0,
        payload: p,
      });
    }
  }

  // 4) الإصدار
  if (p.minAppVersion && compareVersion(appVersion, p.minAppVersion) < 0) {
    return withGrace({
      valid: false,
      reason: "version_unsupported",
      message: `هذا الترخيص يتطلّب الإصدار ${p.minAppVersion} أو أحدث`,
      machineScore: score,
      payload: p,
    });
  }

  return { valid: true, payload: p, machineScore: score, daysRemaining, inGrace: false };
}

/** هل الميزة مُفعَّلة في هذا الترخيص؟ */
export function hasFeature(status: LicenseStatus, feature: string): boolean {
  return !!status.payload?.features?.includes(feature as never);
}
