import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../../config/env.js";

/**
 * جذر تخزين النسخ الاحتياطية على القرص (Phase 6).
 * BACKUP_DIR بالبيئة يتقدّم؛ وإلا مجلد افتراضي داخل apps/api (storage/backups)
 * يعمل من src/ (tsx) وdist/ (build) على حد سواء - نفس أسلوب readApplicationVersion.
 */
export function resolveBackupDir(): string {
  if (env.BACKUP_DIR && env.BACKUP_DIR.trim().length > 0) {
    return resolve(env.BACKUP_DIR.trim());
  }
  const dir = dirname(fileURLToPath(import.meta.url));
  // src/modules/backup -> apps/api ثم storage/backups
  return resolve(join(dir, "../../../storage/backups"));
}

/** أقصى حجم لملف نسخة مرفوع للاستعادة (بايت) - حماية من رفع ضخم */
export const MAX_RESTORE_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB

/** القيمة الافتراضية لصفحة/حد سرد السجل */
export const DEFAULT_HISTORY_PAGE = 1;
export const DEFAULT_HISTORY_LIMIT = 20;
export const MAX_HISTORY_LIMIT = 100;

/** حقول الفرز المسموحة لسجل النسخ (Whitelist) */
export const BACKUP_HISTORY_SORTABLE_FIELDS = [
  "createdAt",
  "sizeBytes",
  "durationMs",
  "status",
] as const;

export const SORT_ORDERS = ["asc", "desc"] as const;

/** حدود إعدادات الاحتفاظ */
export const MAX_RETENTION_DAYS = 3650;
export const MAX_KEEP_LAST_N = 1000;

/** خوارزمية المجموع الاختباري */
export const CHECKSUM_ALGORITHM = "sha256";
