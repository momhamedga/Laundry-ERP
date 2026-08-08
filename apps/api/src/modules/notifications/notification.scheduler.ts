import { createBackoff, recordFailure, recordSuccess, shouldSkip } from "../../utils/scheduler-backoff.js";
import { SCHEDULER_INTERVAL_MS } from "./notification.constants.js";
import type { NotificationService } from "./notification.service.js";

/**
 * Worker داخلي لمعالجة Outbox - بلا Redis/طابور خارجي (القرار المعماري المعتمد).
 * مناسب لعملية API واحدة؛ عند التوسّع الأفقي مستقبلاً يلزم قفل موزّع
 * (مثل advisory lock بـ Postgres) لمنع معالجة مزدوجة بين عدة نسخ - خارج نطاق هذه المرحلة.
 */
export function startNotificationScheduler(service: NotificationService): () => void {
  let isRunning = false;
  const backoff = createBackoff();

  const timer = setInterval(() => {
    if (isRunning) return; // يمنع تراكم التنفيذ لو دورة سابقة ما زالت تعمل (بطء DB مثلاً)
    // تراجع أسّي عند تعذّر القاعدة: بلا هذا تُحاوَل كل دورة أثناء انقطاع
    // الشبكة فتنتظر مهلة التجمّع كاملة ثم تفشل، بلا فائدة وبضجيج يغرق السجلّ
    if (shouldSkip(backoff)) return;
    isRunning = true;
    service
      .processDueDeliveries()
      .then(() => {
        const msg = recordSuccess(backoff);
        if (msg) console.info("[notifications]", msg);
      })
      .catch((err: unknown) => {
        const note = recordFailure(backoff, SCHEDULER_INTERVAL_MS);
        if (note) console.error("[notifications] scheduler tick failed:", err, `— ${note}`);
      })
      .finally(() => {
        isRunning = false;
      });
  }, SCHEDULER_INTERVAL_MS);

  return () => clearInterval(timer);
}
