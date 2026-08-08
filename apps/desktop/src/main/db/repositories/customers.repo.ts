import type {
  CustomerPatch,
  ListQuery,
  LocalCustomer,
  NewCustomer,
  ServerCustomer,
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

/**
 * يبذر عملاء الخادم في الجدول المحلّي ليكونوا متاحين دون اتصال.
 *
 * ═══════════ لماذا لا يمرّ هذا عبر طبقة الكاش ═══════════
 * العملاء ليسوا كياناً للقراءة فقط: تُنشأ سجلّاتهم دون اتصال وتُزامَن لاحقاً،
 * فمكانهم هذا الجدول بأعلامه لا جدول كاش منفصل. وبدون هذا البذر يفتح
 * الموظّف معالج الطلب دون اتصال فلا يجد عميلاً واحداً من عملائه، فيُنشئ
 * نسخة مكرّرة من عميل قائم — وهو ضرر أسوأ من تعذّر إنشاء الطلب.
 *
 * لا يلمس الصفوف المتّسخة إطلاقاً: صفّ ينتظر المزامنة يحمل تعديلاً لم يصل
 * الخادم بعد، فالكتابة فوقه بنسخة الخادم تمحو عمل المستخدم. ولا يُدرِج أي
 * عملية في طابور المزامنة — هذه بيانات قادمة من الخادم لا ذاهبة إليه.
 */
export function seedServerCustomers(rows: ServerCustomer[]): number {
  if (!Array.isArray(rows) || rows.length === 0) return 0;

  return tx((d) => {
    const stmt = d.prepare(
      `INSERT INTO customers (id, name, phone, email, address, is_active, created_at, updated_at, _local, _dirty, _synced_at)
       VALUES (@id, @name, @phone, @email, @address, @is_active, @created_at, @updated_at, 0, 0, @synced_at)
       ON CONFLICT(id) DO UPDATE SET
         name       = excluded.name,
         phone      = excluded.phone,
         email      = excluded.email,
         address    = excluded.address,
         is_active  = excluded.is_active,
         updated_at = excluded.updated_at,
         _synced_at = excluded._synced_at
       WHERE customers._dirty = 0`,
    );

    const now = nowIso();
    let n = 0;
    for (const r of rows) {
      if (!r?.id || typeof r.name !== "string") continue;
      stmt.run({
        id: r.id,
        name: r.name,
        phone: r.phone ?? null,
        email: r.email ?? null,
        address: r.address ?? null,
        is_active: bit(r.isActive !== false),
        created_at: r.createdAt ?? now,
        updated_at: r.updatedAt ?? now,
        synced_at: now,
      });
      n++;
    }
    return n;
  });
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
