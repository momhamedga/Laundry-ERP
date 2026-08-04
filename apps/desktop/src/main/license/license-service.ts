import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import {
  decodeLicenseFile,
  getMachineFingerprint,
  validateLicense,
  type LicenseStatus,
  type MachineFingerprint,
} from "@laundry/license-sdk";
import { scoped } from "../logger.js";
import { getDb } from "../db/database.js";
import { LICENSE_PUBLIC_KEY } from "./public-key.js";

const log = scoped("license");

/**
 * خدمة الترخيص في التطبيق (Phase 15B).
 *
 * التصميم: التطبيق **يتحقق فقط** — لا يملك مفتاحاً خاصاً ولا يستطيع إصدار
 * تراخيص. حالة الترخيص تُحسب مرّة عند الإقلاع وتُخزَّن في الذاكرة.
 *
 * سياسة الفشل (قرار منتج): فترة سماح 14 يوماً تعمل فيها المغسلة كاملة مع
 * تحذير، ثم يُقيَّد البيع مع إبقاء القراءة والتصدير والنسخ الاحتياطي — كي لا
 * يتوقف عمل العميل فجأة بسبب تبديل قرص أو انتهاء ترخيص ليلاً.
 *
 * حالة السماح وآخر وقت مُشاهد تُخزَّن في جدول settings داخل قاعدة SQLite
 * **المشفّرة**، فلا تُمسح بحذف ملفّ عادي ولا تُحرَّر بسهولة.
 */

const LICENSE_FILE = "license.dat";
const K_GRACE_START = "license.graceStartedAt";
const K_LAST_SEEN = "license.lastSeen";

let cached: LicenseStatus | null = null;
let fingerprint: MachineFingerprint | null = null;

function licensePath(): string {
  return path.join(app.getPath("userData"), LICENSE_FILE);
}

/** قراءة/كتابة مفاتيح الحالة من جدول settings المشفّر (لا يرمي). */
function readSetting(key: string): string | null {
  try {
    const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as
      | { value: string | null }
      | undefined;
    return row?.value ?? null;
  } catch {
    return null;
  }
}
function writeSetting(key: string, value: string): void {
  try {
    getDb()
      .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(key, value);
  } catch (err) {
    log.warn(`تعذّر حفظ ${key}:`, err);
  }
}

/** بصمة هذا الجهاز (تُحسب مرّة — قراءتها من النظام مكلفة نسبيّاً). */
export function getFingerprint(): MachineFingerprint {
  if (!fingerprint) fingerprint = getMachineFingerprint();
  return fingerprint;
}

/** يقرأ ملفّ الترخيص من قرص المستخدم إن وُجد. */
function readLicenseFile(): ReturnType<typeof decodeLicenseFile> {
  const p = licensePath();
  if (!fs.existsSync(p)) return null;
  try {
    return decodeLicenseFile(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

/** يعيد حساب حالة الترخيص ويحدّث حالة السماح وآخر وقت مُشاهد. */
export function evaluateLicense(): LicenseStatus {
  const now = new Date();
  const lastSeenRaw = readSetting(K_LAST_SEEN);
  const graceRaw = readSetting(K_GRACE_START);

  const status = validateLicense({
    license: readLicenseFile(),
    publicKeyPem: LICENSE_PUBLIC_KEY,
    fingerprint: getFingerprint(),
    appVersion: app.getVersion(),
    now,
    lastSeen: lastSeenRaw ? new Date(lastSeenRaw) : null,
    graceStartedAt: graceRaw ? new Date(graceRaw) : null,
  });

  // إدارة نافذة السماح: تبدأ عند أول فشل، وتُمسح عند أول نجاح
  if (status.valid) {
    if (graceRaw) writeSetting(K_GRACE_START, "");
  } else if (!graceRaw) {
    writeSetting(K_GRACE_START, now.toISOString());
  }

  // آخر وقت مُشاهد يتقدّم للأمام فقط — كشف إرجاع الساعة
  if (!lastSeenRaw || now.getTime() > new Date(lastSeenRaw).getTime()) {
    writeSetting(K_LAST_SEEN, now.toISOString());
  }

  cached = status;
  return status;
}

/** الحالة المحسوبة (تُحسب عند أول طلب). */
export function getLicenseStatus(): LicenseStatus {
  return cached ?? evaluateLicense();
}

/**
 * هل يُسمح بعمليات البيع (إنشاء طلب/دفعة)؟
 * صالح ⇒ نعم. غير صالح لكن داخل السماح ⇒ نعم مع تحذير. بعد السماح ⇒ لا.
 * القراءة والتصدير والنسخ الاحتياطي تبقى متاحة دائماً بأي حال.
 */
export function isSellingAllowed(): boolean {
  const s = getLicenseStatus();
  return s.valid || s.inGrace === true;
}

/** يستورد ملفّ ترخيص جديد ويتحقق منه قبل الحفظ. */
export function importLicense(content: string): LicenseStatus {
  const parsed = decodeLicenseFile(content);
  if (!parsed) {
    log.error("license import failed: الملفّ تالف أو ليس ترخيصاً");
    return { valid: false, reason: "malformed", message: "الملفّ تالف أو ليس ملفّ ترخيص" };
  }
  // نتحقق **قبل** الكتابة كي لا نستبدل ترخيصاً صالحاً بآخر فاسد
  const check = validateLicense({
    license: parsed,
    publicKeyPem: LICENSE_PUBLIC_KEY,
    fingerprint: getFingerprint(),
    appVersion: app.getVersion(),
    now: new Date(),
    lastSeen: null,
    graceStartedAt: null,
  });
  if (!check.valid) {
    log.error(`license import rejected: ${check.reason} — ${check.message ?? ""}`);
    return check;
  }
  try {
    fs.writeFileSync(licensePath(), content, "utf8");
  } catch (err) {
    log.error("تعذّر حفظ ملفّ الترخيص:", err);
    return { valid: false, reason: "malformed", message: "تعذّر حفظ الملفّ على القرص" };
  }
  writeSetting(K_GRACE_START, "");
  log.info(
    `license imported — ${check.payload?.customerName} / ${check.payload?.type} / ينتهي ${check.payload?.expiryDate?.slice(0, 10) ?? "دائم"}`,
  );
  return evaluateLicense();
}

/** طلب التفعيل الذي يرسله العميل للمطوّر. */
export function buildActivationRequest(): {
  machineId: string;
  fullHash: string;
  components: MachineFingerprint["components"];
  appVersion: string;
  requestedAt: string;
} {
  const fp = getFingerprint();
  return {
    machineId: fp.machineId,
    fullHash: fp.fullHash,
    components: fp.components,
    appVersion: app.getVersion(),
    requestedAt: new Date().toISOString(),
  };
}

/** يسجّل حالة الترخيص عند الإقلاع بوضوح يفيد الدعم الفني. */
export function logLicenseState(status: LicenseStatus = getLicenseStatus()): void {
  if (status.valid) {
    const p = status.payload;
    log.info(
      `license OK — ${p?.customerName ?? "?"} / ${p?.type ?? "?"} / ` +
        `${p?.expiryDate ? `ينتهي بعد ${status.daysRemaining} يوماً` : "دائم"} / تطابق الجهاز ${status.machineScore}/5`,
    );
  } else if (status.inGrace) {
    log.warn(
      `license INVALID (${status.reason}) — داخل فترة السماح، متبقٍّ ${status.graceDaysRemaining} يوماً — ${status.message ?? ""}`,
    );
  } else {
    log.error(`license INVALID (${status.reason}) — انتهت فترة السماح — ${status.message ?? ""}`);
  }
}
