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

/** يُنشئ أيقونة شريط النظام مع قائمة سياق (إظهار/خروج). آمن إن غابت الأيقونة. */
export function createTray(onQuit: () => void): Tray | null {
  try {
    tray = new Tray(trayImage());
    tray.setToolTip("نظام إدارة المغاسل");
    const menu = Menu.buildFromTemplate([
      { label: "فتح التطبيق", click: showMainWindow },
      { type: "separator" },
      { label: `الإصدار ${app.getVersion()}`, enabled: false },
      { type: "separator" },
      { label: "خروج", click: onQuit },
    ]);
    tray.setContextMenu(menu);
    tray.on("double-click", showMainWindow);
    log.info("tray created");
    return tray;
  } catch (err) {
    log.error("failed to create tray:", err);
    return null;
  }
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
