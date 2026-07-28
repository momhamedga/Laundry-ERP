import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BackupScheduleFrequency } from "@prisma/client";
import { CHECKSUM_ALGORITHM } from "./backup.constants.js";

/**
 * يقرأ package.json الحقيقي (apps/api) - يعمل من src/ (tsx) وdist/ (build)
 * على حد سواء. مُكرَّرة عمداً عن settings.utils.ts (نفس اصطلاح المشروع -
 * مثل تكرار passwordSchema بين auth.validator.ts وusers.validator.ts) بدل
 * اقتران بين وحدتين لدالة صغيرة ذاتية الاكتفاء.
 */
export function readApplicationVersion(): string {
  try {
    const dir = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(dir, "../../../package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** اسم ملف تنزيل آمن (بلا أحرف خاصة) بختم زمني واضح */
export function buildBackupFilename(date: Date): string {
  const stamp = date.toISOString().replace(/[:.]/g, "-");
  return `laundry-erp-backup-${stamp}.json`;
}

/** اسم ملف نسخة مُخزَّنة على القرص - يراعي الضغط (.json.gz) */
export function buildStoredBackupFilename(date: Date, compressed: boolean): string {
  const base = buildBackupFilename(date);
  return compressed ? `${base}.gz` : base;
}

/**
 * sha256 لملف عبر تدفّق القراءة (بلا تحميل الملف كاملاً للذاكرة) - يُستخدم
 * لختم المجموع الاختباري عند الإنشاء والتحقق منه عند الاستعادة.
 */
export function computeFileChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash(CHECKSUM_ALGORITHM);
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

/** sha256 لمحتوى نصّي بالذاكرة - للتحقق من الملف المرفوع عند الاستعادة */
export function computeBufferChecksum(buffer: Buffer): string {
  return createHash(CHECKSUM_ALGORITHM).update(buffer).digest("hex");
}

/**
 * يحسب موعد التشغيل القادم للجدولة بناءً على التكرار ووقت "HH:mm".
 * تبسيط متعمّد: يعمل بتوقيت الخادم (UTC عادةً) - المنطقة الزمنية مُخزَّنة للعرض؛
 * دقة "التوقيت المحلي الكامل" تحتاج مكتبة مناطق زمنية (خارج نطاق "بلا مكتبات
 * غير ضرورية") - يُوثَّق كقيد. weekly = نفس اليوم أسبوعياً؛ monthly = نفس اليوم شهرياً.
 */
export function computeNextRun(
  frequency: BackupScheduleFrequency,
  time: string,
  from: Date = new Date(),
): Date {
  const [hStr, mStr] = time.split(":");
  const hour = Number(hStr ?? "0");
  const minute = Number(mStr ?? "0");

  const next = new Date(from);
  next.setSeconds(0, 0);
  next.setHours(hour, minute, 0, 0);

  // إن كان الموعد اليوم قد فات، ادفعه للفترة التالية حسب التكرار
  if (next.getTime() <= from.getTime()) {
    if (frequency === "DAILY") next.setDate(next.getDate() + 1);
    else if (frequency === "WEEKLY") next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);
  }
  return next;
}
