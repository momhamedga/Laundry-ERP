import { app } from "electron";
import { scoped } from "../logger.js";
import { getMainWindow } from "../windows/main-window.js";
import { EVENT_CHANNELS, type UpdateStatus } from "../../shared/ipc.js";

const log = scoped("updater");

/**
 * التحديث التلقائي عبر electron-updater + GitHub Releases (v1.3.0).
 * مُفعَّل في النسخة المُغلَّفة افتراضياً (يمكن تعطيله بـ DESKTOP_DISABLE_UPDATER=1).
 * لا تنزيل تلقائي: نُبلّغ الواجهة عند توفّر تحديث، والمستخدم يختار Download ثم
 * Install & Restart. المكتبة تُحمَّل كسولاً (ثقيلة) عند التفعيل فقط.
 */
const DISABLED = process.env.DESKTOP_DISABLE_UPDATER === "1";

// نوع مبسّط لما نحتاجه من electron-updater دون استيراد نوعه وقت الترجمة.
type AutoUpdater = {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  logger: unknown;
  on(event: string, cb: (arg: { version?: string; message?: string; percent?: number }) => void): void;
  checkForUpdates(): Promise<unknown>;
  downloadUpdate(): Promise<unknown>;
  quitAndInstall(): void;
};

let updater: AutoUpdater | null = null;
let loading: Promise<AutoUpdater | null> | null = null;

function emit(status: UpdateStatus): void {
  getMainWindow()?.webContents.send(EVENT_CHANNELS.UPDATE_STATUS, status);
}

/** يحمّل ويهيّئ autoUpdater مرّة واحدة (لازي). */
async function getUpdater(): Promise<AutoUpdater | null> {
  if (updater) return updater;
  if (loading) return loading;
  loading = (async () => {
    const mod = (await import("electron-updater")) as unknown as { autoUpdater: AutoUpdater };
    const au = mod.autoUpdater;
    au.autoDownload = false; // المستخدم يقرّر التنزيل
    au.autoInstallOnAppQuit = true;
    au.logger = log;
    au.on("checking-for-update", () => emit({ state: "checking" }));
    au.on("update-available", (i) => emit({ state: "available", version: i.version ?? "" }));
    au.on("update-not-available", () => emit({ state: "not-available" }));
    au.on("download-progress", (p) => emit({ state: "downloading", percent: Math.round(p.percent ?? 0) }));
    au.on("update-downloaded", (i) => emit({ state: "downloaded", version: i.version ?? "" }));
    au.on("error", (e) => emit({ state: "error", message: e.message ?? String(e) }));
    updater = au;
    return au;
  })();
  return loading;
}

/** يُهيّئ المُحدِّث ويجري فحصاً أوّليّاً في النسخة المُغلَّفة. */
export function initUpdater(): void {
  if (!app.isPackaged || DISABLED) {
    log.info(`auto-updater READY but inactive (packaged=${app.isPackaged}, disabled=${DISABLED})`);
    emit({ state: "disabled" });
    return;
  }
  void getUpdater()
    .then((au) => au?.checkForUpdates())
    .catch((err) => {
      log.error("initial update check failed:", err);
      emit({ state: "error", message: err instanceof Error ? err.message : String(err) });
    });
  log.info("auto-updater active (github releases)");
}

/** فحص يدوي عن تحديث. */
export async function checkForUpdates(): Promise<UpdateStatus> {
  if (!app.isPackaged || DISABLED) return { state: "disabled" };
  const au = await getUpdater();
  if (!au) return { state: "disabled" };
  emit({ state: "checking" });
  await au.checkForUpdates();
  return { state: "checking" };
}

/** يبدأ تنزيل التحديث المتوفّر. */
export async function downloadUpdate(): Promise<boolean> {
  const au = await getUpdater();
  if (!au) return false;
  await au.downloadUpdate();
  return true;
}

/** يثبّت التحديث المنزَّل ويعيد التشغيل. */
export async function installUpdate(): Promise<boolean> {
  if (!updater) return false;
  updater.quitAndInstall();
  return true;
}
