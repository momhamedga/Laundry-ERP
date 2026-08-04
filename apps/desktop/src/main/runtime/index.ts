import { app } from "electron";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { scoped } from "../logger.js";

const log = scoped("runtime");

/**
 * إعداد التشغيل (Phase 15C).
 *
 * ═══════════════════ لماذا هذه الطبقة موجودة ═══════════════════
 * الـ API يقرأ إعداده عبر `dotenv/config` من مجلّد عمله. في التطوير مجلّد العمل
 * هو `apps/api` وفيه `.env`؛ بعد التثبيت هو `resources/api` وليس فيه شيء —
 * فيرفض Zod ثلاثة متغيّرات ويخرج بـ exit(1)، ويعيد المدير المحاولة ستّ مرّات
 * ثم يستسلم، فيبقى التطبيق ميتاً بلا تفسير.
 *
 * الحلّ: إعداد تشغيل حقيقي خارج مجلّد التثبيت، يُنشأ تلقائياً عند أول تشغيل،
 * ويُمرَّر للـ API كبيئة عملية — بلا أي ملفّ داخل مجلّد البرنامج.
 *
 * ═══════════════════ لماذا خارج userData ═══════════════════
 * userData = %APPDATA%/@laundry/desktop، وهو ما تنسخه خدمة النسخ الاحتياطي.
 * لو وضعنا `server.env` هناك لسافر رابط قاعدة البيانات وأسرار JWT داخل كل ملفّ
 * نسخة احتياطية يُرسل بالبريد أو يُنسخ على فلاشة. لذلك:
 *
 *   %APPDATA%/@laundry/runtime/    ← الأسرار (خارج النسخ الاحتياطي)
 *   %APPDATA%/@laundry/desktop/    ← بيانات التطبيق والقاعدة (داخل النسخ)
 *
 * وهذا الموضع أيضاً:
 *   • ينجو من إلغاء التثبيت (NSIS للمستخدم الحالي لا يمسّ %APPDATA%) ⇒ إعادة
 *     التثبيت لا تحتاج إعادة تجهيز.
 *   • ينجو من التحديث التلقائي ⇒ الأسرار ثابتة عبر الإصدارات.
 *   • مسار واحد معروف يسهّل على الدعم الفني توجيه العميل إليه.
 *
 * ملاحظة: %APPDATA% هو Roaming. على أجهزة مرتبطة بدومين قد يُزامَن الملفّ ضمن
 * ملفّ تعريف المستخدم. مقبول هنا لأن قاعدة البيانات المشفّرة نفسها في Roaming
 * أصلاً، ولأن الملفّ محصور بصلاحيات المستخدم (انظر hardenPermissions).
 */

// ==================== المسارات ====================

/** جذر إعداد التشغيل — خارج userData عمداً. */
export function runtimeDir(): string {
  return path.join(app.getPath("appData"), "@laundry", "runtime");
}

export const RUNTIME_FILES = {
  runtime: "runtime.json",
  serverEnv: "server.env",
  branding: "branding.json",
  installation: "installation.json",
} as const;

const p = (f: string): string => path.join(runtimeDir(), f);

// ==================== الأنواع ====================

export interface RuntimeConfig {
  schemaVersion: 1;
  installId: string;
  createdAt: string;
  updatedAt: string;
  apiPort: number;
  rendererPort: number;
  /** آخر إصدار تطبيق شُغِّل بهذا الإعداد — للتشخيص بعد التحديث */
  lastAppVersion?: string;
}

export interface InstallationInfo {
  customerName?: string;
  laundryName?: string;
  phone?: string;
  companyName?: string;
  branchName?: string;
  licenseId?: string;
  maxUsers?: number;
  provisionedAt?: string;
  installedAt?: string;
}

/** نتيجة التهيئة — يقرؤها الإقلاع ليقرّر هل يشغّل الـ API أصلاً. */
export interface BootstrapResult {
  dir: string;
  created: boolean;
  secretsGenerated: boolean;
  /** جاهز فعلاً للتشغيل (أي أن DATABASE_URL موجود) */
  ready: boolean;
  missing: string[];
  env: Record<string, string>;
  config: RuntimeConfig;
  installation: InstallationInfo;
  elapsedMs: number;
}

// ==================== أدوات ====================

/** سرّ عشوائي قويّ — 64 حرفاً آمنة للعناوين، أطول من حدّ 32 الذي يفرضه الـ API. */
function generateSecret(): string {
  return crypto.randomBytes(48).toString("base64url");
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function writeJsonAtomic(file: string, data: unknown): void {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

/** يحلّل ملفّ env بصيغة KEY=VALUE (يدعم علامات الاقتباس والتعليقات). */
export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function serializeEnv(vars: Record<string, string>): string {
  const header = [
    "# إعداد تشغيل Laundry ERP — أُنشئ تلقائياً",
    "# ⚠ يحتوي أسراراً. لا تشاركه ولا ترفعه على أي مستودع.",
    "# لا تُعدّله يدوياً إلا بتوجيه من الدعم الفني.",
    "",
  ].join("\n");
  const body = Object.entries(vars)
    .map(([k, v]) => `${k}=${/[\s"']/.test(v) ? JSON.stringify(v) : v}`)
    .join("\n");
  return `${header}${body}\n`;
}

/**
 * يقصر صلاحيات مجلّد الأسرار على المستخدم الحالي (Windows ACL).
 * فشلها لا يُوقف الإقلاع — التطبيق يعمل، ونسجّل تحذيراً فقط.
 */
function hardenPermissions(dir: string): boolean {
  if (process.platform !== "win32") {
    try {
      fs.chmodSync(dir, 0o700);
      return true;
    } catch {
      return false;
    }
  }
  try {
    const user = process.env.USERNAME ?? "";
    if (!user) return false;
    // يوقف الوراثة وينسخ الصلاحيات، ثم يمنح المستخدم وحده تحكّماً كاملاً
    execFileSync("icacls", [dir, "/inheritance:r"], { stdio: "ignore", timeout: 10_000 });
    execFileSync("icacls", [dir, "/grant:r", `${user}:(OI)(CI)F`], { stdio: "ignore", timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

// ==================== القراءة ====================

export function readRuntimeConfig(): RuntimeConfig | null {
  return readJson<RuntimeConfig>(p(RUNTIME_FILES.runtime));
}

export function readInstallation(): InstallationInfo {
  return readJson<InstallationInfo>(p(RUNTIME_FILES.installation)) ?? {};
}

/** إعداد العلامة التجارية الخاص بالعميل إن جُهِّز، وإلا null (يُستخدم المُغلَّف). */
export function readRuntimeBranding(): Record<string, unknown> | null {
  return readJson<Record<string, unknown>>(p(RUNTIME_FILES.branding));
}

/** متغيّرات بيئة الـ API كما هي على القرص (بلا توليد). */
export function readServerEnv(): Record<string, string> {
  const file = p(RUNTIME_FILES.serverEnv);
  if (!fs.existsSync(file)) return {};
  try {
    return parseEnv(fs.readFileSync(file, "utf8"));
  } catch (err) {
    log.error("تعذّرت قراءة server.env:", err);
    return {};
  }
}

/** المتغيّرات التي لا يقلع الـ API بدونها (مطابقة لمخطّط Zod في الـ API). */
const REQUIRED = ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const;

/** ما الذي ينقص لتشغيل الـ API؟ */
export function missingRequired(envVars: Record<string, string> = readServerEnv()): string[] {
  return REQUIRED.filter((k) => {
    const v = envVars[k] ?? process.env[k];
    return !v || v.trim().length === 0;
  });
}

// ==================== التهيئة ====================

/**
 * تهيئة أول تشغيل — idempotent تماماً.
 *
 * تُنشئ ما ينقص فقط: لا تُعيد توليد سرّ موجود، ولا تلمس قيمة مضبوطة. هذا ما
 * يجعل التحديث وإعادة التثبيت آمنين — لو أعدنا توليد أسرار JWT لأُبطلت كل
 * جلسات المستخدمين عند كل تحديث.
 */
export function bootstrapRuntime(): BootstrapResult {
  const started = Date.now();
  const dir = runtimeDir();
  const created = !fs.existsSync(dir);

  if (created) {
    fs.mkdirSync(dir, { recursive: true });
    const hardened = hardenPermissions(dir);
    log.info(`أُنشئ مجلّد التشغيل: ${dir}${hardened ? " (صلاحيات مقصورة على المستخدم)" : " (تعذّر ضبط الصلاحيات)"}`);
  }

  // ---------- تجهيز تلقائي ----------
  // سكربت «تثبيت وتجهيز.cmd» يضع provision.json هنا قبل التثبيت. نستهلكه عند
  // أول تشغيل فيجهّز الجهاز نفسه بلا أي تدخّل من العميل، ثم نؤرشفه كي لا يبقى
  // رابط قاعدة البيانات في ملفّ إضافي مكشوف.
  const provisionFile = p("provision.json");
  if (fs.existsSync(provisionFile)) {
    const res = importProvisioning(provisionFile);
    if (res.ok) {
      const applied = p("provision.applied.json");
      try {
        fs.rmSync(applied, { force: true });
        fs.renameSync(provisionFile, applied);
        fs.chmodSync(applied, 0o600);
      } catch {
        /* الأرشفة تحسين لا شرط */
      }
      log.info("طُبِّق ملفّ التجهيز تلقائياً عند أول تشغيل");
    } else {
      log.error(`تعذّر تطبيق ملفّ التجهيز: ${res.error}`);
    }
  }

  // ---------- server.env ----------
  const envFile = p(RUNTIME_FILES.serverEnv);
  const existing = fs.existsSync(envFile) ? parseEnv(fs.readFileSync(envFile, "utf8")) : {};
  const vars: Record<string, string> = { ...existing };
  let secretsGenerated = false;

  // الأسرار تُولَّد محلّياً ولا تُشحن أبداً — سرّ مختلف لكل تثبيت
  for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const) {
    if (!vars[key] || vars[key].length < 32) {
      vars[key] = generateSecret();
      secretsGenerated = true;
    }
  }
  vars.NODE_ENV ??= "production";
  vars.PORT ??= "4000";
  // DATABASE_URL يأتي من التجهيز (Client Package Builder) — لا يمكن توليده

  if (secretsGenerated || !fs.existsSync(envFile)) {
    const tmp = `${envFile}.tmp`;
    fs.writeFileSync(tmp, serializeEnv(vars), { encoding: "utf8", mode: 0o600 });
    fs.renameSync(tmp, envFile);
    log.info(secretsGenerated ? "وُلِّدت أسرار JWT جديدة (لهذا الجهاز وحده)" : "أُنشئ server.env");
  }

  // ---------- runtime.json ----------
  const prev = readRuntimeConfig();
  const config: RuntimeConfig = {
    schemaVersion: 1,
    installId: prev?.installId ?? crypto.randomUUID(),
    createdAt: prev?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    apiPort: prev?.apiPort ?? Number(vars.PORT ?? 4000),
    rendererPort: prev?.rendererPort ?? 3100,
    lastAppVersion: app.getVersion(),
  };
  writeJsonAtomic(p(RUNTIME_FILES.runtime), config);

  // ---------- installation.json ----------
  const installation = readInstallation();
  if (!installation.installedAt) {
    installation.installedAt = new Date().toISOString();
    writeJsonAtomic(p(RUNTIME_FILES.installation), installation);
  }

  const missing = missingRequired(vars);
  const result: BootstrapResult = {
    dir,
    created,
    secretsGenerated,
    ready: missing.length === 0,
    missing,
    env: vars,
    config,
    installation,
    elapsedMs: Date.now() - started,
  };

  log.info(
    `تهيئة التشغيل في ${result.elapsedMs} ms — ${result.ready ? "جاهز" : `ناقص: ${missing.join(", ")}`}`,
  );
  return result;
}

/**
 * يستورد ملفّ تجهيز من المطوّر (provision.json) ويدمجه في إعداد التشغيل.
 * يُستخدم كمسار إنقاذ لو وصل الجهاز بلا تجهيز مسبق.
 */
export function importProvisioning(file: string): { ok: true; missing: string[] } | { ok: false; error: string } {
  let data: {
    databaseUrl?: string;
    env?: Record<string, string>;
    branding?: Record<string, unknown>;
    installation?: InstallationInfo;
  };
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8")) as typeof data;
  } catch {
    return { ok: false, error: "ملفّ التجهيز تالف أو ليس بصيغة JSON" };
  }

  const dbUrl = data.databaseUrl ?? data.env?.DATABASE_URL;
  if (!dbUrl && !data.branding && !data.installation) {
    return { ok: false, error: "ملفّ التجهيز لا يحتوي أي إعداد معروف" };
  }

  fs.mkdirSync(runtimeDir(), { recursive: true });

  if (dbUrl || data.env) {
    const envFile = p(RUNTIME_FILES.serverEnv);
    const current = fs.existsSync(envFile) ? parseEnv(fs.readFileSync(envFile, "utf8")) : {};
    // التجهيز يضبط الاتصال؛ الأسرار المولَّدة محلّياً تبقى كما هي
    const merged: Record<string, string> = { ...current, ...(data.env ?? {}) };
    if (dbUrl) merged.DATABASE_URL = dbUrl;
    for (const k of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const) {
      if (current[k] && current[k].length >= 32) merged[k] = current[k];
      else merged[k] ??= generateSecret();
    }
    const tmp = `${envFile}.tmp`;
    fs.writeFileSync(tmp, serializeEnv(merged), { encoding: "utf8", mode: 0o600 });
    fs.renameSync(tmp, envFile);
  }

  if (data.branding) writeJsonAtomic(p(RUNTIME_FILES.branding), data.branding);
  if (data.installation) {
    writeJsonAtomic(p(RUNTIME_FILES.installation), {
      ...readInstallation(),
      ...data.installation,
      installedAt: readInstallation().installedAt ?? new Date().toISOString(),
    });
  }

  log.info(`استُورد تجهيز من ${path.basename(file)}`);
  return { ok: true, missing: missingRequired() };
}
