import { getDb } from "../database.js";

/**
 * سجلّ الأحداث المحلّية (offline_events) — Phase 11.6D.
 * يُستخدم لتسجيل عمليات المسح والأحداث الأخرى محلّياً للتدقيق/إعادة العرض.
 */

export interface OfflineEvent {
  id: number;
  type: string;
  data: string | null;
  at: string;
}

/** يسجّل حدثاً محلّياً (النوع + حمولة JSON اختيارية). */
export function recordEvent(type: string, data?: unknown): void {
  getDb()
    .prepare("INSERT INTO offline_events (type, data) VALUES (?, ?)")
    .run(type, data == null ? null : JSON.stringify(data));
}

/** يسرد الأحداث (اختياريّاً بنوع محدّد) الأحدث أولاً. */
export function listEvents(type?: string, limit = 100): OfflineEvent[] {
  if (type) {
    return getDb()
      .prepare("SELECT id, type, data, at FROM offline_events WHERE type = ? ORDER BY id DESC LIMIT ?")
      .all(type, limit) as OfflineEvent[];
  }
  return getDb()
    .prepare("SELECT id, type, data, at FROM offline_events ORDER BY id DESC LIMIT ?")
    .all(limit) as OfflineEvent[];
}
