import { SCHEDULER_INTERVAL_MS } from "./notification.constants.js";
import type { NotificationService } from "./notification.service.js";

/**
 * Worker داخلي لمعالجة Outbox - بلا Redis/طابور خارجي (القرار المعماري المعتمد).
 * مناسب لعملية API واحدة؛ عند التوسّع الأفقي مستقبلاً يلزم قفل موزّع
 * (مثل advisory lock بـ Postgres) لمنع معالجة مزدوجة بين عدة نسخ - خارج نطاق هذه المرحلة.
 */
export function startNotificationScheduler(service: NotificationService): () => void {
  let isRunning = false;

  const timer = setInterval(() => {
    if (isRunning) return; // يمنع تراكم التنفيذ لو دورة سابقة ما زالت تعمل (بطء DB مثلاً)
    isRunning = true;
    service
      .processDueDeliveries()
      .catch((err: unknown) => {
        console.error("[notifications] scheduler tick failed:", err);
      })
      .finally(() => {
        isRunning = false;
      });
  }, SCHEDULER_INTERVAL_MS);

  return () => clearInterval(timer);
}
