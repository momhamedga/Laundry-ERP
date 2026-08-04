/**
 * عقود نظام التراخيص المشترك بين التطبيق والمولّد (Phase 15B).
 * لا يحتوي هذا الملف أي منطق تشفير — أنواع فقط — ليبقى قابلاً للمشاركة بأمان.
 */

/** أنواع التراخيص المدعومة. */
export type LicenseType = "trial" | "starter" | "professional" | "enterprise";

/** المزايا التي يمكن تفعيلها لكل ترخيص. */
export type LicenseFeature =
  | "offline_sync"
  | "backup"
  | "multi_branch"
  | "reports_advanced"
  | "hr"
  | "inventory";

/** قيمة تعني "بلا حدّ" في الحقول العددية. */
export const UNLIMITED = -1;

/**
 * مكوّنات بصمة الجهاز. تُخزَّن **منفصلة** (لا مدموجة في هاش واحد) كي نستطيع
 * المطابقة بالنقاط: تغيّر قرص أو إعادة تثبيت ويندوز لا يجب أن يكسر الترخيص.
 */
export interface FingerprintComponents {
  /** HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid — يتغيّر بإعادة تثبيت ويندوز */
  machineGuid: string;
  /** Win32_ComputerSystemProduct.UUID — ثابت للّوحة الأم */
  systemUuid: string;
  /** Win32_BaseBoard.SerialNumber */
  baseboardSerial: string;
  /** Win32_Processor.ProcessorId — ثابت لطراز المعالج */
  cpuId: string;
  /** Win32_DiskDrive.SerialNumber لأول قرص ثابت */
  diskSerial: string;
}

/** البصمة الكاملة: المكوّنات + المعرّف المعروض + الهاش الكامل. */
export interface MachineFingerprint {
  /** معرّف معروض للمستخدم مثل LAU-7F3A-91BC-4D22 */
  machineId: string;
  /** SHA-256 لكل المكوّنات مجتمعة (للمطابقة التامة عند الحاجة) */
  fullHash: string;
  /** هاش منفصل لكل مكوّن (للمطابقة بالنقاط) */
  components: Record<keyof FingerprintComponents, string>;
}

/** حمولة الترخيص الموقَّعة. أي تعديل فيها يُبطل التوقيع. */
export interface LicensePayload {
  /** إصدار صيغة الترخيص — للتوافق المستقبلي */
  schema: 1;
  licenseId: string;
  customerName: string;
  companyName: string;
  type: LicenseType;
  /** ISO 8601 — null تعني ترخيصاً دائماً */
  expiryDate: string | null;
  issueDate: string;
  maxUsers: number;
  maxDevices: number;
  maxBranches: number;
  features: LicenseFeature[];
  /** أدنى/أعلى إصدار تطبيق يقبله هذا الترخيص (semver major.minor) */
  minAppVersion: string;
  /** بصمة الجهاز المسموح له — المكوّنات المُهَشَّمة */
  machine: {
    machineId: string;
    fullHash: string;
    components: Record<keyof FingerprintComponents, string>;
  };
}

/** ملفّ الترخيص كما يُسلَّم للعميل: حمولة + توقيع RSA-4096. */
export interface LicenseFile {
  payload: LicensePayload;
  /** توقيع base64 لـ SHA-256 على الحمولة المُقنَّنة */
  signature: string;
  /** خوارزمية التوقيع — صريحة لمنع خلط الخوارزميات */
  algorithm: "RSA-SHA256";
}

/** أسباب رفض الترخيص — تُستخدم في السجلّ وواجهة المستخدم. */
export type LicenseFailureReason =
  | "no_license"
  | "malformed"
  | "signature_invalid"
  | "machine_mismatch"
  | "expired"
  | "version_unsupported"
  | "clock_tampered"
  | "not_yet_valid";

/** نتيجة التحقق. */
export interface LicenseStatus {
  valid: boolean;
  reason?: LicenseFailureReason;
  /** تفصيل بشري للعرض والسجلّ */
  message?: string;
  payload?: LicensePayload;
  /** عدد المكوّنات المطابقة من أصل 5 */
  machineScore?: number;
  /** الأيام المتبقّية قبل الانتهاء (null = دائم) */
  daysRemaining?: number | null;
  /** هل نحن داخل فترة السماح بعد الفشل؟ */
  inGrace?: boolean;
  graceDaysRemaining?: number;
}

/** حدود كل نوع ترخيص — مرجع واحد يستخدمه المولّد والتطبيق. */
export const LICENSE_PRESETS: Record<
  LicenseType,
  { maxUsers: number; maxDevices: number; maxBranches: number; features: LicenseFeature[]; trialDays?: number }
> = {
  trial: {
    maxUsers: 1,
    maxDevices: 1,
    maxBranches: 1,
    features: ["backup"],
    trialDays: 14,
  },
  starter: {
    maxUsers: 2,
    maxDevices: 1,
    maxBranches: 1,
    features: ["backup"],
  },
  professional: {
    maxUsers: 5,
    maxDevices: 3,
    maxBranches: UNLIMITED,
    features: ["backup", "offline_sync", "multi_branch", "reports_advanced"],
  },
  enterprise: {
    maxUsers: UNLIMITED,
    maxDevices: UNLIMITED,
    maxBranches: UNLIMITED,
    features: ["backup", "offline_sync", "multi_branch", "reports_advanced", "hr", "inventory"],
  },
};

/** الحدّ الأدنى لعدد المكوّنات المطابقة لقبول الجهاز (3 من 5). */
export const MACHINE_MATCH_THRESHOLD = 3;

/** أيام السماح بعد فشل التحقق قبل تقييد البيع. */
export const GRACE_PERIOD_DAYS = 14;
