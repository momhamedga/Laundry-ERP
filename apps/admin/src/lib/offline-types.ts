/**
 * أنواع طبقة الأوفلاين كما يعرّضها جسر Electron.
 *
 * مرآة يدوية لـ apps/desktop/src/shared/ipc.ts. الأدمن حزمة مستقلّة تُبنى
 * للمتصفّح أيضاً، فلا تستورد من حزمة سطح المكتب — والمرآة هي نفس نمط
 * DesktopLicenseStatus القائم. أي تغيير هناك يجب أن ينعكس هنا.
 *
 * أسماء الحقول snake_case لأنها أعمدة SQLite حرفياً، والأعلام المنطقية أرقام
 * (0/1) لأن SQLite لا يعرف نوعاً منطقياً.
 */

export interface OfflineDbStatus {
  ok: boolean;
  path: string;
  sqliteVersion: string;
  tables: number;
  pendingSync: number;
}

export interface LocalCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  /** 1 = أُنشئ محلّياً ولم يُعرف للخادم بعد */
  _local: number;
  /** 1 = فيه تعديل لم يُزامَن */
  _dirty: number;
  _synced_at: string | null;
}

export interface NewCustomer {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
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
  /** فارغ للطلبات المُنشأة أوفلاين — الخادم يمنح الرقم النهائي عند المزامنة */
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

export interface SyncResult {
  processed: number;
  done: number;
  failed: number;
  retried: number;
  skipped?: boolean;
  reason?: string;
}

export interface QueueStats {
  pending: number;
  syncing: number;
  done: number;
  failed: number;
  cancelled: number;
}

export interface SyncState {
  running: boolean;
  authed: boolean;
  pending: number;
  lastRunAt: string | null;
  lastResult: SyncResult | null;
}

/** عميل من الخادم لبذره محلّياً — بأسماء حقول الـ API لا أعمدة SQLite */
export interface ServerCustomerRow {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerPatch {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_active?: boolean;
}

export interface ListQuery {
  search?: string;
  limit?: number;
  offset?: number;
}

/** كيانات القراءة التي تُملأ من الخادم أثناء الاتصال لتُستخدم دونه */
export type CacheEntity =
  | "users"
  | "permissions"
  | "services"
  | "categories"
  | "inventory"
  | "branches";

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

/** واجهة الأوفلاين كما يعرّضها preload على window.desktop.offline */
export interface DesktopOfflineApi {
  dbStatus(): Promise<OfflineDbStatus>;
  customers: {
    create(input: NewCustomer): Promise<LocalCustomer>;
    update(id: string, patch: CustomerPatch): Promise<LocalCustomer>;
    list(query?: ListQuery): Promise<LocalCustomer[]>;
    get(id: string): Promise<LocalCustomer | null>;
    /** يبذر عملاء الخادم محلّياً؛ لا يلمس صفّاً ينتظر المزامنة */
    seed(rows: ServerCustomerRow[]): Promise<number>;
  };
  orders: {
    create(input: NewOrder): Promise<LocalOrderWithItems>;
    list(query?: ListQuery): Promise<LocalOrder[]>;
    get(id: string): Promise<LocalOrderWithItems | null>;
  };
  payments: {
    create(input: NewPayment): Promise<LocalPayment>;
    list(orderId: string): Promise<LocalPayment[]>;
  };
  cache: {
    put(entity: CacheEntity, rows: Record<string, unknown>[]): Promise<number>;
    read(entity: CacheEntity): Promise<Record<string, unknown>[]>;
  };
  queue: {
    list(limit?: number): Promise<SyncQueueItem[]>;
    failed(limit?: number): Promise<SyncQueueItem[]>;
    retry(id: number): Promise<boolean>;
    retryAll(): Promise<number>;
    discard(id: number): Promise<boolean>;
    stats(): Promise<QueueStats>;
  };
  sync: {
    setAuth(token: string | null): Promise<SyncState>;
    now(): Promise<SyncResult>;
    state(): Promise<SyncState>;
  };
}
