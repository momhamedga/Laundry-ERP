import {
  createBackoff,
  recordFailure,
  recordSuccess,
  shouldSkip,
} from "../../utils/scheduler-backoff.js";
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
  const backoff = createBackoff();

  const timer = setInterval(() => {
    if (isRunning) return;
    // نفس تراجع مجدول الإشعارات — انظر utils/scheduler-backoff.ts
    if (shouldSkip(backoff)) return;
    isRunning = true;
    service
      .runDueScheduledBackup()
      .then(() => {
        const msg = recordSuccess(backoff);
        if (msg) console.info("[backup]", msg);
      })
      .catch((err: unknown) => {
        const note = recordFailure(backoff, BACKUP_SCHEDULER_INTERVAL_MS);
        if (note) console.error("[backup] scheduler tick failed:", err, `— ${note}`);
      })
      .finally(() => {
        isRunning = false;
      });
  }, BACKUP_SCHEDULER_INTERVAL_MS);

  return () => clearInterval(timer);
}
