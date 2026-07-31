import type { LocalPayment, NewPayment } from "../../../shared/ipc.js";
import { getDb, localId, nowIso, tx, type DB } from "./base.js";
import { enqueue } from "./sync-queue.repo.js";

/**
 * Repository المدفوعات المحلّي: يسجّل دفعة على طلب، يحدّث paid_amount/payment_status
 * للطلب في نفس المعاملة، ويُدرِج عملية مزامنة create.
 */

const COLS =
  "id, order_id, amount, method, status, reference, created_at, _local, _dirty, _synced_at";

export function getPayment(id: string, d: DB = getDb()): LocalPayment | null {
  return (d.prepare(`SELECT ${COLS} FROM payments WHERE id = ?`).get(id) as
    | LocalPayment
    | undefined) ?? null;
}

export function listPayments(orderId: string): LocalPayment[] {
  return getDb()
    .prepare(`SELECT ${COLS} FROM payments WHERE order_id = ? ORDER BY created_at ASC`)
    .all(orderId) as LocalPayment[];
}

/** يحدّد حالة الدفع من الإجمالي مقابل المدفوع. */
function paymentStatus(total: number, paid: number): "UNPAID" | "PARTIAL" | "PAID" {
  if (paid <= 0) return "UNPAID";
  if (paid + 1e-9 >= total) return "PAID";
  return "PARTIAL";
}

/** يسجّل دفعة محلّية على طلب موجود ويحدّث حالة الطلب ذرّياً. */
export function createPayment(input: NewPayment): LocalPayment {
  if (!input?.order_id) throw new Error("order_id is required");
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("amount must be > 0");

  return tx((d) => {
    const order = d
      .prepare("SELECT id, total, paid_amount FROM orders WHERE id = ?")
      .get(input.order_id) as { id: string; total: number; paid_amount: number } | undefined;
    if (!order) throw new Error(`order not found: ${input.order_id}`);

    const id = localId("pay");
    const now = nowIso();
    d.prepare(
      `INSERT INTO payments (id, order_id, amount, method, status, reference, created_at, _local, _dirty)
       VALUES (?, ?, ?, ?, 'COMPLETED', ?, ?, 1, 1)`,
    ).run(id, input.order_id, amount, input.method ?? "CASH", input.reference ?? null, now);

    const newPaid = order.paid_amount + amount;
    const status = paymentStatus(order.total, newPaid);
    d.prepare(
      "UPDATE orders SET paid_amount = ?, payment_status = ?, updated_at = ?, _dirty = 1 WHERE id = ?",
    ).run(newPaid, status, now, order.id);

    enqueue(d, "payment", "create", id, {
      id,
      order_id: input.order_id,
      amount,
      method: input.method ?? "CASH",
      reference: input.reference ?? null,
    });

    return getPayment(id, d)!;
  });
}
