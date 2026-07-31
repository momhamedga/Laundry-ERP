import { BrowserWindow, nativeTheme } from "electron";
import path from "node:path";
import { IS_DEV } from "../config.js";
import { scoped } from "../logger.js";
import { hardenWebContents } from "../security.js";
import { getSetting } from "../storage.js";
import { restoredWindowOptions, trackWindowState, MIN_WIDTH, MIN_HEIGHT } from "../window-state.js";
import { writeRendererCrash } from "../services/crash-reporter.js";
import { EVENT_CHANNELS } from "../../shared/ipc.js";

const log = scoped("main-window");

/** المسار المُترجم للـ preload (dist/preload/index.js) بالنسبة لـ dist/main/windows */
const PRELOAD_PATH = path.join(__dirname, "..", "..", "preload", "index.js");

let mainWindow: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/**
 * النافذة الرئيسية بإعدادات أمان صارمة:
 * contextIsolation + sandbox + nodeIntegration=false + preload فقط.
 * تستعيد الموضع/الحجم، تراقب الحالة، تُصلَّب، وتتعافى من انهيار الـ renderer.
 */
export function createMainWindow(rendererUrl: string): BrowserWindow {
  const { options, maximized } = restoredWindowOptions();

  // طبّق ثيم مخزَّن على chrome الأصلي (شريط العنوان)
  nativeTheme.themeSource = getSetting("theme");

  const win = new BrowserWindow({
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#26262b" : "#f7f7fb",
    title: "نظام إدارة المغاسل",
    autoHideMenuBar: true,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: false,
      spellcheck: false,
      devTools: IS_DEV,
    },
  });

  mainWindow = win;
  hardenWebContents(win.webContents);
  trackWindowState(win);

  win.once("ready-to-show", () => {
    if (maximized) win.maximize();
    win.show();
    if (IS_DEV) win.webContents.openDevTools({ mode: "detach" });
  });

  win.on("closed", () => {
    mainWindow = null;
  });

  // ==================== Crash Recovery (Renderer) ====================
  win.webContents.on("render-process-gone", (_e, details) => {
    log.error("renderer process gone:", details.reason);
    if (details.reason === "clean-exit" || win.isDestroyed()) return;
    writeRendererCrash(details); // تقرير عطل محلي (بلا رفع)
    // أعد التحميل مرة واحدة تلقائياً للتعافي من انهيار الـ renderer
    log.warn("reloading renderer after crash…");
    win.webContents.reload();
  });

  win.webContents.on("unresponsive", () => log.warn("renderer unresponsive"));
  win.webContents.on("did-fail-load", (_e, code, desc, url) =>
    log.error(`did-fail-load ${code} ${desc} ${url}`),
  );

  log.info("loading renderer:", rendererUrl);
  void win.loadURL(rendererUrl);
  return win;
}

/** بثّ حدث تنقّل للـ renderer (مثلاً من قائمة أصلية → مسار داخل الـ SPA) */
export function navigateRenderer(routePath: string): void {
  mainWindow?.webContents.send(EVENT_CHANNELS.NAVIGATE, routePath);
}
