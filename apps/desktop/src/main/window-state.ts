import { screen, type BrowserWindow, type Rectangle } from "electron";
import { getSetting, setSetting, type WindowState } from "./storage.js";

/**
 * حفظ/استعادة موضع وحجم النافذة (Remember Position/Size). يقصّ الحدود إلى الشاشات
 * المرئية حالياً حتى لا تظهر النافذة خارج الشاشة إن تغيّرت إعدادات العرض.
 */
const MIN_WIDTH = 1024;
const MIN_HEIGHT = 640;

function isVisibleOnSomeDisplay(bounds: Rectangle): boolean {
  return screen.getAllDisplays().some((display) => {
    const wa = display.workArea;
    return (
      bounds.x < wa.x + wa.width &&
      bounds.x + bounds.width > wa.x &&
      bounds.y < wa.y + wa.height &&
      bounds.y + bounds.height > wa.y
    );
  });
}

/** حدود الإنشاء المستعادة (مقصوصة للشاشة المرئية) + هل كانت maximized */
export function restoredWindowOptions(): { options: WindowState; maximized: boolean } {
  const saved = getSetting("windowState");
  const width = Math.max(saved.width, MIN_WIDTH);
  const height = Math.max(saved.height, MIN_HEIGHT);

  let x = saved.x;
  let y = saved.y;
  if (x !== undefined && y !== undefined) {
    if (!isVisibleOnSomeDisplay({ x, y, width, height })) {
      x = undefined; // خارج الشاشة → توسيط
      y = undefined;
    }
  }
  return { options: { x, y, width, height, maximized: saved.maximized }, maximized: saved.maximized };
}

/** يراقب النافذة ويحفظ حالتها عند التغيير (بلا حفظ أثناء التكبير الكامل) */
export function trackWindowState(win: BrowserWindow): void {
  let timer: NodeJS.Timeout | null = null;

  const persist = (): void => {
    if (win.isDestroyed()) return;
    const maximized = win.isMaximized();
    const normalBounds = maximized ? win.getNormalBounds() : win.getBounds();
    const state: WindowState = {
      x: normalBounds.x,
      y: normalBounds.y,
      width: normalBounds.width,
      height: normalBounds.height,
      maximized,
    };
    setSetting("windowState", state);
  };

  const debounced = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(persist, 300);
  };

  win.on("resize", debounced);
  win.on("move", debounced);
  win.on("maximize", persist);
  win.on("unmaximize", persist);
  win.on("close", () => {
    if (timer) clearTimeout(timer);
    persist();
  });
}

export { MIN_WIDTH, MIN_HEIGHT };
