import log from "electron-log/main";
import { app } from "electron";

/**
 * تسجيل موحّد (electron-log): ملفّات دوّارة + كونسول في التطوير. يلتقط:
 * - سجلّات Main
 * - سجلّات Renderer (عبر log.initialize + قناة log:renderer)
 * - الأخطاء غير المُلتقَطة و rejections و crashes
 *
 * ملفات السجلّ: %USERPROFILE%/AppData/Roaming/<app>/logs/main.log (وما يماثله).
 */
export function initLogging(): void {
  log.initialize(); // يفعّل جسر سجلّات الـ renderer
  log.transports.file.level = "info";
  log.transports.console.level = app.isPackaged ? false : "debug";
  log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB دوّار
  log.errorHandler.startCatching({ showDialog: false });
  log.eventLogger.startLogging(); // يلتقط أحداث app/gpu/renderer crash

  process.on("uncaughtException", (err) => log.error("[uncaughtException]", err));
  process.on("unhandledRejection", (reason) => log.error("[unhandledRejection]", reason));

  log.info(`▶ Laundry ERP Desktop starting — v${app.getVersion()} — packaged=${app.isPackaged}`);
}

export function scoped(scope: string) {
  return log.scope(scope);
}

export default log;
