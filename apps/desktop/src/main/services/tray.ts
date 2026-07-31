import { Menu, Tray, app, nativeImage } from "electron";
import path from "node:path";
import { IS_DEV } from "../config.js";
import { scoped } from "../logger.js";
import { getMainWindow } from "../windows/main-window.js";

const log = scoped("tray");

let tray: Tray | null = null;

/** يحاول تحميل أيقونة التطبيق؛ يرجع صورة قد تكون فارغة (تُعالَج بأمان). */
function trayImage() {
  const file = process.platform === "win32" ? "icon.ico" : "icon.png";
  const iconPath = IS_DEV
    ? path.resolve(__dirname, "..", "..", "..", "build", file)
    : path.join(process.resourcesPath, "build", file);
  const img = nativeImage.createFromPath(iconPath);
  if (img.isEmpty()) log.warn("tray icon not found (using system default):", iconPath);
  return img;
}

function showMainWindow(): void {
  const win = getMainWindow();
  if (!win) return;
  if (win.isMinimized()) win.restore();
  if (!win.isVisible()) win.show();
  win.focus();
}

export interface TrayHandlers {
  onOpenDashboard: () => void;
  onNewOrder: () => void;
  onPrintQueue: () => void;
  onBackup: () => void;
  onQuit: () => void;
  syncStatus: () => string;
}

let handlersRef: TrayHandlers | null = null;

function buildMenu(h: TrayHandlers): Menu {
  return Menu.buildFromTemplate([
    { label: "فتح لوحة التحكم", click: h.onOpenDashboard },
    { label: "طلب جديد", click: h.onNewOrder },
    { label: "قائمة الطباعة", click: h.onPrintQueue },
    { type: "separator" },
    { label: `المزامنة: ${h.syncStatus()}`, enabled: false },
    { label: "نسخة احتياطية الآن", click: h.onBackup },
    { type: "separator" },
    { label: `الإصدار ${app.getVersion()}`, enabled: false },
    { label: "خروج", click: h.onQuit },
  ]);
}

/** أيقونة شريط النظام بقائمة Enterprise (لوحة/طلب/طباعة/مزامنة/نسخ/خروج). آمنة إن غابت الأيقونة. */
export function createTray(handlers: TrayHandlers): Tray | null {
  handlersRef = handlers;
  try {
    tray = new Tray(trayImage());
    tray.setToolTip("نظام إدارة المغاسل");
    tray.setContextMenu(buildMenu(handlers));
    tray.on("double-click", showMainWindow);
    log.info("tray created (enterprise menu)");
    return tray;
  } catch (err) {
    log.error("failed to create tray:", err);
    return null;
  }
}

/** يعيد بناء قائمة الـ tray (مثلاً عند تغيّر حالة المزامنة). */
export function refreshTray(): void {
  if (tray && handlersRef && !tray.isDestroyed()) tray.setContextMenu(buildMenu(handlersRef));
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
