import { app, crashReporter, shell, type RenderProcessGoneDetails } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scoped } from "../logger.js";
import { companyName, productName } from "../branding.js";
import type { CrashReport } from "../../shared/ipc.js";

const log = scoped("crash");

function crashDir(): string {
  const dir = path.join(app.getPath("userData"), "crashes");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ==================== أثر إجراءات المستخدم (breadcrumbs) — v1.3.0 ====================
// حلقة بآخر الإجراءات (تنقّل/عمليات) تُرفَق بتقرير العطل لإعادة بناء ما فعله المستخدم.
interface Breadcrumb {
  at: string;
  action: string;
}
const BREADCRUMB_MAX = 40;
const breadcrumbs: Breadcrumb[] = [];

/** يسجّل إجراء مستخدم/نظام في أثر التتبّع (يُقصّ إلى آخر 40). */
export function addBreadcrumb(action: string): void {
  breadcrumbs.push({ at: new Date().toISOString(), action: String(action).slice(0, 200) });
  if (breadcrumbs.length > BREADCRUMB_MAX) breadcrumbs.shift();
}

/** مسار مقالب الأعطال الأصلية (minidumps) التي يكتبها Crashpad. */
function minidumpDir(): string {
  try {
    return app.getPath("crashDumps");
  } catch {
    return "";
  }
}

/** يفعّل مُبلِّغ الأعطال محليّاً فقط (لا رفع لأي خدمة خارجية). */
export function initCrashReporter(): void {
  crashReporter.start({
    // Phase 15.5: من branding.config.json لا نصّ مُصلَّب
    productName: productName(),
    companyName: companyName(),
    submitURL: "", // لا رفع
    uploadToServer: false,
    compress: true,
  });
  log.info("crash reporter started (local only, no upload)");
}

function systemInfo(): Record<string, unknown> {
  return {
    appVersion: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    totalMemMB: Math.round(os.totalmem() / 1048576),
    freeMemMB: Math.round(os.freemem() / 1048576),
    cpus: os.cpus().length,
  };
}

/** يكتب تقرير عطل renderer محليّاً (Stack/Reason/System Info/Time). */
export function writeRendererCrash(details: RenderProcessGoneDetails): void {
  const time = new Date().toISOString();
  const report = {
    time,
    kind: "renderer",
    reason: details.reason,
    exitCode: details.exitCode,
    system: systemInfo(),
    breadcrumbs: [...breadcrumbs],
    minidumpDir: minidumpDir(),
  };
  const file = path.join(crashDir(), `renderer-${time.replace(/[:.]/g, "-")}.json`);
  try {
    fs.writeFileSync(file, JSON.stringify(report, null, 2), "utf8");
    log.error("renderer crash recorded:", file, details.reason);
  } catch (err) {
    log.error("failed to write crash report:", err);
  }
}

/** يكتب تقرير استثناء غير مُلتقَط في الـ main. */
export function writeMainCrash(err: unknown): void {
  const time = new Date().toISOString();
  const report = {
    time,
    kind: "main",
    reason: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    system: systemInfo(),
    breadcrumbs: [...breadcrumbs],
    minidumpDir: minidumpDir(),
  };
  const file = path.join(crashDir(), `main-${time.replace(/[:.]/g, "-")}.json`);
  try {
    fs.writeFileSync(file, JSON.stringify(report, null, 2), "utf8");
  } catch {
    /* تجاهل */
  }
}

export function listCrashReports(): CrashReport[] {
  const dir = crashDir();
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const p = path.join(dir, f);
      let reason = "";
      try {
        reason = (JSON.parse(fs.readFileSync(p, "utf8")).reason as string) ?? "";
      } catch {
        /* تجاهل */
      }
      return { file: p, time: fs.statSync(p).mtime.toISOString(), reason };
    })
    .sort((a, b) => b.time.localeCompare(a.time));
}

export function openCrashDir(): void {
  void shell.openPath(crashDir());
}
