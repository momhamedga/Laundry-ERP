import type { CacheEntity } from "../../../shared/ipc.js";
import { getDb, tx } from "./base.js";

/**
 * Repository الكاش للقراءة: يملأ جداول cached_* من السيرفر عند الاتصال، ليقرأها
 * الوضع دون إنترنت (خدمات/فئات/مستخدمون/صلاحيات/مخزون/فروع). استبدال كامل ذرّي.
 */

interface CacheTable {
  table: string;
  columns: string[];
  /** أعمدة منطقية تُحوّل إلى 0/1 عند الإدراج. */
  bools?: string[];
}

const CACHE_TABLES: Record<CacheEntity, CacheTable> = {
  users: {
    table: "cached_users",
    columns: ["id", "email", "role", "name", "is_active", "branch_id"],
    bools: ["is_active"],
  },
  permissions: {
    table: "cached_permissions",
    columns: ["user_id", "permission", "granted"],
    bools: ["granted"],
  },
  services: {
    table: "cached_services",
    columns: ["id", "name", "category_id", "price", "unit", "is_active"],
    bools: ["is_active"],
  },
  categories: {
    table: "cached_categories",
    columns: ["id", "name", "sort_order", "is_active"],
    bools: ["is_active"],
  },
  inventory: {
    table: "cached_inventory",
    columns: ["id", "sku", "name", "quantity", "reorder_level"],
  },
  branches: {
    table: "cached_branches",
    columns: ["id", "name", "is_active"],
    bools: ["is_active"],
  },
};

function coerce(value: unknown, isBool: boolean): unknown {
  if (isBool) return value ? 1 : 0;
  if (value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

/**
 * يستبدل محتوى كاش كيان كامل بالصفوف الواردة (delete-all ثم insert) ذرّياً.
 * يعيد عدد الصفوف المُدرَجة.
 */
export function putCache(entity: CacheEntity, rows: Record<string, unknown>[]): number {
  const cfg = CACHE_TABLES[entity];
  if (!cfg) throw new Error(`unknown cache entity: ${entity}`);
  if (!Array.isArray(rows)) throw new Error("rows must be an array");

  const bools = new Set(cfg.bools ?? []);
  const placeholders = cfg.columns.map(() => "?").join(", ");
  const insertSql = `INSERT OR REPLACE INTO ${cfg.table} (${cfg.columns.join(", ")}) VALUES (${placeholders})`;

  return tx((d) => {
    d.prepare(`DELETE FROM ${cfg.table}`).run();
    const stmt = d.prepare(insertSql);
    for (const row of rows) {
      const values = cfg.columns.map((c) => coerce(row[c], bools.has(c)));
      stmt.run(...values);
    }
    return rows.length;
  });
}

/** يقرأ كل صفوف كاش كيان (للاستخدام دون إنترنت). */
export function readCache(entity: CacheEntity): Record<string, unknown>[] {
  const cfg = CACHE_TABLES[entity];
  if (!cfg) throw new Error(`unknown cache entity: ${entity}`);
  return getDb().prepare(`SELECT * FROM ${cfg.table}`).all() as Record<string, unknown>[];
}
