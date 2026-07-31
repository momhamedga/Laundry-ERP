import { app, BrowserWindow, session } from "electron";
import { APP_PROTOCOL, SINGLE_INSTANCE } from "./config.js";
import { initLogging, scoped } from "./logger.js";
import { applySessionSecurity, hardenWebContents } from "./security.js";
import { createSplashWindow } from "./windows/splash.js";
import { createMainWindow, getMainWindow, navigateRenderer } from "./windows/main-window.js";
import { BackendManager } from "./services/backend-manager.js";
import { RendererServer } from "./services/renderer-server.js";
import { NetworkMonitor } from "./services/network.js";
import { buildAppMenu } from "./services/menu.js";
import { createTray, destroyTray, refreshTray } from "./services/tray.js";
import { notify, notifyEvent } from "./services/notifications.js";
import { initUpdater } from "./services/updater.js";
import { addBreadcrumb, initCrashReporter, writeMainCrash } from "./services/crash-reporter.js";
import { applyStartupSettings } from "./services/settings.js";
import { backupOnExitIfEnabled, runBackup, startBackupSchedules, stopBackupSchedules } from "./services/backup.js";
import { registerShortcuts } from "./services/shortcuts.js";
import { closeAllExtraWindows, openWindow, setRendererBase } from "./windows/windows-manager.js";
import { closeDatabase, dbStatus, initDatabase } from "./db/database.js";
import { syncEngine } from "./services/sync-engine.js";
import { getSettings } from "./services/settings.js";
import { registerIpc } from "./ipc/index.js";
import { EVENT_CHANNELS } from "../shared/ipc.js";

const log = scoped("main");

const backend = new BackendManager();
const renderer = new RendererServer();
const network = new NetworkMonitor();
let quitting = false;

// ==================== Single Instance Lock ====================
if (SINGLE_INSTANCE && !app.requestSingleInstanceLock()) {
  log.warn("another instance is running — quitting this one");
  app.quit();
} else {
  bootstrap();
}

function bootstrap(): void {
  // Deep-linking ready
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(APP_PROTOCOL, process.execPath, [process.argv[1]!]);
  } else {
    app.setAsDefaultProtocolClient(APP_PROTOCOL);
  }

  app.on("second-instance", () => {
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  // deep link (macOS)
  app.on("open-url", (_e, url) => {
    log.info("deep link:", url);
    try {
      const route = new URL(url).pathname || "/";
      navigateRenderer(route);
    } catch {
      /* تجاهل روابط غير صالحة */
    }
  });

  // تصليب عام: كل webContents يُنشأ (بما فيها نوافذ الطباعة) يُصلَّب
  app.on("web-contents-created", (_e, contents) => hardenWebContents(contents));

  app.whenReady().then(onReady).catch((err) => {
    log.error("fatal during startup:", err);
    app.exit(1);
  });

  app.on("activate", () => {
    // macOS: أعد فتح نافذة إن أُغلقت كلها
    if (BrowserWindow.getAllWindows().length === 0) void onReady();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("before-quit", () => {
    quitting = true;
  });

  app.on("will-quit", async (event) => {
    if (cleanupDone) return;
    event.preventDefault();
    await cleanup();
    app.exit(0);
  });
}

async function onReady(): Promise<void> {
  initLogging();
  initCrashReporter();
  applyStartupSettings();
  try {
    initDatabase(); // Phase 11.6A: قاعدة SQLite المحلّية
    const s = dbStatus();
    log.info(`offline DB ready — ${s.tables} tables, sqlite ${s.sqliteVersion}, pending=${s.pendingSync}`);
  } catch (err) {
    log.error("offline DB init failed:", err);
  }
  applySessionSecurity(session.defaultSession);
  buildAppMenu();

  const splash = createSplashWindow();

  // 1) شغّل (أو أعد استخدام) الـ API المحلي
  const apiOk = await backend.start();
  if (!apiOk) {
    log.error("backend not healthy — the UI will still load and show a connection error");
  }

  // 2) قدّم واجهة الـ Admin (نفس Next.js)
  let rendererUrl: string;
  try {
    rendererUrl = await renderer.start();
  } catch (err) {
    log.error("renderer server failed:", err);
    notify("تعذّر التشغيل", "فشل تشغيل واجهة النظام. راجع السجلّات.");
    splash.destroy();
    app.exit(1);
    return;
  }

  // 3) النافذة الرئيسية
  setRendererBase(rendererUrl); // للنوافذ المستقلّة (POS/التقارير/…)
  const win = createMainWindow(rendererUrl);
  win.once("ready-to-show", () => {
    if (!splash.isDestroyed()) splash.destroy();
  });

  // 4) خدمات سطح المكتب Enterprise
  const quit = (): void => {
    quitting = true;
    app.quit();
  };
  createTray({
    onOpenDashboard: () => {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
      win.webContents.send(EVENT_CHANNELS.NAVIGATE, "/");
    },
    onNewOrder: () => openWindow("pos"),
    onPrintQueue: () => win.webContents.send(EVENT_CHANNELS.NAVIGATE, "/orders"),
    onBackup: () => {
      const e = runBackup("manual");
      notifyEvent("backup-completed", e.file);
    },
    onQuit: quit,
    syncStatus: () => (network.getStatus() === "online" ? "متصل" : "غير متصل"),
  });
  network.start();
  initUpdater();
  registerIpc({ backend, network });

  // Phase 11.6C: بثّ حالة المزامنة للواجهة + بدء المزامنة الدورية إن كانت مُفعّلة
  syncEngine.on("status", (s) => {
    win.webContents.send(EVENT_CHANNELS.SYNC_STATUS, s);
    if (s.lastResult) addBreadcrumb(`sync:done ${s.lastResult.done}/${s.lastResult.processed}`);
  });
  const syncCfg = getSettings().sync;
  if (syncCfg.enabled) syncEngine.startAuto(syncCfg.intervalSec);

  // اختصارات لوحة المفاتيح (تبثّ إجراءات للواجهة الفعّالة)
  registerShortcuts((action) => {
    const focused = BrowserWindow.getFocusedWindow() ?? win;
    focused.webContents.send(EVENT_CHANNELS.SHORTCUT, action);
  });

  // جداول النسخ الاحتياطي (يومي/أسبوعي حسب الإعدادات)
  startBackupSchedules((e) => {
    notifyEvent("backup-completed", e.file);
    win.webContents.send(EVENT_CHANNELS.BACKUP_DONE, e);
  });

  // 5) بثّ الحالة للـ renderer + إشعارات أصلية عند التحوّلات المهمة
  backend.on("status", (s) => {
    win.webContents.send(EVENT_CHANNELS.BACKEND_STATUS_CHANGED, s);
    if (s === "crashed") notify("توقّف الخادم", "تعذّر تشغيل خادم النظام بعد عدة محاولات.");
  });
  network.on("status", (s) => {
    win.webContents.send(EVENT_CHANNELS.NET_STATUS_CHANGED, s);
    addBreadcrumb(`network:${s}`); // أثر للأعطال
    refreshTray(); // حدّث تسمية "المزامنة" في قائمة الـ tray
    if (s === "offline") notify("غير متصل", "فُقد الاتصال بالخادم المحلي. جارٍ إعادة المحاولة…");
    if (s === "online") {
      notifyEvent("sync-completed", "عاد الاتصال بالخادم.");
      void syncEngine.syncNow("online"); // Phase 11.6C: استنزاف الطابور فور عودة الاتصال
    }
  });

  log.info("desktop ready");
}

let cleanupDone = false;
async function cleanup(): Promise<void> {
  if (cleanupDone) return;
  cleanupDone = true;
  log.info("cleaning up (backup + stopping services)…");
  backupOnExitIfEnabled(); // نسخة عند الخروج إن كانت مُفعّلة
  stopBackupSchedules();
  closeAllExtraWindows();
  network.stop();
  syncEngine.stopAuto(); // إيقاف المزامنة الدورية
  destroyTray();
  closeDatabase(); // إغلاق SQLite نظيفاً
  await Promise.allSettled([backend.stop(), renderer.stop()]);
  log.info("cleanup done");
}

// ضمان إيقاف العمليات الفرعية حتى عند إشارات النظام
// كتابة تقرير عطل محلي عند أي استثناء غير مُلتقَط في الـ main (بجانب سجلّ electron-log)
process.on("uncaughtException", (err) => writeMainCrash(err));
process.on("unhandledRejection", (reason) => writeMainCrash(reason));

process.on("SIGINT", () => void handleSignal());
process.on("SIGTERM", () => void handleSignal());
async function handleSignal(): Promise<void> {
  if (quitting) return;
  quitting = true;
  await cleanup();
  app.exit(0);
}
