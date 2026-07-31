import { EventEmitter } from "node:events";
import { API_ORIGIN } from "../config.js";
import { scoped } from "../logger.js";
import type { SyncResult, SyncState } from "../../shared/ipc.js";
import { getDb } from "../db/database.js";
import { markSynced } from "../db/repositories/base.js";
import {
  logSync,
  mapId,
  markDone,
  markFailed,
  markRetry,
  markSyncing,
  pendingCount,
  resolveServerId,
  takePending,
  type SyncQueueFull,
} from "../db/repositories/sync-queue.repo.js";

const log = scoped("sync");

/**
 * محرّك المزامنة (Phase 11.6C): يستنزف sync_queue بالترتيب (FIFO) وينفّذ كل عملية
 * ضدّ الـ API الحقيقي القائم (بلا أي تغيير في الـ API/العقود). يعالج التبعيات عبر
 * خريطة المعرّفات (عميل أُنشئ أوفلاين → معرّف سيرفر → يُستخدم في الطلب والدفعة)،
 * ويعيد المحاولة بتراجع أُسّي للأخطاء العابرة (شبكة/5xx)، ويثبّت الأخطاء الدائمة (4xx).
 *
 * المصادقة تأتي من الـ renderer (setAuth) — لا يخزّن المحرّك أي بيانات اعتماد.
 */

const MAX_ATTEMPTS = 6;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const BACKOFF_BASE_SEC = 5;
const BACKOFF_CAP_SEC = 300;

/** تراجع أُسّي: 5, 10, 20, … بحدّ أقصى 300 ثانية (حسب عدد المحاولات الحالي). */
function backoffSeconds(attempts: number): number {
  return Math.min(BACKOFF_CAP_SEC, BACKOFF_BASE_SEC * 2 ** attempts);
}

class SyncHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "SyncHttpError";
  }
}

/** خطأ قابل لإعادة المحاولة؟ شبكة/5xx/429 نعم؛ 4xx (تحقّق/صلاحية/تعارض) لا. */
function isRetryable(err: unknown): boolean {
  if (err instanceof SyncHttpError) return RETRYABLE_STATUS.has(err.status);
  return true; // خطأ شبكة / تبعية لم تُزامَن بعد → أعد المحاولة لاحقاً
}

class SyncEngine extends EventEmitter {
  private baseUrl = API_ORIGIN;
  private token: string | null = null;
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private lastRunAt: string | null = null;
  private lastResult: SyncResult | null = null;

  /** يُستخدم في التحقّق للإشارة لخادم اختبار محلّي؛ الإنتاج = API_ORIGIN. */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  setAuth(token: string | null): void {
    this.token = token && token.length > 0 ? token : null;
    this.emit("status", this.getState());
  }

  getState(): SyncState {
    let pending = 0;
    try {
      pending = pendingCount();
    } catch {
      /* القاعدة قد لا تكون جاهزة بعد */
    }
    return {
      running: this.running,
      authed: this.token !== null,
      pending,
      lastRunAt: this.lastRunAt,
      lastResult: this.lastResult,
    };
  }

  /** يبدأ مزامنة دورية كل intervalSec ثانية (يوقف أي مؤقّت سابق). */
  startAuto(intervalSec: number): void {
    this.stopAuto();
    const ms = Math.max(15, intervalSec) * 1000;
    this.timer = setInterval(() => void this.syncNow("interval"), ms);
    if (this.timer.unref) this.timer.unref();
    log.info(`auto-sync every ${Math.round(ms / 1000)}s`);
  }

  stopAuto(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** يستنزف الطابور مرّة واحدة. لا يعمل إن كان جارياً أو بلا مصادقة. */
  async syncNow(trigger = "manual"): Promise<SyncResult> {
    if (this.running) return { processed: 0, done: 0, failed: 0, retried: 0, skipped: true, reason: "busy" };
    if (!this.token) return { processed: 0, done: 0, failed: 0, retried: 0, skipped: true, reason: "no-auth" };

    this.running = true;
    this.emit("status", this.getState());
    let done = 0;
    let failed = 0;
    let retried = 0;
    let batch: SyncQueueFull[] = [];
    try {
      batch = takePending(200);
      for (const op of batch) {
        markSyncing(op.id);
        try {
          await this.process(op);
          markDone(op.id);
          logSync(op.id, op.entity, op.op, "ok");
          done++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          // تعارض (409): جرّب حلّه تلقائياً (مثل ربط عميل مكرّر بالموجود على السيرفر)
          if (err instanceof SyncHttpError && err.status === 409) {
            let resolution: string | null = null;
            try {
              resolution = await this.resolveConflict(op);
            } catch (rerr) {
              logSync(op.id, op.entity, op.op, "conflict", `resolve failed: ${String(rerr)}`);
            }
            if (resolution) {
              markDone(op.id);
              logSync(op.id, op.entity, op.op, "conflict", `resolved: ${resolution}`);
              done++;
            } else {
              markFailed(op.id, msg); // لا يوجد حلّ آلي → تدخّل يدوي (dead-letter)
              logSync(op.id, op.entity, op.op, "conflict", msg);
              failed++;
            }
            continue;
          }
          if (isRetryable(err) && op.attempts + 1 < MAX_ATTEMPTS) {
            markRetry(op.id, msg, backoffSeconds(op.attempts));
            logSync(op.id, op.entity, op.op, "error", `retry: ${msg}`);
            retried++;
          } else {
            markFailed(op.id, msg);
            logSync(op.id, op.entity, op.op, "error", msg);
            failed++;
          }
        }
      }
      this.lastResult = { processed: batch.length, done, failed, retried };
      log.info(`sync (${trigger}): processed=${batch.length} done=${done} retried=${retried} failed=${failed}`);
    } catch (err) {
      log.error("sync run failed:", err);
      this.lastResult = { processed: batch.length, done, failed, retried, reason: String(err) };
    } finally {
      this.running = false;
      this.lastRunAt = new Date().toISOString();
      this.emit("status", this.getState());
    }
    return this.lastResult;
  }

  /** ينفّذ عملية واحدة ضدّ الـ API الحقيقي حسب نوعها. */
  private async process(op: SyncQueueFull): Promise<void> {
    const p = JSON.parse(op.payload) as Record<string, unknown>;
    const key = `${op.entity}:${op.op}`;
    switch (key) {
      case "customer:create": {
        const data = await this.request("POST", "/api/v1/customers", {
          name: p.name,
          phone: p.phone,
          email: p.email ?? undefined,
          address: p.address ?? undefined,
        });
        const serverId = (data as { customer: { id: string } }).customer.id;
        mapId("customer", String(p.id), serverId);
        markSynced("customers", String(p.id));
        return;
      }
      case "customer:update": {
        const serverId = resolveServerId("customer", String(p.id));
        await this.request("PATCH", `/api/v1/customers/${serverId}`, {
          name: p.name,
          phone: p.phone,
          email: p.email ?? undefined,
          address: p.address ?? undefined,
        });
        markSynced("customers", String(p.id));
        return;
      }
      case "order:create": {
        const customerId = resolveServerId("customer", String(p.customer_id));
        const row = getDb()
          .prepare("SELECT received_at, due_date FROM orders WHERE id = ?")
          .get(String(p.id)) as { received_at: string | null; due_date: string | null } | undefined;
        const receivedAt = row?.received_at ?? new Date().toISOString();
        const dueDate =
          row?.due_date ?? new Date(Date.parse(receivedAt) + 24 * 3600 * 1000).toISOString();
        const rawItems = Array.isArray(p.items) ? (p.items as Record<string, unknown>[]) : [];
        const items = rawItems.map((it) => {
          if (!it.service_id) throw new SyncHttpError(400, "order item missing serviceId");
          return {
            serviceId: resolveServerId("service", String(it.service_id)),
            quantity: Number(it.quantity),
            discount: Number(it.discount) || 0,
            notes: (it.notes as string | null) ?? undefined,
          };
        });
        const body: Record<string, unknown> = {
          customerId,
          receivedAt,
          dueDate,
          discount: Number(p.discount) || 0,
          notes: (p.notes as string | null) ?? undefined,
          items,
        };
        if (p.branch_id) body.branchId = p.branch_id;
        const data = await this.request("POST", "/api/v1/orders", body);
        const serverId = (data as { order: { id: string } }).order.id;
        mapId("order", String(p.id), serverId);
        markSynced("orders", String(p.id));
        return;
      }
      case "payment:create": {
        const orderId = resolveServerId("order", String(p.order_id));
        const data = await this.request("POST", "/api/v1/payments", {
          orderId,
          amount: Number(p.amount),
          method: (p.method as string) ?? "CASH",
        });
        const serverId = (data as { payment: { id: string } }).payment.id;
        mapId("payment", String(p.id), serverId);
        markSynced("payments", String(p.id));
        return;
      }
      default:
        throw new SyncHttpError(400, `unknown sync op: ${key}`);
    }
  }

  /**
   * حلّ التعارضات آلياً (Phase 11.6E). حاليّاً: عميل أُنشئ أوفلاين برقم هاتف موجود
   * على السيرفر → نجلب العميل الموجود ونربط المعرّف المحلّي به (بدل تكرار). يُعيد
   * وصف الحلّ عند النجاح أو null إن لم يوجد حلّ آلي (يذهب للتدخّل اليدوي).
   */
  private async resolveConflict(op: SyncQueueFull): Promise<string | null> {
    const p = JSON.parse(op.payload) as Record<string, unknown>;
    if (op.entity === "customer" && op.op === "create") {
      const phone = String(p.phone ?? "");
      if (!phone) return null;
      const data = await this.request(
        "GET",
        `/api/v1/customers/phone/${encodeURIComponent(phone)}`,
      );
      const serverId = (data as { customer?: { id?: string } }).customer?.id;
      if (!serverId) return null;
      mapId("customer", String(p.id), serverId);
      markSynced("customers", String(p.id));
      return `linked to existing customer ${serverId}`;
    }
    return null;
  }

  /** طلب HTTP موحّد يفكّ غلاف { success, data } ويحوّل الأخطاء لأنواع مناسبة. */
  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const headers: Record<string, string> = { Authorization: `Bearer ${this.token}` };
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    let res: Response;
    try {
      res = await fetch(this.baseUrl + path, init);
    } catch (err) {
      // فشل شبكة/اتصال → قابل لإعادة المحاولة (ليس SyncHttpError)
      throw new Error(`network error: ${err instanceof Error ? err.message : String(err)}`);
    }
    const text = await res.text();
    let json: unknown = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      /* استجابة غير JSON */
    }
    if (!res.ok) {
      const j = json as { error?: { message?: string }; message?: string };
      const message = j?.error?.message ?? j?.message ?? `HTTP ${res.status}`;
      throw new SyncHttpError(res.status, message);
    }
    return (json as { data?: unknown }).data ?? {};
  }
}

export const syncEngine = new SyncEngine();
