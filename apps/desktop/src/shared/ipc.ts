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

  OFFLINE_DB_STATUS: "offline:db-status",

  // Phase 11.6B — Offline Repository Layer (قراءة/كتابة محلّية عبر SQLite)
  OFFLINE_CUSTOMER_CREATE: "offline:customer:create",
  OFFLINE_CUSTOMER_UPDATE: "offline:customer:update",
  OFFLINE_CUSTOMER_LIST: "offline:customer:list",
  OFFLINE_CUSTOMER_GET: "offline:customer:get",
  OFFLINE_ORDER_CREATE: "offline:order:create",
  OFFLINE_ORDER_LIST: "offline:order:list",
  OFFLINE_ORDER_GET: "offline:order:get",
  OFFLINE_PAYMENT_CREATE: "offline:payment:create",
  OFFLINE_PAYMENT_LIST: "offline:payment:list",
  OFFLINE_CACHE_PUT: "offline:cache:put",
  OFFLINE_QUEUE_LIST: "offline:queue:list",

  // Phase 11.6C — Sync Engine
  OFFLINE_SYNC_SET_AUTH: "offline:sync:set-auth",
  OFFLINE_SYNC_NOW: "offline:sync:now",
  OFFLINE_SYNC_STATE: "offline:sync:state",

  // Auto-update (v1.3.0)
  UPDATE_CHECK: "update:check",
  UPDATE_DOWNLOAD: "update:download",
  UPDATE_INSTALL: "update:install",

  // Phase 11.6E — Queue management / conflict dead-letter
  OFFLINE_QUEUE_FAILED: "offline:queue:failed",
  OFFLINE_QUEUE_RETRY: "offline:queue:retry",
  OFFLINE_QUEUE_RETRY_ALL: "offline:queue:retry-all",
  OFFLINE_QUEUE_DISCARD: "offline:queue:discard",
  OFFLINE_QUEUE_STATS: "offline:queue:stats",

  // Phase 11.6D — Barcode / Camera / Scanner
  BARCODE_GENERATE: "barcode:generate",
  BARCODE_VALIDATE: "barcode:validate",
  CAMERA_SAVE_CAPTURE: "camera:save-capture",
  CAMERA_LIST_CAPTURES: "camera:list-captures",

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
  CRASH_BREADCRUMB: "crash:breadcrumb",
} as const;

/** قنوات البثّ (main → renderer عبر webContents.send) */
export const EVENT_CHANNELS = {
  BACKEND_STATUS_CHANGED: "backend:status-changed",
  NET_STATUS_CHANGED: "net:status-changed",
  UPDATE_STATUS: "update:status",
  NAVIGATE: "app:navigate",
  SHORTCUT: "app:shortcut",
  BACKUP_DONE: "backup:done",
  SYNC_STATUS: "offline:sync:status",
  BARCODE_SCAN: "barcode:scan",
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

/** حالة قاعدة SQLite المحلّية (Phase 11.6A) */
export interface OfflineDbStatus {
  ok: boolean;
  path: string;
  sqliteVersion: string;
  tables: number;
  pendingSync: number;
}

// ==================== Phase 11.6B — Offline Repository Layer ====================
// أنواع الصفوف المحلّية (تطابق أعمدة SQLite: 0/1 للأعلام المنطقية)

export interface LocalCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  _local: number;
  _dirty: number;
  _synced_at: string | null;
}
export interface NewCustomer {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}
export interface CustomerPatch {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_active?: boolean;
}

export interface LocalOrderItem {
  id: string;
  order_id: string;
  service_id: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
  notes: string | null;
}
export interface NewOrderItem {
  service_id?: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  notes?: string;
}

export interface LocalOrder {
  id: string;
  order_number: string | null;
  customer_id: string | null;
  branch_id: string | null;
  status: string;
  payment_status: string;
  subtotal: number;
  discount: number;
  total: number;
  paid_amount: number;
  received_at: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  _local: number;
  _dirty: number;
  _synced_at: string | null;
}
export interface LocalOrderWithItems extends LocalOrder {
  items: LocalOrderItem[];
}
export interface NewOrder {
  customer_id?: string;
  branch_id?: string;
  order_number?: string;
  items: NewOrderItem[];
  discount?: number;
  notes?: string;
  due_date?: string;
}

export interface LocalPayment {
  id: string;
  order_id: string;
  amount: number;
  method: string;
  status: string;
  reference: string | null;
  created_at: string;
  _local: number;
  _dirty: number;
  _synced_at: string | null;
}
export interface NewPayment {
  order_id: string;
  amount: number;
  method?: string;
  reference?: string;
}

export interface SyncQueueItem {
  id: number;
  entity: string;
  op: string;
  entity_id: string | null;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

/** نتيجة تشغيل مزامنة واحد (Phase 11.6C) */
export interface SyncResult {
  processed: number;
  done: number;
  failed: number;
  retried: number;
  skipped?: boolean;
  reason?: string;
}

/** عدّادات طابور المزامنة حسب الحالة (Phase 11.6E) */
export interface QueueStats {
  pending: number;
  syncing: number;
  done: number;
  failed: number;
  cancelled: number;
}

/** حالة محرّك المزامنة (Phase 11.6C) */
export interface SyncState {
  running: boolean;
  authed: boolean;
  pending: number;
  lastRunAt: string | null;
  lastResult: SyncResult | null;
}

/** كيانات الكاش للقراءة (تُملأ من السيرفر عند الاتصال) */
export type CacheEntity =
  | "users"
  | "permissions"
  | "services"
  | "categories"
  | "inventory"
  | "branches";

export interface ListQuery {
  search?: string;
  limit?: number;
  offset?: number;
}

// ==================== Phase 11.6D — Barcode / Camera / Scanner ====================

export type BarcodeSymbology = "code128" | "code39" | "ean13" | "ean8" | "upca" | "qrcode";

export interface GenerateBarcodeOptions {
  text: string;
  symbology: BarcodeSymbology;
  /** تكبير الوحدة (1D) */
  scale?: number;
  /** ارتفاع بالمليمترات (1D) */
  height?: number;
  /** إظهار النص أسفل الباركود (1D) */
  includetext?: boolean;
  /** هامش QR بالوحدات */
  margin?: number;
  /** عرض QR بالبكسل */
  width?: number;
}

/** نتيجة التحقّق من رمز ممسوح (نوع مُستنتَج + صلاحية). */
export interface ScanValidation {
  value: string;
  valid: boolean;
  type: BarcodeSymbology | null;
}

export interface SaveCaptureOptions {
  /** data:image/(png|jpeg|webp);base64,... من الواجهة (canvas.toDataURL) */
  dataUrl: string;
  /** وسم يُدمج في اسم الملف (مثل رقم الطلب) */
  tag?: string;
}

export interface CameraCapture {
  file: string;
  name: string;
  sizeBytes: number;
  createdAt: string;
}
