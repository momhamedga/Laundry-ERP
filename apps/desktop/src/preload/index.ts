import { contextBridge, ipcRenderer } from "electron";
import {
  EVENT_CHANNELS,
  INVOKE_CHANNELS,
  SEND_CHANNELS,
  type AppInfo,
  type BackendStatus,
  type BackupEntry,
  type CashDrawerOptions,
  type CrashReport,
  type DesktopSettings,
  type DesktopWindowName,
  type IpcResult,
  type NetStatus,
  type OpenFileOptions,
  type PdfExportOptions,
  type PrinterInfo,
  type RawPrintOptions,
  type ReceiptPrintOptions,
  type SaveFileOptions,
  type ShortcutDef,
  type SilentPrintOptions,
  type UpdateStatus,
} from "../shared/ipc.js";

/**
 * الجسر الآمن الوحيد بين الـ renderer والـ main (Context Isolation + Sandbox).
 * لا Node ولا ipcRenderer خام في الـ renderer - فقط هذا السطح المُصرّح به المُحقَّق.
 * مُجمَّع بـ esbuild في ملف واحد (متوافق مع sandbox=true).
 */
async function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  const res = (await ipcRenderer.invoke(channel, payload)) as IpcResult<T>;
  if (!res.ok) throw new Error(res.error ?? "IPC error");
  return res.data as T;
}

/** يشترك في قناة بثّ مُصرّح بها ويُعيد دالة إلغاء الاشتراك */
function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_e: unknown, payload: T): void => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api = {
  app: {
    getInfo: () => invoke<AppInfo>(INVOKE_CHANNELS.APP_GET_INFO),
    relaunch: () => invoke<void>(INVOKE_CHANNELS.APP_RELAUNCH),
    quit: () => invoke<void>(INVOKE_CHANNELS.APP_QUIT),
  },
  storage: {
    get: <T>(key: string) => invoke<T>(INVOKE_CHANNELS.STORAGE_GET, { key }),
    set: (key: string, value: unknown) => invoke<boolean>(INVOKE_CHANNELS.STORAGE_SET, { key, value }),
    delete: (key: string) => invoke<boolean>(INVOKE_CHANNELS.STORAGE_DELETE, { key }),
  },
  print: {
    listPrinters: () => invoke<PrinterInfo[]>(INVOKE_CHANNELS.PRINT_LIST_PRINTERS),
    silent: (opts: SilentPrintOptions) => invoke<void>(INVOKE_CHANNELS.PRINT_SILENT, opts),
    preview: (opts: SilentPrintOptions) => invoke<void>(INVOKE_CHANNELS.PRINT_PREVIEW, opts),
    toPdf: (opts: PdfExportOptions) => invoke<string | null>(INVOKE_CHANNELS.PRINT_TO_PDF, opts),
    receipt: (opts: ReceiptPrintOptions) => invoke<boolean>(INVOKE_CHANNELS.PRINT_RECEIPT, opts),
    raw: (opts: RawPrintOptions) => invoke<boolean>(INVOKE_CHANNELS.PRINT_RAW, opts),
  },
  cashDrawer: {
    open: (opts?: CashDrawerOptions) => invoke<boolean>(INVOKE_CHANNELS.CASHDRAWER_OPEN, opts ?? {}),
  },
  windows: {
    open: (name: DesktopWindowName) => invoke<boolean>(INVOKE_CHANNELS.WINDOW_OPEN, { name }),
    close: (name: DesktopWindowName) => invoke<boolean>(INVOKE_CHANNELS.WINDOW_CLOSE, { name }),
    focus: (name: DesktopWindowName) => invoke<boolean>(INVOKE_CHANNELS.WINDOW_FOCUS, { name }),
  },
  settings: {
    getAll: () => invoke<DesktopSettings>(INVOKE_CHANNELS.SETTINGS_GET_ALL),
    update: (patch: Partial<DesktopSettings>) => invoke<DesktopSettings>(INVOKE_CHANNELS.SETTINGS_UPDATE, patch),
  },
  backup: {
    run: () => invoke<BackupEntry>(INVOKE_CHANNELS.BACKUP_RUN),
    list: () => invoke<BackupEntry[]>(INVOKE_CHANNELS.BACKUP_LIST),
    restore: (file: string) => invoke<string[]>(INVOKE_CHANNELS.BACKUP_RESTORE, { file }),
  },
  crash: {
    list: () => invoke<CrashReport[]>(INVOKE_CHANNELS.CRASH_LIST),
    openDir: () => invoke<boolean>(INVOKE_CHANNELS.CRASH_OPEN_DIR),
  },
  shortcuts: {
    list: () => invoke<ShortcutDef[]>(INVOKE_CHANNELS.SHORTCUTS_LIST),
  },
  dialog: {
    openFile: (opts?: OpenFileOptions) => invoke<string[]>(INVOKE_CHANNELS.DIALOG_OPEN_FILE, opts),
    saveFile: (opts: SaveFileOptions) => invoke<string | null>(INVOKE_CHANNELS.DIALOG_SAVE_FILE, opts),
  },
  recent: {
    list: () => invoke<string[]>(INVOKE_CHANNELS.RECENT_LIST),
    add: (path: string) => invoke<string[]>(INVOKE_CHANNELS.RECENT_ADD, { path }),
    clear: () => invoke<boolean>(INVOKE_CHANNELS.RECENT_CLEAR),
  },
  system: {
    openExternal: (url: string) => invoke<boolean>(INVOKE_CHANNELS.SYSTEM_OPEN_EXTERNAL, { url }),
  },
  status: {
    backend: () => invoke<BackendStatus>(INVOKE_CHANNELS.BACKEND_STATUS),
    net: () => invoke<NetStatus>(INVOKE_CHANNELS.NET_STATUS),
  },
  log: (level: "info" | "warn" | "error", message: string) =>
    ipcRenderer.send(SEND_CHANNELS.LOG_RENDERER, level, message),
  notifyScan: (code: string) => ipcRenderer.send(SEND_CHANNELS.BARCODE_SCANNED, code),
  on: {
    backendStatus: (cb: (s: BackendStatus) => void) =>
      subscribe<BackendStatus>(EVENT_CHANNELS.BACKEND_STATUS_CHANGED, cb),
    netStatus: (cb: (s: NetStatus) => void) => subscribe<NetStatus>(EVENT_CHANNELS.NET_STATUS_CHANGED, cb),
    updateStatus: (cb: (s: UpdateStatus) => void) => subscribe<UpdateStatus>(EVENT_CHANNELS.UPDATE_STATUS, cb),
    navigate: (cb: (route: string) => void) => subscribe<string>(EVENT_CHANNELS.NAVIGATE, cb),
    shortcut: (cb: (action: string) => void) => subscribe<string>(EVENT_CHANNELS.SHORTCUT, cb),
    backupDone: (cb: (e: BackupEntry) => void) => subscribe<BackupEntry>(EVENT_CHANNELS.BACKUP_DONE, cb),
  },
} as const;

export type DesktopApi = typeof api;

contextBridge.exposeInMainWorld("desktop", api);
