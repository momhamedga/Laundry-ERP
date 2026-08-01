import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import {
  DEV_RENDERER_URL,
  IS_DEV,
  PROD_RENDERER_HOST,
  PROD_RENDERER_PORT,
  PROD_RENDERER_URL,
  bundledRendererCwd,
  bundledRendererEntry,
} from "../config.js";
import { scoped } from "../logger.js";

const log = scoped("renderer-server");

/**
 * يقدّم واجهة الـ Admin (نفس Next.js دون إعادة كتابة):
 * - التطوير: يستخدم خادم Next dev القائم على DEV_RENDERER_URL.
 * - الإنتاج: يشغّل خرج Next standalone المُجمّع كعملية Node مدمجة، ويحمّل عنوانه.
 */
export class RendererServer {
  private child: ChildProcess | null = null;
  private stopping = false;

  /** يبدأ الخادم (إن لزم) ويُرجع الـ URL الذي تحمّله النافذة */
  async start(): Promise<string> {
    if (IS_DEV) {
      log.info("dev mode → using external Next dev server:", DEV_RENDERER_URL);
      return DEV_RENDERER_URL;
    }

    const entry = bundledRendererEntry();
    if (!fs.existsSync(entry)) {
      throw new Error(`Bundled renderer (Next standalone) not found: ${entry}`);
    }

    log.info("spawning bundled Next standalone:", entry);
    this.child = spawn(process.execPath, [entry], {
      cwd: bundledRendererCwd(),
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        NODE_ENV: "production",
        PORT: String(PROD_RENDERER_PORT),
        // يجب أن يطابق مضيف PROD_RENDERER_URL (localhost) وإلا فشل الاتصال عند
        // اختلاف تحويل localhost إلى ::1 بدل 127.0.0.1 — راجع التعليق في config.ts
        HOSTNAME: PROD_RENDERER_HOST,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    this.child.stdout?.on("data", (d: Buffer) => log.info("[next]", d.toString().trim()));
    this.child.stderr?.on("data", (d: Buffer) => log.error("[next]", d.toString().trim()));
    this.child.on("exit", (code) => {
      if (!this.stopping) log.error("Next standalone exited unexpectedly, code=", code);
    });

    await this.waitForReady(PROD_RENDERER_URL);
    return PROD_RENDERER_URL;
  }

  private async waitForReady(url: string, totalMs = 30_000): Promise<void> {
    const deadline = Date.now() + totalMs;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(url, { method: "HEAD" });
        if (res.ok || res.status === 200) return;
      } catch {
        /* لسه بيبدأ */
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error("Next standalone did not become ready in time");
  }

  async stop(): Promise<void> {
    this.stopping = true;
    const child = this.child;
    if (!child || child.exitCode !== null) return;
    await new Promise<void>((resolve) => {
      child.once("exit", () => resolve());
      child.kill("SIGTERM");
      setTimeout(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
        resolve();
      }, 4000);
    });
  }
}
