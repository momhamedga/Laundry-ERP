import type { BackupService } from "./backup.service.js";

/** دورة الفحص - كل دقيقة تكفي لدقّة جدولة "HH:mm" */
const BACKUP_SCHEDULER_INTERVAL_MS = 60_000;

/**
 * Worker داخلي للنسخ المُجدولة - نفس نمط notification.scheduler حرفياً
 * (setInterval + قفل reentrancy + قاعدة البيانات كمصدر حالة، بلا Redis/Queue جديدة).
 * مناسب لعملية API واحدة؛ التوسّع الأفقي يحتاج قفلاً موزّعاً - خارج النطاق.
 */
export function startBackupScheduler(service: BackupService): () => void {
  let isRunning = false;

  const timer = setInterval(() => {
    if (isRunning) return;
    isRunning = true;
    service
      .runDueScheduledBackup()
      .catch((err: unknown) => {
        console.error("[backup] scheduler tick failed:", err);
      })
      .finally(() => {
        isRunning = false;
      });
  }, BACKUP_SCHEDULER_INTERVAL_MS);

  return () => clearInterval(timer);
}
