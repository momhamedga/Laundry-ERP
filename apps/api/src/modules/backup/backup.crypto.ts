import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type { Transform } from "node:stream";
import { env } from "../../config/env.js";

/**
 * تشفير ملفات النسخ الاحتياطية بـAES-256-GCM.
 *
 * العطل الذي يعالجه: كان الإعداد `encryptionEnabled` معروضاً في الواجهة وقابلاً
 * للتفعيل، بينما الشيفرة تكتب `encrypted: false` نصّاً ثابتاً ولا تشفّر شيئاً.
 * فمن يفعّله يرى «مفعّل» ويظنّ ملفّه محميّاً، وهو نصٌّ صريح يحمل أسماء عملائه
 * وأرقام هواتفهم وفواتيرهم. الطمأنينة الكاذبة أسوأ من غياب الميزة أصلاً.
 *
 * GCM لا CBC: يوفّر المصادقة مع السرّية، فأي عبث بالملف يُكتشف عند فكّ التشفير
 * بدل أن يُنتج بياناتٍ مشوّهة تُستعاد بصمت.
 *
 * بنية الملف المشفَّر:
 *   MAGIC(8) | VERSION(1) | SALT(16) | IV(12) | CIPHERTEXT(..) | TAG(16)
 * الملح والمتجه عشوائيان لكل ملف — نسختان متطابقتان تُنتجان ملفّين مختلفين،
 * فلا يُستدلّ على تكرار المحتوى من الملفات نفسها.
 */

const MAGIC = Buffer.from("LERPBKE1", "utf8"); // Laundry ERP BacKup Encrypted v1
const VERSION = 1;
const SALT_LEN = 16;
const IV_LEN = 12; // المعياري لـGCM
const TAG_LEN = 16;
const KEY_LEN = 32; // AES-256
const HEADER_LEN = MAGIC.length + 1 + SALT_LEN + IV_LEN;

/** الامتداد المُضاف لاسم الملف المشفَّر — ليتبيّن نوعه من اسمه وحده */
export const ENCRYPTED_EXTENSION = ".enc";

export class BackupEncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupEncryptionError";
  }
}

/** هل مفتاح التشفير مضبوط في البيئة؟ */
export function hasEncryptionKey(): boolean {
  return Boolean(env.BACKUP_ENCRYPTION_KEY && env.BACKUP_ENCRYPTION_KEY.trim().length > 0);
}

/**
 * يشتقّ مفتاح AES من السرّ النصّي عبر scrypt.
 *
 * scrypt لا استخدام السرّ خاماً: يقبل المفتاح المضبوط أن يكون عبارة يكتبها
 * إنسان (منخفضة الإنتروبيا) لا 32 بايتاً عشوائياً، والاشتقاق البطيء يجعل
 * تخمينها مكلفاً على من يحصل على الملف.
 */
function deriveKey(salt: Buffer): Buffer {
  const secret = env.BACKUP_ENCRYPTION_KEY?.trim();
  if (!secret) {
    throw new BackupEncryptionError(
      "التشفير مفعّل لكن BACKUP_ENCRYPTION_KEY غير مضبوط على الخادم.",
    );
  }
  return scryptSync(secret, salt, KEY_LEN);
}

/**
 * يُنشئ رأس الملف ومحوِّل التشفير معاً.
 *
 * يُستهلك داخل pipeline الكتابة القائم (JSON → gzip → تشفير → قرص) فتبقى
 * الكتابة متدفّقة بلا تحميل النسخة كاملةً في الذاكرة. الوسم يُلحق بعد انتهاء
 * التدفّق لأن GCM لا يُنتجه إلا عند الإغلاق.
 */
export function createEncryptor(): {
  header: Buffer;
  cipher: Transform;
  readAuthTag: () => Buffer;
} {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = deriveKey(salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const header = Buffer.concat([MAGIC, Buffer.from([VERSION]), salt, iv]);
  return { header, cipher, readAuthTag: () => cipher.getAuthTag() };
}

/** هل هذا المحتوى ملفَّ نسخةٍ مشفَّراً من إنتاجنا؟ */
export function isEncryptedBackup(buffer: Buffer): boolean {
  return (
    buffer.length >= HEADER_LEN + TAG_LEN &&
    buffer.subarray(0, MAGIC.length).equals(MAGIC)
  );
}

/**
 * يفكّ تشفير ملف كامل.
 *
 * القراءة مُجمَّعة لا متدفّقة: وسم GCM في آخر الملف ويلزم قبل التحقّق من أي
 * بايت، والاستعادة عملية نادرة يدوية — بخلاف الكتابة التي تجري بالجدولة.
 */
export function decryptBackup(buffer: Buffer): Buffer {
  if (!isEncryptedBackup(buffer)) {
    throw new BackupEncryptionError("الملف ليس نسخة مشفَّرة بصيغة يعرفها النظام.");
  }

  const version = buffer[MAGIC.length];
  if (version !== VERSION) {
    throw new BackupEncryptionError(
      `إصدار تشفير غير مدعوم (${version}). الملف أُنشئ بنسخة أحدث من النظام.`,
    );
  }

  const salt = buffer.subarray(MAGIC.length + 1, MAGIC.length + 1 + SALT_LEN);
  const iv = buffer.subarray(MAGIC.length + 1 + SALT_LEN, HEADER_LEN);
  const tag = buffer.subarray(buffer.length - TAG_LEN);
  const ciphertext = buffer.subarray(HEADER_LEN, buffer.length - TAG_LEN);

  const decipher = createDecipheriv("aes-256-gcm", deriveKey(salt), iv);
  decipher.setAuthTag(tag);

  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    // GCM يفشل بالطريقة نفسها عند مفتاح خاطئ وعند عبثٍ بالملف — لا نميّز بينهما
    // للمستخدم، فالتمييز نفسه يفيد من يحاول تخمين المفتاح.
    throw new BackupEncryptionError(
      "تعذّر فكّ تشفير الملف: المفتاح غير مطابق أو الملف تالف/معدَّل.",
    );
  }
}

/**
 * يتحقّق أن المفتاح المضبوط حالياً يفكّ هذا الملف — بلا فكّ كامل ولا كشف محتوى.
 * يُستخدم في فحص الصحّة: مفتاحٌ تغيّر بعد إنشاء النسخ يجعلها كلّها غير قابلة
 * للاستعادة، وهو عطل لا يظهر إلا يوم الحاجة.
 */
export function canDecrypt(buffer: Buffer): boolean {
  try {
    decryptBackup(buffer);
    return true;
  } catch {
    return false;
  }
}

/** مقارنة ثابتة الزمن — للاستخدام المستقبلي عند التحقّق من بصمات */
export function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}
