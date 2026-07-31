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
  PRINT_RECEIPT: "print:receipt",
  PRINT_RAW: "print:raw",
  CASHDRAWER_OPEN: "cashdrawer:open",

  WINDOW_OPEN: "window:open",
  WINDOW_CLOSE: "window:close",
  WINDOW_FOCUS: "window:focus",

  SETTINGS_GET_ALL: "settings:get-all",
  SETTINGS_UPDATE: "settings:update",

  BACKUP_RUN: "backup:run",
  BACKUP_LIST: "backup:list",
  BACKUP_RESTORE: "backup:restore",

  CRASH_LIST: "crash:list",
  CRASH_OPEN_DIR: "crash:open-dir",

  SHORTCUTS_LIST: "shortcuts:list",

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
  SHORTCUT: "app:shortcut",
  BACKUP_DONE: "backup:done",
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

// ==================== Enterprise Desktop ====================

/** أبعاد الورق حسب نوع الطابعة (Direct Printing) */
export type PaperProfile = "A4" | "A5" | "thermal58" | "thermal80" | "label";

export interface ReceiptPrintOptions {
  html: string;
  profile: PaperProfile;
  deviceName?: string; // فارغ = الطابعة الافتراضية/المحفوظة
  copies?: number;
  landscape?: boolean;
  silent?: boolean; // false = يُظهر حوار النظام
  /** فتح درج الكاش بعد الطباعة (طابعة إيصالات) */
  openCashDrawer?: boolean;
}

/** طباعة خام (ESC/POS) لطابعات الإيصالات/الباركود عبر شبكة أو منفذ خام */
export interface RawPrintOptions {
  /** بايتات ESC/POS مُرمّزة base64 */
  dataBase64: string;
  /** طابعة شبكية: مضيف + منفذ (9100 افتراضي) */
  host?: string;
  port?: number;
}

export interface CashDrawerOptions {
  host?: string;
  port?: number;
  /** رمز النبضة: pin 2 (افتراضي) أو pin 5 */
  pin?: 2 | 5;
}

export type DesktopWindowName = "pos" | "reports" | "customer" | "print-preview";

/** إعدادات سطح المكتب الكاملة (تُحفظ محليّاً، بلا أسرار) */
export interface DesktopSettings {
  printer: string | null;
  receiptPrinter: string | null;
  receiptProfile: PaperProfile;
  barcodePrinter: string | null;
  labelPrinter: string | null;
  cashDrawer: { enabled: boolean; host: string; port: number; pin: 2 | 5 };
  camera: { deviceId: string | null };
  backup: { daily: boolean; weekly: boolean; onExit: boolean; retentionDays: number };
  sync: { enabled: boolean; intervalSec: number };
  offline: { enabled: boolean };
  notifications: { enabled: boolean };
  theme: "light" | "dark" | "system";
  language: "ar" | "en";
  startup: { launchOnBoot: boolean; startMinimized: boolean };
  autoUpdate: { enabled: boolean };
  logging: { level: "info" | "warn" | "error" | "debug" };
}

export interface BackupEntry {
  file: string;
  createdAt: string;
  sizeBytes: number;
  kind: "daily" | "weekly" | "manual" | "exit";
}

export interface CrashReport {
  file: string;
  time: string;
  reason: string;
}

export interface ShortcutDef {
  id: string;
  accelerator: string;
  description: string;
}
