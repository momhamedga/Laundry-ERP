import crypto from "node:crypto";
import type { LicenseFile, LicensePayload } from "./types.js";

/**
 * توقيع الترخيص والتحقق منه (Phase 15B) — RSA-4096 + SHA-256، عبر crypto
 * المدمج في Node بلا أي مكتبة خارجية.
 *
 * ⚠️ هذا الملفّ مشترك، لكن **دالة التوقيع تحتاج مفتاحاً خاصاً يُمرَّر إليها**؛
 * التطبيق لا يملك مفتاحاً خاصاً إطلاقاً ولا يستدعي sign() أبداً.
 */

/**
 * تقنين ثابت (canonical) للحمولة قبل التوقيع.
 *
 * حاسم للأمن: لولا ترتيب ثابت للمفاتيح لاختلف النص بين التوقيع والتحقق فتفشل
 * تراخيص صحيحة، أو — أسوأ — لأمكن إعادة ترتيب الحقول للتحايل. نرتّب المفاتيح
 * تصاعديّاً في كل المستويات ونُخرج JSON بلا مسافات.
 */
export function canonicalize(value: unknown): string {
  const walk = (v: unknown): unknown => {
    if (v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(walk);
    const obj = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) out[k] = walk(obj[k]);
    return out;
  };
  return JSON.stringify(walk(value));
}

/** يولّد زوج مفاتيح RSA-4096. يُستخدم في المولّد فقط، مرّة واحدة. */
export function generateKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { publicKey, privateKey };
}

/** يوقّع حمولة ترخيص بالمفتاح الخاص (المولّد فقط). */
export function signPayload(payload: LicensePayload, privateKeyPem: string): string {
  return crypto
    .sign("sha256", Buffer.from(canonicalize(payload), "utf8"), privateKeyPem)
    .toString("base64");
}

/**
 * يتحقق من توقيع ملفّ ترخيص. يُعيد false عند أي خطأ بدل أن يرمي، كي لا يتحوّل
 * ملفّ تالف إلى انهيار في الإقلاع.
 */
export function verifyLicenseSignature(license: LicenseFile, publicKeyPem: string): boolean {
  try {
    if (license.algorithm !== "RSA-SHA256") return false; // منع خلط الخوارزميات
    if (typeof license.signature !== "string" || license.signature.length === 0) return false;
    return crypto.verify(
      "sha256",
      Buffer.from(canonicalize(license.payload), "utf8"),
      publicKeyPem,
      Buffer.from(license.signature, "base64"),
    );
  } catch {
    return false;
  }
}

/**
 * ترميز/فكّ ترميز ملفّ الترخيص.
 *
 * ملاحظة صريحة: هذا **ترميز وليس تشفيراً**. لا نستخدم AES لأن مفتاحه سيُشحن مع
 * التطبيق فلا يضيف أماناً — التوقيع وحده يضمن السلامة والأصالة. الترميز هنا
 * لمنع التحرير العابر بمفكّرة النصوص فقط، ولجعل الملفّ سطراً واحداً قابلاً
 * للإرسال عبر واتساب أو البريد.
 */
export function encodeLicenseFile(license: LicenseFile): string {
  const body = Buffer.from(JSON.stringify(license), "utf8").toString("base64");
  return [
    "-----BEGIN LAUNDRY ERP LICENSE-----",
    ...(body.match(/.{1,76}/g) ?? []),
    "-----END LAUNDRY ERP LICENSE-----",
    "",
  ].join("\n");
}

/** يفكّ ترميز ملفّ الترخيص. يُعيد null عند أي تلف. */
export function decodeLicenseFile(text: string): LicenseFile | null {
  try {
    const body = text
      .replace(/-----(BEGIN|END) LAUNDRY ERP LICENSE-----/g, "")
      .replace(/\s+/g, "");
    if (!body) return null;
    const parsed = JSON.parse(Buffer.from(body, "base64").toString("utf8")) as LicenseFile;
    if (!parsed || typeof parsed !== "object" || !parsed.payload || !parsed.signature) return null;
    return parsed;
  } catch {
    return null;
  }
}
