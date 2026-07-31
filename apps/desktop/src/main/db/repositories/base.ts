import { randomUUID } from "node:crypto";
import type BetterSqlite3 from "better-sqlite3";
import { getDb, tx } from "../database.js";

/** نوع مقبض قاعدة SQLite (نسخة القاعدة، لا الـ namespace). */
export type DB = BetterSqlite3.Database;

/**
 * أدوات مشتركة لطبقة الـ Repository المحلّية (Phase 11.6B).
 * كل كتابة محلّية تُنفَّذ داخل معاملة ذرّية وتُسجَّل في sync_queue للمزامنة لاحقاً.
 */

export { getDb, tx };

/** معرّف محلّي مميّز (يُستبدل بمعرّف السيرفر بعد المزامنة). */
export function localId(prefix: string): string {
  return `local_${prefix}_${randomUUID()}`;
}

/** توقيت ISO موحّد للكتابات المحلّية. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** يحوّل قيمة منطقية إلى 0/1 لتخزين SQLite. */
export function bit(v: boolean | undefined, fallback = false): 0 | 1 {
  return (v ?? fallback) ? 1 : 0;
}

/** يعلّم صفّاً محلّياً بأنه تمّت مزامنته (يزيل _dirty ويضبط _synced_at) — Phase 11.6C. */
export function markSynced(table: "customers" | "orders" | "payments", id: string): void {
  getDb()
    .prepare(`UPDATE ${table} SET _dirty = 0, _synced_at = datetime('now') WHERE id = ?`)
    .run(id);
}
