import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import { EventEmitter } from "node:events";
import { API_HEALTH_URL, IS_DEV, bundledApiCwd, bundledApiEntry } from "../config.js";
import { scoped } from "../logger.js";
import type { BackendStatus } from "../../shared/ipc.js";

const log = scoped("backend");

/**
 * مدير الـ API المحلي: يبدأ الخادم مع التطبيق، يراقبه، يعيد تشغيله عند الانهيار،
 * ويوقفه عند الخروج. إن كان الخادم يعمل بالفعل (health=200) فلا يبدأ نسخة ثانية.
 *
 * الإنتاج: يشغّل خادم الـ API المُجمّع عبر Node المدمج في Electron
 * (ELECTRON_RUN_AS_NODE) فلا حاجة لتثبيت Node على جهاز المستخدم.
 * التطوير: يعيد استخدام خادم `pnpm --filter @laundry/api dev` القائم.
 */
export class BackendManager extends EventEmitter {
  private child: ChildProcess | null = null;
  private status: BackendStatus = "stopped";
  private restarts = 0;
  private stopping = false;
  private readonly maxRestarts = 5;

  getStatus(): BackendStatus {
    return this.status;
  }

  private setStatus(s: BackendStatus): void {
    this.status = s;
    this.emit("status", s);
    log.info("status:", s);
  }

  async isHealthy(timeoutMs = 1500): Promise<boolean> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(API_HEALTH_URL, { signal: ctrl.signal });
      clearTimeout(t);
      return res.ok;
    } catch {
      return false;
    }
  }

  private async waitForHealth(totalMs = 30_000, stepMs = 500): Promise<boolean> {
    const deadline = Date.now() + totalMs;
    while (Date.now() < deadline) {
      if (await this.isHealthy()) return true;
      await new Promise((r) => setTimeout(r, stepMs));
    }
    return false;
  }

  /** يبدأ (أو يعيد استخدام) الخادم. يُرجع true إن أصبح جاهزاً. */
  async start(): Promise<boolean> {
    if (await this.isHealthy()) {
      this.setStatus("reusing-external");
      return true;
    }

    const entry = bundledApiEntry();
    if (!fs.existsSync(entry)) {
      // تطوير بلا خادم مُجمّع: ننتظر خادم dev الخارجي (يشغّله المطوّر)
      log.warn("bundled API not found; waiting for external dev server:", entry);
      this.setStatus("starting");
      const ok = await this.waitForHealth(IS_DEV ? 60_000 : 15_000);
      this.setStatus(ok ? "ready" : "crashed");
      return ok;
    }

    this.spawnChild(entry);
    this.setStatus("starting");
    const ok = await this.waitForHealth();
    this.setStatus(ok ? "ready" : "crashed");
    if (!ok) log.error("API did not become healthy within timeout");
    return ok;
  }

  private spawnChild(entry: string): void {
    log.info("spawning bundled API:", entry);
    this.child = spawn(process.execPath, [entry], {
      cwd: bundledApiCwd(),
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    this.child.stdout?.on("data", (d: Buffer) => log.info("[api]", d.toString().trim()));
    this.child.stderr?.on("data", (d: Buffer) => log.error("[api]", d.toString().trim()));
    this.child.on("exit", (code, signal) => this.onChildExit(code, signal));
  }

  private onChildExit(code: number | null, signal: NodeJS.Signals | null): void {
    this.child = null;
    if (this.stopping) return;
    log.error(`API exited unexpectedly (code=${code} signal=${signal})`);
    if (this.restarts >= this.maxRestarts) {
      this.setStatus("crashed");
      log.error("API restart limit reached; giving up");
      return;
    }
    this.restarts++;
    this.setStatus("restarting");
    const backoff = Math.min(1000 * this.restarts, 5000);
    setTimeout(() => void this.start(), backoff);
  }

  /** إيقاف نظيف عند خروج التطبيق (لا يُترك خادم يتيم) */
  async stop(): Promise<void> {
    this.stopping = true;
    const child = this.child;
    if (!child || child.exitCode !== null) {
      this.setStatus("stopped");
      return;
    }
    await new Promise<void>((resolve) => {
      const done = (): void => resolve();
      child.once("exit", done);
      child.kill("SIGTERM");
      setTimeout(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
        resolve();
      }, 4000);
    });
    this.setStatus("stopped");
  }
}
