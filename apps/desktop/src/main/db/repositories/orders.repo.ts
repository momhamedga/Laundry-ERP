import type {
  ListQuery,
  LocalOrder,
  LocalOrderItem,
  LocalOrderWithItems,
  NewOrder,
} from "../../../shared/ipc.js";
import { getDb, localId, nowIso, tx, type DB } from "./base.js";
import { enqueue } from "./sync-queue.repo.js";

/**
 * Repository الطلبات المحلّي: إنشاء طلب + بنوده في معاملة ذرّية واحدة.
 * الإجماليات تُحسب محلّياً من البنود (لا اعتماد على السيرفر). يلتقط عملية مزامنة create.
 */

const ORDER_COLS =
  "id, order_number, customer_id, branch_id, status, payment_status, subtotal, discount, total, paid_amount, received_at, due_date, notes, created_at, updated_at, _local, _dirty, _synced_at";
const ITEM_COLS =
  "id, order_id, service_id, quantity, unit_price, discount, subtotal, notes";

function itemsOf(orderId: string, d: DB = getDb()): LocalOrderItem[] {
  return d
    .prepare(`SELECT ${ITEM_COLS} FROM order_items WHERE order_id = ? ORDER BY rowid ASC`)
    .all(orderId) as LocalOrderItem[];
}

export function getOrder(id: string, d: DB = getDb()): LocalOrderWithItems | null {
  const order = d.prepare(`SELECT ${ORDER_COLS} FROM orders WHERE id = ?`).get(id) as
    | LocalOrder
    | undefined;
  if (!order) return null;
  return { ...order, items: itemsOf(id, d) };
}

export function listOrders(q: ListQuery = {}): LocalOrder[] {
  const limit = q.limit ?? 100;
  const offset = q.offset ?? 0;
  if (q.search) {
    const like = `%${q.search}%`;
    return getDb()
      .prepare(
        `SELECT ${ORDER_COLS} FROM orders
         WHERE order_number LIKE ? OR status LIKE ?
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .all(like, like, limit, offset) as LocalOrder[];
  }
  return getDb()
    .prepare(`SELECT ${ORDER_COLS} FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(limit, offset) as LocalOrder[];
}

/** يحسب إجمالي بند = (كمية × سعر) − خصم، بحدّ أدنى صفر. */
function lineSubtotal(qty: number, unit: number, discount: number): number {
  return Math.max(0, qty * unit - discount);
}

/** ينشئ طلباً محلّياً + بنوده، يحسب الإجماليات، ويُدرِج عملية مزامنة create. */
export function createOrder(input: NewOrder): LocalOrderWithItems {
  const items = Array.isArray(input?.items) ? input.items : [];
  if (items.length === 0) throw new Error("order must have at least one item");

  return tx((d) => {
    const id = localId("ord");
    const now = nowIso();
    const orderDiscount = input.discount ?? 0;

    let subtotal = 0;
    const rows = items.map((it) => {
      const qty = Number(it.quantity) || 0;
      const unit = Number(it.unit_price) || 0;
      const disc = Number(it.discount) || 0;
      if (qty <= 0) throw new Error("item quantity must be > 0");
      const sub = lineSubtotal(qty, unit, disc);
      subtotal += sub;
      return {
        id: localId("item"),
        service_id: it.service_id ?? null,
        quantity: qty,
        unit_price: unit,
        discount: disc,
        subtotal: sub,
        notes: it.notes ?? null,
      };
    });
    const total = Math.max(0, subtotal - orderDiscount);

    d.prepare(
      `INSERT INTO orders
         (id, order_number, customer_id, branch_id, status, payment_status,
          subtotal, discount, total, paid_amount, received_at, due_date, notes,
          created_at, updated_at, _local, _dirty)
       VALUES (?, ?, ?, ?, 'RECEIVED', 'UNPAID', ?, ?, ?, 0, ?, ?, ?, ?, ?, 1, 1)`,
    ).run(
      id,
      input.order_number ?? null,
      input.customer_id ?? null,
      input.branch_id ?? null,
      subtotal,
      orderDiscount,
      total,
      now,
      input.due_date ?? null,
      input.notes ?? null,
      now,
      now,
    );

    const insItem = d.prepare(
      `INSERT INTO order_items (id, order_id, service_id, quantity, unit_price, discount, subtotal, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const r of rows) {
      insItem.run(r.id, id, r.service_id, r.quantity, r.unit_price, r.discount, r.subtotal, r.notes);
    }

    enqueue(d, "order", "create", id, {
      id,
      order_number: input.order_number ?? null,
      customer_id: input.customer_id ?? null,
      branch_id: input.branch_id ?? null,
      subtotal,
      discount: orderDiscount,
      total,
      due_date: input.due_date ?? null,
      notes: input.notes ?? null,
      items: rows.map((r) => ({
        service_id: r.service_id,
        quantity: r.quantity,
        unit_price: r.unit_price,
        discount: r.discount,
        subtotal: r.subtotal,
        notes: r.notes,
      })),
    });

    return getOrder(id, d)!;
  });
}
