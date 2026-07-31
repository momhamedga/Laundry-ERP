import { BrowserWindow } from "electron";
import path from "node:path";
import { IS_DEV } from "../config.js";
import { scoped } from "../logger.js";
import { hardenWebContents } from "../security.js";
import type { DesktopWindowName } from "../../shared/ipc.js";

const log = scoped("windows");
const PRELOAD_PATH = path.join(__dirname, "..", "..", "preload", "index.js");

/** نوافذ مستقلّة إضافية (POS/التقارير/شاشة العميل/معاينة الطباعة) بنفس التصليب الأمني. */
interface WinCfg {
  route: string;
  title: string;
  width: number;
  height: number;
}
const CONFIGS: Record<DesktopWindowName, WinCfg> = {
  pos: { route: "/orders", title: "نقطة البيع", width: 1200, height: 800 },
  reports: { route: "/reports", title: "التقارير", width: 1280, height: 860 },
  customer: { route: "/", title: "شاشة العميل", width: 900, height: 600 },
  "print-preview": { route: "/", title: "معاينة الطباعة", width: 820, height: 1000 },
};

const openWindows = new Map<DesktopWindowName, BrowserWindow>();
let rendererBase = "";

export function setRendererBase(url: string): void {
  rendererBase = url;
}

/** يفتح (أو يركّز) نافذة مُسمّاة تحمّل مسار SPA داخل واجهة Next نفسها. */
export function openWindow(name: DesktopWindowName): void {
  const existing = openWindows.get(name);
  if (existing && !existing.isDestroyed()) {
    if (existing.isMinimized()) existing.restore();
    existing.focus();
    return;
  }
  const cfg = CONFIGS[name];
  const win = new BrowserWindow({
    width: cfg.width,
    height: cfg.height,
    title: cfg.title,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: false,
      devTools: IS_DEV,
    },
  });
  hardenWebContents(win.webContents);
  win.once("ready-to-show", () => win.show());
  win.on("closed", () => openWindows.delete(name));
  openWindows.set(name, win);
  const url = `${rendererBase.replace(/\/$/, "")}${cfg.route}`;
  log.info(`open window "${name}" →`, url);
  void win.loadURL(url);
}

export function closeWindow(name: DesktopWindowName): void {
  openWindows.get(name)?.close();
}

export function focusWindow(name: DesktopWindowName): void {
  const w = openWindows.get(name);
  if (w && !w.isDestroyed()) {
    if (w.isMinimized()) w.restore();
    w.focus();
  }
}

export function closeAllExtraWindows(): void {
  for (const w of openWindows.values()) if (!w.isDestroyed()) w.destroy();
  openWindows.clear();
}
