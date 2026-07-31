import type { SyncQueueItem } from "../../../shared/ipc.js";
import { getDb, type DB } from "./base.js";

/**
 * طابور المزامنة (sync_queue): يلتقط كل كتابة محلّية كعملية مؤجّلة.
 * محرّك المزامنة (Phase 11.6C) يستنزفه لاحقاً؛ هنا فقط الالتقاط والاستعلام.
 */

export type SyncOp = "create" | "update" | "delete";
export type SyncEntity = "customer" | "order" | "payment";

/**
 * يُدرِج عملية في الطابور ضمن نفس معاملة الكتابة (ذرّية: الصفّ + عنصر الطابور معاً).
 * يجب استدعاؤها بمقبض المعاملة `d` كي لا تنفصل عن كتابة الصفّ.
 */
export function enqueue(
  d: DB,
  entity: SyncEntity,
  op: SyncOp,
  entityId: string,
  payload: unknown,
): void {
  d.prepare(
    `INSERT INTO sync_queue (entity, op, entity_id, payload, status)
     VALUES (?, ?, ?, ?, 'pending')`,
  ).run(entity, op, entityId, JSON.stringify(payload));
}

const SELECT_COLS =
  "id, entity, op, entity_id, status, attempts, last_error, created_at, updated_at";

/** عناصر الطابور المعلّقة (الأقدم أولاً) لعرضها/معالجتها. */
export function listPending(limit = 100): SyncQueueItem[] {
  return getDb()
    .prepare(
      `SELECT ${SELECT_COLS} FROM sync_queue WHERE status = 'pending' ORDER BY id ASC LIMIT ?`,
    )
    .all(limit) as SyncQueueItem[];
}

/** كل العناصر (لأي حالة) لعرض شاشة المزامنة. */
export function listAll(limit = 200): SyncQueueItem[] {
  return getDb()
    .prepare(`SELECT ${SELECT_COLS} FROM sync_queue ORDER BY id DESC LIMIT ?`)
    .all(limit) as SyncQueueItem[];
}

/** عدد العمليات المعلّقة. */
export function pendingCount(): number {
  return (
    getDb().prepare("SELECT count(*) c FROM sync_queue WHERE status = 'pending'").get() as {
      c: number;
    }
  ).c;
}
