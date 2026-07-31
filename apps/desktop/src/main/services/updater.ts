import { app } from "electron";
import { scoped } from "../logger.js";
import { getMainWindow } from "../windows/main-window.js";
import { EVENT_CHANNELS, type UpdateStatus } from "../../shared/ipc.js";

const log = scoped("updater");

/**
 * بنية التحديث التلقائي جاهزة (electron-updater + GitHub Releases) لكنها **معطّلة**
 * عمداً في v1.0.0 (لا فحص تلقائي، لا تنزيل). التفعيل لاحقاً: اضبط ENABLE_AUTO_UPDATE
 * وأضِف `publish` في electron-builder.yml. تُحمَّل المكتبة كسولاً عند الطلب فقط.
 */
const ENABLE_AUTO_UPDATE = process.env.DESKTOP_ENABLE_UPDATER === "1";

function emit(status: UpdateStatus): void {
  getMainWindow()?.webContents.send(EVENT_CHANNELS.UPDATE_STATUS, status);
}

/** يُهيّئ المُحدِّث دون بدء أي فحص (Ready only). */
export function initUpdater(): void {
  if (!app.isPackaged || !ENABLE_AUTO_UPDATE) {
    log.info("auto-updater is READY but disabled (v1.0.0 policy)");
    emit({ state: "disabled" });
    return;
  }
  // مسار مستقبلي مقصود (غير مُفعَّل الآن):
  // const { autoUpdater } = await import("electron-updater");
  // autoUpdater.autoDownload = false;
  // autoUpdater.on("update-available", (i) => emit({ state: "available", version: i.version }));
  // autoUpdater.on("update-downloaded", (i) => emit({ state: "downloaded", version: i.version }));
  // void autoUpdater.checkForUpdates();
  log.info("auto-updater enabled path reserved (not active in v1.0.0)");
}

/** فحص يدوي (يبقى معطّلاً افتراضياً؛ يُرجع الحالة الحالية فقط). */
export function checkForUpdates(): UpdateStatus {
  const status: UpdateStatus = ENABLE_AUTO_UPDATE
    ? { state: "checking" }
    : { state: "disabled" };
  emit(status);
  return status;
}
