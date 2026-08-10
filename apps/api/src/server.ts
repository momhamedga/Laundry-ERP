import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { flushObservability, initObservability } from "./config/observability.js";
import { prisma } from "./lib/prisma.js";
import { closePdfBrowser } from "./lib/pdf.js";
import { startBackupScheduler } from "./modules/backup/index.js";
import { startNotificationScheduler } from "./modules/notifications/index.js";

// قبل إنشاء التطبيق: أي عطل أثناء الإقلاع نفسه يجب أن يُلتقط أيضاً
initObservability();

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Laundry ERP API running on http://localhost:${env.PORT}`);
  console.log(`   Health check: http://localhost:${env.PORT}/api/v1/health`);
});

/** Outbox Worker للإشعارات - داخل نفس العملية (بلا Redis)، يبدأ بعد الاستماع مباشرة */
const stopNotificationScheduler = startNotificationScheduler();

/** Worker النسخ الاحتياطي المُجدولة - نفس النمط (بلا Redis/Queue جديدة) */
const stopBackupScheduler = startBackupScheduler();

/** إغلاق نظيف: إنهاء الاتصالات + إغلاق متصفح PDF قبل الخروج (لا عمليات Chromium يتيمة) */
async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received, shutting down...`);
  stopNotificationScheduler();
  stopBackupScheduler();
  server.close(async () => {
    await Promise.allSettled([closePdfBrowser(), prisma.$disconnect(), flushObservability()]);
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
