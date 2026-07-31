/**
 * عقد IPC المشترك بين Main و Preload (والـ Renderer عبر window.desktop).
 *
 * كل قناة مُصرّح بها هنا فقط (whitelist) - أي قناة خارج هذه القائمة تُرفض في Main.
 * الأنواع تُمحى وقت الترجمة؛ CHANNELS قيمة حقيقية يُدمجها esbuild في الـ preload.
 */

/** قنوات invoke (طلب/استجابة renderer → main) */
export const INVOKE_CHANNELS = {
  APP_GET_INFO: "app:get-info",
  APP_RELAUNCH: "app:relaunch",
  APP_QUIT: "app:quit",

  STORAGE_GET: "storage:get",
  STORAGE_SET: "storage:set",
  STORAGE_DELETE: "storage:delete",

  PRINT_LIST_PRINTERS: "print:list-printers",
  PRINT_SILENT: "print:silent",
  PRINT_PREVIEW: "print:preview",
  PRINT_TO_PDF: "print:to-pdf",

  DIALOG_OPEN_FILE: "dialog:open-file",
  DIALOG_SAVE_FILE: "dialog:save-file",

  RECENT_LIST: "recent:list",
  RECENT_ADD: "recent:add",
  RECENT_CLEAR: "recent:clear",

  SYSTEM_OPEN_EXTERNAL: "system:open-external",
  BACKEND_STATUS: "backend:status",
  NET_STATUS: "net:status",
} as const;

/** قنوات send أحادية الاتجاه (renderer → main) */
export const SEND_CHANNELS = {
  LOG_RENDERER: "log:renderer",
  BARCODE_SCANNED: "barcode:scanned",
} as const;

/** قنوات البثّ (main → renderer عبر webContents.send) */
export const EVENT_CHANNELS = {
  BACKEND_STATUS_CHANGED: "backend:status-changed",
  NET_STATUS_CHANGED: "net:status-changed",
  UPDATE_STATUS: "update:status",
  NAVIGATE: "app:navigate",
} as const;

/** مفاتيح التخزين المسموح بها للـ renderer (للرسائل التشخيصية) */
export const RENDERER_ALLOWED_KEYS_HELP = "theme|language|printer|recentPrinter|settings";

export type InvokeChannel = (typeof INVOKE_CHANNELS)[keyof typeof INVOKE_CHANNELS];
export type SendChannel = (typeof SEND_CHANNELS)[keyof typeof SEND_CHANNELS];
export type EventChannel = (typeof EVENT_CHANNELS)[keyof typeof EVENT_CHANNELS];

/** المجموعة الكاملة المُصرّح بها للتحقق في Main */
export const ALLOWED_INVOKE = new Set<string>(Object.values(INVOKE_CHANNELS));
export const ALLOWED_SEND = new Set<string>(Object.values(SEND_CHANNELS));
export const ALLOWED_EVENT = new Set<string>(Object.values(EVENT_CHANNELS));

// ==================== الأنواع ====================

export interface AppInfo {
  appVersion: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  platform: NodeJS.Platform;
  arch: string;
  packaged: boolean;
  locale: string;
}

export type BackendStatus = "starting" | "ready" | "reusing-external" | "crashed" | "restarting" | "stopped";
export type NetStatus = "online" | "offline";
export type UpdateStatus =
  | { state: "checking" }
  | { state: "available"; version: string }
  | { state: "not-available" }
  | { state: "downloading"; percent: number }
  | { state: "downloaded"; version: string }
  | { state: "error"; message: string }
  | { state: "disabled" };

export interface PrinterInfo {
  name: string;
  displayName: string;
  description: string;
  isDefault: boolean;
  status: number;
}

export interface SilentPrintOptions {
  /** HTML كامل للطباعة الصامتة (فاتورة/ملصق) */
  html: string;
  deviceName?: string;
  landscape?: boolean;
  copies?: number;
  /** بوصة → margins؛ الافتراضي هوامش افتراضية للطابعة */
  margins?: "default" | "none" | "minimum";
  pageSize?: "A4" | "A5" | "Letter" | { width: number; height: number };
  silent?: boolean;
}

export interface PdfExportOptions {
  html: string;
  landscape?: boolean;
  pageSize?: "A4" | "A5" | "Letter";
  /** مسار الحفظ؛ إن غاب يُفتح Save Dialog */
  savePath?: string;
  defaultFileName?: string;
}

export interface OpenFileOptions {
  title?: string;
  filters?: { name: string; extensions: string[] }[];
  multi?: boolean;
}

export interface SaveFileOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
  /** محتوى نصّي/base64 يُكتب للملف عند اختيار المسار */
  data?: string;
  encoding?: "utf8" | "base64";
}

export interface IpcResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
