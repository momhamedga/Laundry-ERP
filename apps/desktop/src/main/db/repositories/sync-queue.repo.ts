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

// ==================== Phase 11.6C — استنزاف الطابور ومعالجته ====================

/** صفّ كامل من الطابور بما فيه الحمولة (payload) للمعالجة في محرّك المزامنة. */
export interface SyncQueueFull extends SyncQueueItem {
  payload: string;
}

/**
 * يلتقط العمليات المستحقّة للمعالجة (بالترتيب) مع الحمولة: pending وحان وقت
 * محاولتها (next_attempt_at فارغ أو مضى) — احترام التراجع الأُسّي (Phase 11.6E).
 */
export function takePending(limit = 200): SyncQueueFull[] {
  return getDb()
    .prepare(
      `SELECT ${SELECT_COLS}, payload FROM sync_queue
       WHERE status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= datetime('now'))
       ORDER BY id ASC LIMIT ?`,
    )
    .all(limit) as SyncQueueFull[];
}

export function markSyncing(id: number): void {
  getDb()
    .prepare("UPDATE sync_queue SET status='syncing', updated_at=datetime('now') WHERE id=?")
    .run(id);
}

export function markDone(id: number): void {
  getDb()
    .prepare("UPDATE sync_queue SET status='done', last_error=NULL, updated_at=datetime('now') WHERE id=?")
    .run(id);
}

/**
 * فشل قابل لإعادة المحاولة: يبقى pending مع زيادة العدّاد، تسجيل الخطأ، وجدولة
 * المحاولة القادمة بعد backoffSec ثانية (تراجع أُسّي).
 */
export function markRetry(id: number, error: string, backoffSec: number): void {
  getDb()
    .prepare(
      `UPDATE sync_queue
       SET status='pending', attempts=attempts+1, last_error=?,
           next_attempt_at=datetime('now', ?), updated_at=datetime('now')
       WHERE id=?`,
    )
    .run(error.slice(0, 500), `+${Math.max(0, Math.round(backoffSec))} seconds`, id);
}

/** فشل نهائي (غير قابل لإعادة المحاولة أو تجاوز الحدّ الأقصى). */
export function markFailed(id: number, error: string): void {
  getDb()
    .prepare(
      "UPDATE sync_queue SET status='failed', attempts=attempts+1, last_error=?, updated_at=datetime('now') WHERE id=?",
    )
    .run(error.slice(0, 500), id);
}

/** يسجّل نتيجة عملية في sync_log (ok|error|conflict). */
export function logSync(
  queueId: number,
  entity: string,
  op: string,
  result: "ok" | "error" | "conflict",
  message?: string,
): void {
  getDb()
    .prepare(
      "INSERT INTO sync_log (queue_id, entity, op, result, message) VALUES (?, ?, ?, ?, ?)",
    )
    .run(queueId, entity, op, result, message ? message.slice(0, 500) : null);
}

// ==================== خريطة المعرّفات (local → server) ====================

/** يسجّل ربط معرّف محلّي بمعرّف السيرفر بعد نجاح المزامنة. */
export function mapId(entity: string, localId: string, serverId: string): void {
  getDb()
    .prepare("INSERT OR REPLACE INTO id_map (entity, local_id, server_id) VALUES (?, ?, ?)")
    .run(entity, localId, serverId);
}

/**
 * يحلّ معرّفاً للاستخدام مع السيرفر: إن لم يكن محلّياً (لا يبدأ بـ local_) يُعاد كما هو
 * (فهو معرّف سيرفر أصلاً، مثل معرّفات الكاش)؛ وإلا يُبحث في id_map.
 * يرمي إن كان محلّياً وغير مربوط بعد (تبعية لم تُزامَن).
 */
export function resolveServerId(entity: string, id: string): string {
  if (!id.startsWith("local_")) return id;
  const row = getDb()
    .prepare("SELECT server_id FROM id_map WHERE entity=? AND local_id=?")
    .get(entity, id) as { server_id: string } | undefined;
  if (!row) throw new Error(`dependency not synced yet: ${entity} ${id}`);
  return row.server_id;
}

// ==================== Phase 11.6E — Dead-letter / إدارة الطابور ====================

/** العمليات الفاشلة (dead-letter) للعرض والتدخّل اليدوي. */
export function listFailed(limit = 200): SyncQueueItem[] {
  return getDb()
    .prepare(
      `SELECT ${SELECT_COLS} FROM sync_queue WHERE status = 'failed' ORDER BY id ASC LIMIT ?`,
    )
    .all(limit) as SyncQueueItem[];
}

/** يعيد عملية فاشلة للطابور (يصفّر العدّاد والجدولة) — إعادة محاولة يدوية. */
export function retryOp(id: number): boolean {
  const r = getDb()
    .prepare(
      `UPDATE sync_queue
       SET status='pending', attempts=0, last_error=NULL, next_attempt_at=NULL, updated_at=datetime('now')
       WHERE id=? AND status='failed'`,
    )
    .run(id);
  return r.changes > 0;
}

/** يعيد كل الفاشلة للطابور؛ يعيد عددها. */
export function retryAllFailed(): number {
  const r = getDb()
    .prepare(
      `UPDATE sync_queue
       SET status='pending', attempts=0, last_error=NULL, next_attempt_at=NULL, updated_at=datetime('now')
       WHERE status='failed'`,
    )
    .run();
  return r.changes;
}

/** يلغي عملية فاشلة نهائياً (تجاهل يدوي) — يُحوّلها cancelled ولا تُعالَج ثانية. */
export function discardOp(id: number): boolean {
  const r = getDb()
    .prepare(
      "UPDATE sync_queue SET status='cancelled', updated_at=datetime('now') WHERE id=? AND status='failed'",
    )
    .run(id);
  return r.changes > 0;
}

/** عدّادات الطابور حسب الحالة (للوحة المزامنة). */
export function queueStats(): Record<string, number> {
  const rows = getDb()
    .prepare("SELECT status, count(*) c FROM sync_queue GROUP BY status")
    .all() as { status: string; c: number }[];
  const out: Record<string, number> = { pending: 0, syncing: 0, done: 0, failed: 0, cancelled: 0 };
  for (const r of rows) out[r.status] = r.c;
  return out;
}
