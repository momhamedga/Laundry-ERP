import { app, nativeTheme } from "electron";
import Store from "electron-store";
import { scoped } from "../logger.js";
import type { DesktopSettings } from "../../shared/ipc.js";

const log = scoped("settings");

const DEFAULTS: DesktopSettings = {
  printer: null,
  receiptPrinter: null,
  receiptProfile: "thermal80",
  barcodePrinter: null,
  labelPrinter: null,
  cashDrawer: { enabled: false, host: "", port: 9100, pin: 2 },
  camera: { deviceId: null },
  backup: { daily: true, weekly: true, onExit: true, retentionDays: 30 },
  sync: { enabled: true, intervalSec: 60 },
  offline: { enabled: true },
  notifications: { enabled: true },
  theme: "system",
  language: "ar",
  startup: { launchOnBoot: false, startMinimized: false },
  autoUpdate: { enabled: false },
  logging: { level: "info" },
};

const store = new Store<{ settings: DesktopSettings }>({
  name: "desktop-config",
  defaults: { settings: DEFAULTS },
});

export function getSettings(): DesktopSettings {
  return { ...DEFAULTS, ...store.get("settings") };
}

/** يدمج تحديثاً جزئياً ويطبّق الجوانب النظامية (بدء التشغيل/الثيم). */
export function updateSettings(patch: Partial<DesktopSettings>): DesktopSettings {
  const next = { ...getSettings(), ...patch };
  store.set("settings", next);
  applySystemSide(next);
  log.info("settings updated:", Object.keys(patch).join(", "));
  return next;
}

function applySystemSide(s: DesktopSettings): void {
  nativeTheme.themeSource = s.theme;
  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: s.startup.launchOnBoot,
      openAsHidden: s.startup.startMinimized,
    });
  }
}

/** يُطبَّق مرّة عند الإقلاع لمزامنة إعدادات النظام مع المخزَّن. */
export function applyStartupSettings(): void {
  applySystemSide(getSettings());
}
