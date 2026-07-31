import Database from "better-sqlite3";
import { app } from "electron";
import path from "node:path";
import { scoped } from "../logger.js";

const log = scoped("sqlite");

/**
 * قاعدة SQLite المحلّية للعمل دون إنترنت (Phase 11.6A). مستقلّة تماماً عن Postgres
 * الخاص بالسيرفر - كاش + طابور مزامنة + بيانات مؤقتة فقط. لا تغيّر أي API/مخطّط سيرفر.
 *
 * الوحدة الأصلية better-sqlite3 مبنية لـ ABI الخاص بـ Electron (electron-rebuild).
 * عند التغليف يفكّها electron-builder خارج asar تلقائياً (كشف *.node).
 */

/** مخطّط 15 جدولاً: بيانات محليّة + كاش + بنية المزامنة. مفاتيح أجنبية + فهارس. */
const SCHEMA = `
PRAGMA foreign_keys = ON;

-- ==================== بيانات محليّة (قابلة للإنشاء/التعديل دون إنترنت) ====================
CREATE TABLE IF NOT EXISTS customers (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  _local       INTEGER NOT NULL DEFAULT 0,  -- أُنشئ محليّاً (بلا id سيرفر بعد)
  _dirty       INTEGER NOT NULL DEFAULT 0,  -- يحتاج مزامنة
  _synced_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_customers_dirty ON customers(_dirty);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

CREATE TABLE IF NOT EXISTS orders (
  id             TEXT PRIMARY KEY,
  order_number   TEXT,
  customer_id    TEXT,
  branch_id      TEXT,
  status         TEXT NOT NULL DEFAULT 'RECEIVED',
  payment_status TEXT NOT NULL DEFAULT 'UNPAID',
  subtotal       REAL NOT NULL DEFAULT 0,
  discount       REAL NOT NULL DEFAULT 0,
  total          REAL NOT NULL DEFAULT 0,
  paid_amount    REAL NOT NULL DEFAULT 0,
  received_at    TEXT,
  due_date       TEXT,
  notes          TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  _local         INTEGER NOT NULL DEFAULT 0,
  _dirty         INTEGER NOT NULL DEFAULT 0,
  _synced_at     TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_dirty ON orders(_dirty);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);

CREATE TABLE IF NOT EXISTS order_items (
  id          TEXT PRIMARY KEY,
  order_id    TEXT NOT NULL,
  service_id  TEXT,
  quantity    REAL NOT NULL DEFAULT 1,
  unit_price  REAL NOT NULL DEFAULT 0,
  discount    REAL NOT NULL DEFAULT 0,
  subtotal    REAL NOT NULL DEFAULT 0,
  notes       TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS payments (
  id          TEXT PRIMARY KEY,
  order_id    TEXT NOT NULL,
  amount      REAL NOT NULL,
  method      TEXT NOT NULL DEFAULT 'CASH',
  status      TEXT NOT NULL DEFAULT 'COMPLETED',
  reference   TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  _local      INTEGER NOT NULL DEFAULT 0,
  _dirty      INTEGER NOT NULL DEFAULT 0,
  _synced_at  TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_dirty ON payments(_dirty);

CREATE TABLE IF NOT EXISTS employees (
  id          TEXT PRIMARY KEY,
  user_id     TEXT,
  status      TEXT,
  cached_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  TEXT
);

-- ==================== بنية المزامنة ====================
CREATE TABLE IF NOT EXISTS sync_queue (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity      TEXT NOT NULL,              -- customer|order|payment|inventory|notification
  op          TEXT NOT NULL,              -- create|update|delete
  entity_id   TEXT,                       -- id محلّي/سيرفر
  payload     TEXT NOT NULL,              -- JSON للعملية
  status       TEXT NOT NULL DEFAULT 'pending', -- pending|syncing|done|failed|cancelled
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT,
  next_attempt_at TEXT,                        -- تراجع أُسّي: لا تُلتقط قبل هذا الوقت
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, id);

CREATE TABLE IF NOT EXISTS sync_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_id   INTEGER,
  entity     TEXT,
  op         TEXT,
  result     TEXT,                        -- ok|error|conflict
  message    TEXT,
  at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS offline_events (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  type   TEXT NOT NULL,
  data   TEXT,
  at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==================== كاش القراءة (Read-only محلياً) ====================
CREATE TABLE IF NOT EXISTS cached_users (
  id         TEXT PRIMARY KEY,
  email      TEXT,
  role       TEXT,
  name       TEXT,
  is_active  INTEGER,
  branch_id  TEXT,
  cached_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS cached_permissions (
  user_id     TEXT NOT NULL,
  permission  TEXT NOT NULL,
  granted     INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, permission)
);
CREATE TABLE IF NOT EXISTS cached_services (
  id          TEXT PRIMARY KEY,
  name        TEXT,
  category_id TEXT,
  price       REAL,
  unit        TEXT,
  is_active   INTEGER,
  cached_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS cached_categories (
  id         TEXT PRIMARY KEY,
  name       TEXT,
  sort_order INTEGER,
  is_active  INTEGER,
  cached_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS cached_inventory (
  id            TEXT PRIMARY KEY,
  sku           TEXT,
  name          TEXT,
  quantity      REAL,
  reorder_level REAL,
  cached_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS cached_branches (
  id         TEXT PRIMARY KEY,
  name       TEXT,
  is_active  INTEGER,
  cached_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==================== خريطة المعرّفات (Phase 11.6C) ====================
-- تربط المعرّف المحلّي (local_*) بمعرّف السيرفر بعد نجاح المزامنة، لتعتمد عليها
-- العمليات التابعة (طلب يشير لعميل أُنشئ أوفلاين، دفعة تشير لطلب … إلخ).
CREATE TABLE IF NOT EXISTS id_map (
  entity     TEXT NOT NULL,             -- customer|order|payment
  local_id   TEXT NOT NULL,
  server_id  TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (entity, local_id)
);
`;

export const OFFLINE_TABLES = [
  "customers", "orders", "order_items", "payments", "employees", "settings",
  "sync_queue", "sync_log", "offline_events",
  "cached_users", "cached_permissions", "cached_services",
  "cached_categories", "cached_inventory", "cached_branches",
] as const;

let db: Database.Database | null = null;

/** يضيف عموداً إن لم يكن موجوداً (ترقية idempotent لقواعد أُنشئت بمخطّط أقدم). */
function ensureColumn(d: Database.Database, table: string, column: string, ddl: string): void {
  const cols = d.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) d.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

/** ترقيات المخطّط للقواعد القائمة (Phase 11.6E: عمود جدولة التراجع). */
function migrate(d: Database.Database): void {
  ensureColumn(d, "sync_queue", "next_attempt_at", "next_attempt_at TEXT");
}

/** يفتح القاعدة (userData/laundry-offline.db) ويطبّق المخطّط. آمن للاستدعاء المتكرّر. */
export function initDatabase(): Database.Database {
  if (db) return db;
  const file = path.join(app.getPath("userData"), "laundry-offline.db");
  db = new Database(file);
  db.pragma("journal_mode = WAL"); // كتابة متزامنة أفضل
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON"); // سلامة مرجعية
  db.exec(SCHEMA); // إنشاء الجداول إن لم توجد (idempotent)
  migrate(db); // ترقيات الأعمدة للقواعد القائمة
  const ver = (db.prepare("select sqlite_version() v").get() as { v: string }).v;
  log.info(`SQLite ready at ${file} (sqlite ${ver})`);
  return db;
}

export function getDb(): Database.Database {
  if (!db) return initDatabase();
  return db;
}

/** غلاف معاملة: كل الكتابات داخل transaction ذرّية (rollback عند أي خطأ). */
export function tx<T>(fn: (d: Database.Database) => T): T {
  const d = getDb();
  return d.transaction(fn)(d);
}

/** حالة القاعدة للتحقّق/الواجهة: المسار + عدد الجداول + عدّادات المزامنة. */
export function dbStatus(): {
  ok: boolean;
  path: string;
  sqliteVersion: string;
  tables: number;
  pendingSync: number;
} {
  const d = getDb();
  const tables = (d.prepare(
    "select count(*) c from sqlite_master where type='table' and name not like 'sqlite_%'",
  ).get() as { c: number }).c;
  const pendingSync = (d.prepare("select count(*) c from sync_queue where status='pending'").get() as { c: number }).c;
  const sqliteVersion = (d.prepare("select sqlite_version() v").get() as { v: string }).v;
  return { ok: true, path: d.name, sqliteVersion, tables, pendingSync };
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    log.info("SQLite closed");
  }
}
