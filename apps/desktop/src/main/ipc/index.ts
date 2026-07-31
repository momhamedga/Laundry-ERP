import { app, dialog, ipcMain, shell, type IpcMainInvokeEvent } from "electron";
import fs from "node:fs/promises";
import { scoped } from "../logger.js";
import { getMainWindow } from "../windows/main-window.js";
import { exportPdf, listPrinters, previewPrint, silentPrint } from "../services/printing.js";
import type { BackendManager } from "../services/backend-manager.js";
import type { NetworkMonitor } from "../services/network.js";
import {
  INVOKE_CHANNELS,
  SEND_CHANNELS,
  RENDERER_ALLOWED_KEYS_HELP,
  type AppInfo,
  type IpcResult,
  type OpenFileOptions,
  type PdfExportOptions,
  type SaveFileOptions,
  type SilentPrintOptions,
} from "../../shared/ipc.js";
import {
  addRecentFile,
  clearRecentFiles,
  deleteSetting,
  getSetting,
  listRecentFiles,
  RENDERER_ALLOWED_KEYS,
  setSetting,
} from "../storage.js";

const log = scoped("ipc");

/** يلفّ معالجاً بحيث يعيد دائماً IpcResult موحّداً (لا يتسرّب أي استثناء للـ renderer) */
function handle<T>(
  channel: string,
  fn: (event: IpcMainInvokeEvent, payload: unknown) => Promise<T> | T,
): void {
  ipcMain.handle(channel, async (event, payload) => {
    try {
      const data = await fn(event, payload);
      return { ok: true, data } satisfies IpcResult<T>;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error(`ipc ${channel} failed:`, message);
      return { ok: false, error: message } satisfies IpcResult<T>;
    }
  });
}

function assertObject(payload: unknown): Record<string, unknown> {
  if (typeof payload !== "object" || payload === null) throw new Error("Invalid payload");
  return payload as Record<string, unknown>;
}

const SAFE_EXTERNAL = /^(https?:|mailto:)/i;

export function registerIpc(deps: { backend: BackendManager; network: NetworkMonitor }): void {
  const { backend, network } = deps;

  // ==================== App ====================
  handle<AppInfo>(INVOKE_CHANNELS.APP_GET_INFO, () => ({
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    nodeVersion: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    packaged: app.isPackaged,
    locale: app.getLocale(),
  }));

  handle(INVOKE_CHANNELS.APP_RELAUNCH, () => {
    app.relaunch();
    app.exit(0);
  });
  handle(INVOKE_CHANNELS.APP_QUIT, () => app.quit());

  // ==================== Storage (whitelisted keys) ====================
  handle(INVOKE_CHANNELS.STORAGE_GET, (_e, payload) => {
    const { key } = assertObject(payload);
    if (typeof key !== "string" || !RENDERER_ALLOWED_KEYS.has(key as never)) {
      throw new Error(`Key not allowed: ${String(key)} (${RENDERER_ALLOWED_KEYS_HELP})`);
    }
    return getSetting(key as never);
  });
  handle(INVOKE_CHANNELS.STORAGE_SET, (_e, payload) => {
    const { key, value } = assertObject(payload);
    if (typeof key !== "string" || !RENDERER_ALLOWED_KEYS.has(key as never)) {
      throw new Error(`Key not allowed: ${String(key)}`);
    }
    setSetting(key as never, value as never);
    return true;
  });
  handle(INVOKE_CHANNELS.STORAGE_DELETE, (_e, payload) => {
    const { key } = assertObject(payload);
    if (typeof key !== "string" || !RENDERER_ALLOWED_KEYS.has(key as never)) {
      throw new Error(`Key not allowed: ${String(key)}`);
    }
    deleteSetting(key as never);
    return true;
  });

  // ==================== Printing ====================
  handle(INVOKE_CHANNELS.PRINT_LIST_PRINTERS, () => listPrinters());
  handle(INVOKE_CHANNELS.PRINT_SILENT, (_e, payload) => silentPrint(validatePrint(payload)));
  handle(INVOKE_CHANNELS.PRINT_PREVIEW, (_e, payload) => previewPrint(validatePrint(payload)));
  handle(INVOKE_CHANNELS.PRINT_TO_PDF, (_e, payload) => exportPdf(validatePdf(payload)));

  // ==================== Dialogs ====================
  handle(INVOKE_CHANNELS.DIALOG_OPEN_FILE, async (_e, payload) => {
    const opts = (payload ?? {}) as OpenFileOptions;
    const win = getMainWindow();
    const props: ("openFile" | "multiSelections")[] = ["openFile"];
    if (opts.multi) props.push("multiSelections");
    const res = win
      ? await dialog.showOpenDialog(win, { title: opts.title, filters: opts.filters, properties: props })
      : await dialog.showOpenDialog({ title: opts.title, filters: opts.filters, properties: props });
    return res.canceled ? [] : res.filePaths;
  });

  handle(INVOKE_CHANNELS.DIALOG_SAVE_FILE, async (_e, payload) => {
    const opts = (payload ?? {}) as SaveFileOptions;
    const win = getMainWindow();
    const res = win
      ? await dialog.showSaveDialog(win, { title: opts.title, defaultPath: opts.defaultPath, filters: opts.filters })
      : await dialog.showSaveDialog({ title: opts.title, defaultPath: opts.defaultPath, filters: opts.filters });
    if (res.canceled || !res.filePath) return null;
    if (typeof opts.data === "string") {
      await fs.writeFile(res.filePath, opts.data, { encoding: opts.encoding ?? "utf8" });
    }
    return res.filePath;
  });

  // ==================== Recent files ====================
  handle(INVOKE_CHANNELS.RECENT_LIST, () => listRecentFiles());
  handle(INVOKE_CHANNELS.RECENT_ADD, (_e, payload) => {
    const { path: p } = assertObject(payload);
    if (typeof p !== "string") throw new Error("path must be a string");
    app.addRecentDocument(p);
    return addRecentFile(p);
  });
  handle(INVOKE_CHANNELS.RECENT_CLEAR, () => {
    app.clearRecentDocuments();
    clearRecentFiles();
    return true;
  });

  // ==================== System ====================
  handle(INVOKE_CHANNELS.SYSTEM_OPEN_EXTERNAL, async (_e, payload) => {
    const { url } = assertObject(payload);
    if (typeof url !== "string" || !SAFE_EXTERNAL.test(url)) throw new Error("URL not allowed");
    await shell.openExternal(url);
    return true;
  });

  handle(INVOKE_CHANNELS.BACKEND_STATUS, () => backend.getStatus());
  handle(INVOKE_CHANNELS.NET_STATUS, () => network.getStatus());

  // ==================== One-way (renderer → main) ====================
  ipcMain.on(SEND_CHANNELS.LOG_RENDERER, (_e, level: unknown, message: unknown) => {
    const lvl = level === "error" || level === "warn" ? level : "info";
    log[lvl](`[renderer] ${String(message)}`);
  });
  ipcMain.on(SEND_CHANNELS.BARCODE_SCANNED, (_e, code: unknown) => {
    log.info("[barcode] scanned:", String(code));
  });

  log.info("IPC handlers registered");
}

// ==================== Validation helpers ====================
function validatePrint(payload: unknown): SilentPrintOptions {
  const o = assertObject(payload);
  if (typeof o.html !== "string" || o.html.length === 0) throw new Error("html is required");
  return o as unknown as SilentPrintOptions;
}
function validatePdf(payload: unknown): PdfExportOptions {
  const o = assertObject(payload);
  if (typeof o.html !== "string" || o.html.length === 0) throw new Error("html is required");
  return o as unknown as PdfExportOptions;
}
