import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

/**
 * قارئ الهوية وقت التشغيل (Phase 15.5).
 *
 * مصدر واحد يقرأ منه كل من يحتاج اسم المنتج أو الشركة أو بيانات الدعم، بدل
 * تكرار نصوص مُصلَّبة في about.ts و crash-reporter.ts وغيرهما.
 *
 * ترتيب البحث: مورد التطبيق المُثبَّت ← صعوداً من مجلّد التطبيق (للتطوير).
 * إعداد التشغيل الخاصّ بالعميل (%APPDATA%/@laundry/runtime/branding.json) له
 * الأولوية إن وُجد، فيمكن تخصيص عميل بلا إعادة بناء.
 */

export interface Branding {
  product: { name: string; nameAr?: string; tagline?: string; version?: string; edition?: string };
  company: { name?: string; nameEn?: string; website?: string; address?: string };
  support: { email?: string; phone?: string; whatsapp?: string; hours?: string; responseTime?: string };
  legal: { copyright?: string; warranty?: string; licenseTerms?: string };
}

export interface BuildInfo {
  version: string;
  commit: string;
  branch: string;
  dirty: boolean;
  buildDate: string;
  runtimeSchemaVersion: number;
}

const FALLBACK: Branding = {
  product: { name: "Laundry ERP" },
  company: {},
  support: {},
  legal: {},
};

let cachedBranding: Branding | null = null;
let cachedBuild: BuildInfo | null = null;

/** يبني قائمة مرشّحات لملفّ داخل build/ — مُثبَّت أولاً ثم صعوداً في التطوير. */
function candidates(file: string): string[] {
  const out: string[] = [];
  if (process.resourcesPath) out.push(path.join(process.resourcesPath, "build", file));
  let dir = app.getAppPath();
  for (let i = 0; i < 5; i++) {
    out.push(path.join(dir, "build", file));
    out.push(path.join(dir, file));
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return out;
}

function readFirst<T>(file: string): T | null {
  for (const p of candidates(file)) {
    try {
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8")) as T;
    } catch {
      /* ملفّ تالف — نتابع */
    }
  }
  return null;
}

/** الهوية المُطبَّقة (تخصيص العميل يعلو على المُغلَّف). */
export function branding(): Branding {
  if (cachedBranding) return cachedBranding;
  const packaged = readFirst<Branding>("branding.config.json") ?? FALLBACK;

  // تخصيص العميل من إعداد التشغيل — استيراد كسول لتفادي دورة استيراد
  let custom: Partial<Branding> | null = null;
  try {
    const runtimeFile = path.join(app.getPath("appData"), "@laundry", "runtime", "branding.json");
    if (fs.existsSync(runtimeFile)) custom = JSON.parse(fs.readFileSync(runtimeFile, "utf8")) as Partial<Branding>;
  } catch {
    /* تخصيص اختياري */
  }

  cachedBranding = {
    product: { ...packaged.product, ...(custom?.product ?? {}) },
    company: { ...packaged.company, ...(custom?.company ?? {}) },
    support: { ...packaged.support, ...(custom?.support ?? {}) },
    legal: { ...packaged.legal, ...(custom?.legal ?? {}) },
  };
  return cachedBranding;
}

/** معلومات البناء (commit/تاريخ) — يكتبها prepare-branding.mjs. */
export function buildInfo(): BuildInfo {
  cachedBuild ??= readFirst<BuildInfo>("build-info.json") ?? {
    version: app.getVersion(),
    commit: "unknown",
    branch: "unknown",
    dirty: false,
    buildDate: "unknown",
    runtimeSchemaVersion: 1,
  };
  return cachedBuild;
}

/** يحذف القيم المؤقتة ‎<<...>> كي لا تُعرض لعميل. */
export function real(v: string | undefined): string | null {
  if (!v) return null;
  return v.startsWith("<<") && v.endsWith(">>") ? null : v;
}

/** اسم المنتج (لا يكون فارغاً أبداً). */
export function productName(): string {
  return real(branding().product?.name) ?? "Laundry ERP";
}

/** اسم الشركة، وإلا اسم المنتج. */
export function companyName(): string {
  return real(branding().company?.name) ?? productName();
}
