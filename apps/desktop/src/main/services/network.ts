import { EventEmitter } from "node:events";
import { net } from "electron";
import { API_HEALTH_URL } from "../config.js";
import { scoped } from "../logger.js";
import type { NetStatus } from "../../shared/ipc.js";

const log = scoped("network");

/**
 * كشف الاتصال + إعادة الاتصال: يفحص وصول الـ API المحلي دورياً ويبثّ التحوّلات
 * (online/offline) فقط. يجمع إشارة النظام (net.isOnline) مع فحص وصول فعلي للخادم.
 */
export class NetworkMonitor extends EventEmitter {
  private status: NetStatus = "online";
  private timer: NodeJS.Timeout | null = null;

  getStatus(): NetStatus {
    return this.status;
  }

  private async reachable(): Promise<boolean> {
    if (!net.isOnline()) return false;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2000);
      const res = await fetch(API_HEALTH_URL, { signal: ctrl.signal });
      clearTimeout(t);
      return res.ok;
    } catch {
      return false;
    }
  }

  start(intervalMs = 5000): void {
    const tick = async (): Promise<void> => {
      const next: NetStatus = (await this.reachable()) ? "online" : "offline";
      if (next !== this.status) {
        this.status = next;
        log.info("net status →", next);
        this.emit("status", next);
      }
    };
    void tick();
    this.timer = setInterval(() => void tick(), intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
