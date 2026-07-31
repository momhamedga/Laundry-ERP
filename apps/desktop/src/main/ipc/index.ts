import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from "electron";
import fs from "node:fs/promises";
import { scoped } from "../logger.js";
import { getMainWindow } from "../windows/main-window.js";
import {
  exportPdf,
  listPrinters,
  previewPrint,
  printRaw,
  printReceipt,
  silentPrint,
} from "../services/printing.js";
import { openCashDrawer } from "../services/cash-drawer.js";
import { closeWindow, focusWindow, openWindow } from "../windows/windows-manager.js";
import { getSettings, updateSettings } from "../services/settings.js";
import { listBackups, restoreBackup, runBackup } from "../services/backup.js";
import { addBreadcrumb, listCrashReports, openCrashDir } from "../services/crash-reporter.js";
import { listShortcuts } from "../services/shortcuts.js";
import { syncEngine } from "../services/sync-engine.js";
import { checkForUpdates, downloadUpdate, installUpdate } from "../services/updater.js";
import { generateBarcode, validateScan } from "../services/barcode.js";
import { listCaptures, saveCapture } from "../services/camera.js";
import { recordEvent } from "../db/repositories/events.repo.js";
import { dbStatus } from "../db/database.js";
import {
  createCustomer,
  updateCustomer,
  listCustomers,
  getCustomer,
  createOrder,
  listOrders,
  getOrder,
  createPayment,
  listPayments,
  putCache,
  listAll as listQueue,
  listFailed,
  retryOp,
  retryAllFailed,
  discardOp,
  queueStats,
} from "../db/repositories/index.js";
import type { BackendManager } from "../services/backend-manager.js";
import type { NetworkMonitor } from "../services/network.js";
import type {
  CacheEntity,
  CashDrawerOptions,
  CustomerPatch,
  DesktopSettings,
  DesktopWindowName,
  ListQuery,
  NewCustomer,
  NewOrder,
  NewPayment,
  RawPrintOptions,
  ReceiptPrintOptions,
} from "../../shared/ipc.js";
import {
  INVOKE_CHANNELS,
  EVENT_CHANNELS,
  SEND_CHANNELS,
  RENDERER_ALLOWED_KEYS_HELP,
  type AppInfo,
  type BarcodeSymbology,
  type GenerateBarcodeOptions,
  type IpcResult,
  type OpenFileOptions,
  type PdfExportOptions,
  type SaveCaptureOptions,
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

  // ==================== Enterprise: printing / cash drawer ====================
  handle(INVOKE_CHANNELS.PRINT_RECEIPT, async (_e, payload) => {
    const o = assertObject(payload);
    if (typeof o.html !== "string" || o.html.length === 0) throw new Error("html is required");
    if (typeof o.profile !== "string") throw new Error("profile is required");
    await printReceipt(o as unknown as ReceiptPrintOptions);
    return true;
  });
  handle(INVOKE_CHANNELS.PRINT_RAW, async (_e, payload) => {
    const o = assertObject(payload);
    if (typeof o.dataBase64 !== "string") throw new Error("dataBase64 is required");
    await printRaw(o as unknown as RawPrintOptions);
    return true;
  });
  handle(INVOKE_CHANNELS.CASHDRAWER_OPEN, async (_e, payload) => {
    await openCashDrawer((payload ?? {}) as CashDrawerOptions);
    return true;
  });

  // ==================== Enterprise: windows ====================
  const asWindowName = (payload: unknown): DesktopWindowName => {
    const { name } = assertObject(payload);
    const valid: DesktopWindowName[] = ["pos", "reports", "customer", "print-preview"];
    if (!valid.includes(name as DesktopWindowName)) throw new Error(`Invalid window: ${String(name)}`);
    return name as DesktopWindowName;
  };
  handle(INVOKE_CHANNELS.WINDOW_OPEN, (_e, p) => (openWindow(asWindowName(p)), true));
  handle(INVOKE_CHANNELS.WINDOW_CLOSE, (_e, p) => (closeWindow(asWindowName(p)), true));
  handle(INVOKE_CHANNELS.WINDOW_FOCUS, (_e, p) => (focusWindow(asWindowName(p)), true));

  // ==================== Enterprise: settings ====================
  handle(INVOKE_CHANNELS.SETTINGS_GET_ALL, () => getSettings());
  handle(INVOKE_CHANNELS.SETTINGS_UPDATE, (_e, payload) =>
    updateSettings(assertObject(payload) as Partial<DesktopSettings>),
  );

  // ==================== Enterprise: backup / restore ====================
  handle(INVOKE_CHANNELS.BACKUP_RUN, () => runBackup("manual"));
  handle(INVOKE_CHANNELS.BACKUP_LIST, () => listBackups());
  handle(INVOKE_CHANNELS.BACKUP_RESTORE, (_e, payload) => {
    const { file } = assertObject(payload);
    if (typeof file !== "string") throw new Error("file is required");
    return restoreBackup(file);
  });

  // ==================== Enterprise: crash / shortcuts ====================
  handle(INVOKE_CHANNELS.CRASH_LIST, () => listCrashReports());
  handle(INVOKE_CHANNELS.CRASH_OPEN_DIR, () => (openCrashDir(), true));
  handle(INVOKE_CHANNELS.SHORTCUTS_LIST, () => listShortcuts());

  // ==================== Offline (Phase 11.6A): حالة قاعدة SQLite ====================
  handle(INVOKE_CHANNELS.OFFLINE_DB_STATUS, () => dbStatus());

  // ==================== Offline Repository (Phase 11.6B): قراءة/كتابة محلّية ====================
  const asString = (o: Record<string, unknown>, key: string): string => {
    const v = o[key];
    if (typeof v !== "string" || v.length === 0) throw new Error(`${key} is required`);
    return v;
  };

  handle(INVOKE_CHANNELS.OFFLINE_CUSTOMER_CREATE, (_e, p) =>
    createCustomer(assertObject(p) as unknown as NewCustomer),
  );
  handle(INVOKE_CHANNELS.OFFLINE_CUSTOMER_UPDATE, (_e, p) => {
    const o = assertObject(p);
    return updateCustomer(asString(o, "id"), (o.patch ?? {}) as CustomerPatch);
  });
  handle(INVOKE_CHANNELS.OFFLINE_CUSTOMER_LIST, (_e, p) =>
    listCustomers((p ?? {}) as ListQuery),
  );
  handle(INVOKE_CHANNELS.OFFLINE_CUSTOMER_GET, (_e, p) =>
    getCustomer(asString(assertObject(p), "id")),
  );

  handle(INVOKE_CHANNELS.OFFLINE_ORDER_CREATE, (_e, p) =>
    createOrder(assertObject(p) as unknown as NewOrder),
  );
  handle(INVOKE_CHANNELS.OFFLINE_ORDER_LIST, (_e, p) => listOrders((p ?? {}) as ListQuery));
  handle(INVOKE_CHANNELS.OFFLINE_ORDER_GET, (_e, p) =>
    getOrder(asString(assertObject(p), "id")),
  );

  handle(INVOKE_CHANNELS.OFFLINE_PAYMENT_CREATE, (_e, p) =>
    createPayment(assertObject(p) as unknown as NewPayment),
  );
  handle(INVOKE_CHANNELS.OFFLINE_PAYMENT_LIST, (_e, p) =>
    listPayments(asString(assertObject(p), "order_id")),
  );

  const CACHE_ENTITIES: CacheEntity[] = [
    "users", "permissions", "services", "categories", "inventory", "branches",
  ];
  handle(INVOKE_CHANNELS.OFFLINE_CACHE_PUT, (_e, p) => {
    const o = assertObject(p);
    const entity = o.entity as CacheEntity;
    if (!CACHE_ENTITIES.includes(entity)) throw new Error(`Invalid cache entity: ${String(entity)}`);
    if (!Array.isArray(o.rows)) throw new Error("rows must be an array");
    return putCache(entity, o.rows as Record<string, unknown>[]);
  });
  handle(INVOKE_CHANNELS.OFFLINE_QUEUE_LIST, (_e, p) => {
    const o = (p ?? {}) as { limit?: number };
    return listQueue(typeof o.limit === "number" ? o.limit : 200);
  });

  // ==================== Sync Engine (Phase 11.6C) ====================
  handle(INVOKE_CHANNELS.OFFLINE_SYNC_SET_AUTH, (_e, p) => {
    const o = assertObject(p);
    const token = o.token;
    syncEngine.setAuth(token === null || typeof token === "string" ? (token as string | null) : null);
    return syncEngine.getState();
  });
  handle(INVOKE_CHANNELS.OFFLINE_SYNC_NOW, () => syncEngine.syncNow("manual"));
  handle(INVOKE_CHANNELS.OFFLINE_SYNC_STATE, () => syncEngine.getState());

  // ==================== Queue management / dead-letter (Phase 11.6E) ====================
  const asId = (p: unknown): number => {
    const { id } = assertObject(p);
    if (typeof id !== "number" || !Number.isInteger(id)) throw new Error("id must be an integer");
    return id;
  };
  handle(INVOKE_CHANNELS.OFFLINE_QUEUE_FAILED, (_e, p) => {
    const o = (p ?? {}) as { limit?: number };
    return listFailed(typeof o.limit === "number" ? o.limit : 200);
  });
  handle(INVOKE_CHANNELS.OFFLINE_QUEUE_RETRY, (_e, p) => retryOp(asId(p)));
  handle(INVOKE_CHANNELS.OFFLINE_QUEUE_RETRY_ALL, () => retryAllFailed());
  handle(INVOKE_CHANNELS.OFFLINE_QUEUE_DISCARD, (_e, p) => discardOp(asId(p)));
  handle(INVOKE_CHANNELS.OFFLINE_QUEUE_STATS, () => queueStats());

  // ==================== Auto-update (v1.3.0) ====================
  handle(INVOKE_CHANNELS.UPDATE_CHECK, () => checkForUpdates());
  handle(INVOKE_CHANNELS.UPDATE_DOWNLOAD, () => downloadUpdate());
  handle(INVOKE_CHANNELS.UPDATE_INSTALL, () => installUpdate());

  // ==================== Barcode / Camera / Scanner (Phase 11.6D) ====================
  const SYMBOLOGIES: BarcodeSymbology[] = ["code128", "code39", "ean13", "ean8", "upca", "qrcode"];
  handle(INVOKE_CHANNELS.BARCODE_GENERATE, (_e, p) => {
    const o = assertObject(p);
    if (typeof o.text !== "string") throw new Error("text is required");
    if (!SYMBOLOGIES.includes(o.symbology as BarcodeSymbology)) {
      throw new Error(`Invalid symbology: ${String(o.symbology)}`);
    }
    return generateBarcode(o as unknown as GenerateBarcodeOptions);
  });
  handle(INVOKE_CHANNELS.BARCODE_VALIDATE, (_e, p) => {
    const o = assertObject(p);
    if (typeof o.value !== "string") throw new Error("value is required");
    return validateScan(o.value);
  });
  handle(INVOKE_CHANNELS.CAMERA_SAVE_CAPTURE, (_e, p) =>
    saveCapture(assertObject(p) as unknown as SaveCaptureOptions),
  );
  handle(INVOKE_CHANNELS.CAMERA_LIST_CAPTURES, () => listCaptures());

  // ==================== One-way (renderer → main) ====================
  ipcMain.on(SEND_CHANNELS.LOG_RENDERER, (_e, level: unknown, message: unknown) => {
    const lvl = level === "error" || level === "warn" ? level : "info";
    log[lvl](`[renderer] ${String(message)}`);
  });
  // ماسح USB (keyboard-wedge): الواجهة تلتقط القيمة الكاملة وترسلها؛ هنا نتحقّق،
  // نسجّل الحدث محلّياً، ونبثّه لكل النوافذ لتتفاعل الشاشة النشطة (POS/الطلبات).
  ipcMain.on(SEND_CHANNELS.CRASH_BREADCRUMB, (_e, action: unknown) => {
    addBreadcrumb(String(action));
  });
  ipcMain.on(SEND_CHANNELS.BARCODE_SCANNED, (_e, code: unknown) => {
    const result = validateScan(String(code));
    try {
      recordEvent("barcode-scan", result);
    } catch (err) {
      log.warn("failed to record scan:", err);
    }
    log.info(`[barcode] scanned "${result.value}" (${result.type ?? "?"}, valid=${result.valid})`);
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send(EVENT_CHANNELS.BARCODE_SCAN, result);
    }
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
