import type {
  CustomerPatch,
  ListQuery,
  LocalCustomer,
  NewCustomer,
} from "../../../shared/ipc.js";
import { bit, getDb, localId, nowIso, tx, type DB } from "./base.js";
import { enqueue } from "./sync-queue.repo.js";

/**
 * Repository العملاء المحلّي: إنشاء/تعديل/قراءة دون إنترنت.
 * كل كتابة تعلّم الصفّ بـ _dirty=1 وتُدرِج عملية مزامنة، كلّه في معاملة واحدة.
 */

const COLS =
  "id, name, phone, email, address, is_active, created_at, updated_at, _local, _dirty, _synced_at";

/** يقرأ عميلاً واحداً (بمقبض قاعدة اختياري للاستخدام داخل معاملة). */
export function getCustomer(id: string, d: DB = getDb()): LocalCustomer | null {
  return (d.prepare(`SELECT ${COLS} FROM customers WHERE id = ?`).get(id) as
    | LocalCustomer
    | undefined) ?? null;
}

/** قائمة العملاء مع بحث اختياري بالاسم/الهاتف. */
export function listCustomers(q: ListQuery = {}): LocalCustomer[] {
  const limit = q.limit ?? 100;
  const offset = q.offset ?? 0;
  if (q.search) {
    const like = `%${q.search}%`;
    return getDb()
      .prepare(
        `SELECT ${COLS} FROM customers
         WHERE name LIKE ? OR phone LIKE ?
         ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      )
      .all(like, like, limit, offset) as LocalCustomer[];
  }
  return getDb()
    .prepare(`SELECT ${COLS} FROM customers ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
    .all(limit, offset) as LocalCustomer[];
}

/** ينشئ عميلاً محلّياً (offline) ويُدرِج عملية مزامنة create. */
export function createCustomer(input: NewCustomer): LocalCustomer {
  if (!input?.name || typeof input.name !== "string") throw new Error("name is required");
  return tx((d) => {
    const id = localId("cust");
    const now = nowIso();
    d.prepare(
      `INSERT INTO customers (id, name, phone, email, address, is_active, created_at, updated_at, _local, _dirty)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, 1, 1)`,
    ).run(id, input.name, input.phone ?? null, input.email ?? null, input.address ?? null, now, now);
    enqueue(d, "customer", "create", id, {
      id,
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
    });
    return getCustomer(id, d)!;
  });
}

/** يعدّل عميلاً محلّياً ويُدرِج عملية مزامنة update. */
export function updateCustomer(id: string, patch: CustomerPatch): LocalCustomer {
  return tx((d) => {
    const existing = getCustomer(id, d);
    if (!existing) throw new Error(`customer not found: ${id}`);
    const merged: LocalCustomer = {
      ...existing,
      name: patch.name ?? existing.name,
      phone: patch.phone ?? existing.phone,
      email: patch.email ?? existing.email,
      address: patch.address ?? existing.address,
      is_active: patch.is_active === undefined ? existing.is_active : bit(patch.is_active),
    };
    const now = nowIso();
    d.prepare(
      `UPDATE customers
       SET name = ?, phone = ?, email = ?, address = ?, is_active = ?, updated_at = ?, _dirty = 1
       WHERE id = ?`,
    ).run(merged.name, merged.phone, merged.email, merged.address, merged.is_active, now, id);
    enqueue(d, "customer", "update", id, {
      id,
      name: merged.name,
      phone: merged.phone,
      email: merged.email,
      address: merged.address,
      is_active: merged.is_active === 1,
    });
    return getCustomer(id, d)!;
  });
}
