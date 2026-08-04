import { app, BrowserWindow, session } from "electron";
import path from "node:path";
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
import { recoverStaleSyncing } from "./db/repositories/index.js";
import { evaluateLicense, logLicenseState } from "./license/license-service.js";
import { bootstrapRuntime } from "./runtime/index.js";
import { showUnconfiguredDialog } from "./runtime/unconfigured-dialog.js";
import { handleOpenedFile } from "./services/file-open.js";
import { installNetworkGuard, warnOnStartup } from "./license/license-guard.js";
import { syncEngine } from "./services/sync-engine.js";
import { getSettings } from "./services/settings.js";
import { registerIpc } from "./ipc/index.js";
import { EVENT_CHANNELS } from "../shared/ipc.js";

const log = scoped("main");

/**
 * مسار بيانات المستخدم مثبَّت صراحةً (Phase 15.5 — إصلاح).
 *
 * Electron يشتقّ userData من `productName` إن وُجد في package.json، وإلا من
 * `name`. حتى v1.4.0 لم يكن هناك productName فكان المسار
 * `%APPDATA%/@laundry/desktop`. في 15.5 صار prepare-branding يكتب
 * `productName: "Laundry ERP"` ليشتقّ المُثبِّت هويته من ملفّ الهوية — فانتقل
 * المسار إلى `%APPDATA%/Laundry ERP` وأصبحت كل بيانات التثبيتات القائمة
 * (القاعدة المشفّرة، الترخيص، الإعدادات، النسخ الاحتياطي) غير مرئية للتطبيق.
 *
 * نثبّته على المسار التاريخي: اسم المنتج يبقى حرّاً للعرض والمُثبِّت، وبيانات
 * العميل لا تتحرّك أبداً مهما تغيّرت الهوية.
 */
app.setPath("userData", path.join(app.getPath("appData"), "@laundry", "desktop"));

// هوية التطبيق على ويندوز (تجميع شريط المهام + اسم مُرسِل الإشعارات الصحيح؛
// بلا هذا قد تظهر الإشعارات باسم "Electron" بدل اسم المنتج). يطابق appId في
// إعداد electron-builder. مستقلّ عن signAndEditExecutable (Phase 12.2).
if (process.platform === "win32") {
  app.setAppUserModelId("com.laundryerp.desktop");
}

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

  app.on("second-instance", (_e, argv) => {
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
    // Phase 15.5: النقر المزدوج على ‎.lkey ونسخة تعمل ⇒ يصل المسار في argv
    void handleOpenedFile(argv);
  });

  // macOS: فتح ملفّ مرتبط
  app.on("open-file", (event, filePath) => {
    event.preventDefault();
    void handleOpenedFile([filePath]);
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

  // Phase 15C: تهيئة إعداد التشغيل قبل أي شيء يعتمد عليه (الـ API خاصّة).
  // idempotent: تُنشئ ما ينقص فقط ولا تمسّ سرّاً موجوداً، فالتحديث وإعادة
  // التثبيت لا يُبطلان جلسات المستخدمين.
  const runtime = bootstrapRuntime();

  applyStartupSettings();
  try {
    initDatabase(); // Phase 11.6A: قاعدة SQLite المحلّية
    const s = dbStatus();
    log.info(`offline DB ready — ${s.tables} tables, sqlite ${s.sqliteVersion}, pending=${s.pendingSync}`);

    // v1.3.1: استعادة عمليات المزامنة العالقة في 'syncing' بعد انهيار سابق.
    // عند الإقلاع فقط — لا مزامنة قيد التنفيذ، فكل صفّ عالق بقيّة عملية ميتة.
    const rec = recoverStaleSyncing();
    for (const r of rec.rows) {
      log.warn(
        `recovered stale sync queue item #${r.id} (${r.entity}:${r.op}${r.entity_id ? ` ${r.entity_id}` : ""}) stuck since ${r.updated_at}`,
      );
    }
    log.info(
      `startup recovery completed — recovered=${rec.recovered}, pending queue size=${rec.pendingAfter}`,
    );

    // Phase 15B: تقييم الترخيص بعد جاهزية القاعدة (حالة السماح تُخزَّن فيها)
    logLicenseState(evaluateLicense());
  } catch (err) {
    log.error("offline DB init failed:", err);
  }
  applySessionSecurity(session.defaultSession);
  // Phase 15B: الحاجز الأخير لعمليات الإنشاء — يعمل حتى لو عُدّلت شيفرة الواجهة
  installNetworkGuard(session.defaultSession);
  buildAppMenu();

  const splash = createSplashWindow();

  // 1) شغّل (أو أعد استخدام) الـ API المحلي
  const apiOk = await backend.start();
  if (!apiOk) {
    if (!runtime.ready) {
      // إعداد ناقص: لا فائدة من إعادة المحاولة — نخبر المستخدم بما ينقص وكيف
      // يُصلحه بدل تركه أمام تطبيق ميت بلا تفسير (كان هذا سلوك v2.0.0).
      splash.destroy();
      await showUnconfiguredDialog(runtime.missing);
      return;
    }
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
    // Phase 15B: تنبيه اقتراب الانتهاء/انتهاء السماح — بعد ظهور النافذة كي
    // يكون الحوار مرتبطاً بها لا معلّقاً فوق شاشة البداية
    warnOnStartup();
    // Phase 15.5: ملفّ ‎.lkey فُتح بالنقر المزدوج وشغّل نسخة جديدة
    void handleOpenedFile(process.argv);
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
