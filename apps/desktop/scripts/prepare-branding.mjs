/**
 * يشتقّ كل الهوية التجارية من branding.config.json (Phase 15.5).
 *
 * قبل هذه المرحلة كانت الهوية مُصلَّبة في ثلاثة أماكن (electron-builder.yml،
 * package.json، crash-reporter.ts) فلا ينعكس تغيير الملفّ على المُثبِّت ولا على
 * بيانات الملفّ التنفيذي. الآن هذا السكربت هو الجسر الوحيد:
 *
 *   branding.config.json
 *        ├─► apps/desktop/package.json   (productName/description/author/version)
 *        ├─► build/branding.config.json  (يقرأه التطبيق وقت التشغيل)
 *        └─► build/build-info.json       (commit + تاريخ البناء لنافذة About)
 *
 * وelectron-builder.config.cjs يقرأ من branding مباشرةً.
 * أي تغيير في ملفّ الهوية وحده ينعكس على كل ما سبق بلا لمس أي ملفّ آخر.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DESKTOP = path.resolve(HERE, "..");
const ROOT = path.resolve(DESKTOP, "..", "..");
const SRC = path.join(ROOT, "branding.config.json");
const BUILD_DIR = path.join(DESKTOP, "build");

if (!fs.existsSync(SRC)) {
  console.error(`✗ ملفّ الهوية غير موجود: ${SRC}`);
  process.exit(1);
}

const branding = JSON.parse(fs.readFileSync(SRC, "utf8"));
delete branding._README;
fs.mkdirSync(BUILD_DIR, { recursive: true });

// ---------- 1) نسخة وقت التشغيل ----------
fs.writeFileSync(path.join(BUILD_DIR, "branding.config.json"), JSON.stringify(branding, null, 2), "utf8");

// ---------- 2) معلومات البناء (لنافذة About) ----------
const git = (args, fallback) => {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", timeout: 10_000 }).trim();
  } catch {
    return fallback;
  }
};
const buildInfo = {
  version: branding.product.version,
  commit: git(["rev-parse", "--short=12", "HEAD"], "unknown"),
  branch: git(["rev-parse", "--abbrev-ref", "HEAD"], "unknown"),
  dirty: git(["status", "--porcelain"], "") !== "",
  buildDate: new Date().toISOString(),
  runtimeSchemaVersion: 1,
};
fs.writeFileSync(path.join(BUILD_DIR, "build-info.json"), JSON.stringify(buildInfo, null, 2), "utf8");

// ---------- 3) مزامنة package.json ----------
// electron-builder يقرأ productName/description/author من هنا حين تغيب من إعداده،
// وهي ما يكتبه rcedit في موارد الـexe (ProductName/FileDescription/CompanyName).
const pkgPath = path.join(DESKTOP, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const before = JSON.stringify(pkg);

pkg.version = branding.product.version;
pkg.productName = branding.product.name;
pkg.description = branding.product.tagline ?? branding.product.name;
// اسم الشركة هو ما يظهر كـ Publisher؛ نعود لاسم المنتج ما دامت القيمة مؤقتة
const isPlaceholder = (v) => typeof v === "string" && v.startsWith("<<") && v.endsWith(">>");
pkg.author = isPlaceholder(branding.company.name) ? branding.product.name : branding.company.name;

if (JSON.stringify(pkg) !== before) {
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

const placeholders = (JSON.stringify(branding).match(/<<[^>]*>>/g) ?? []).length;
console.log(
  `✓ الهوية مُشتقّة من branding.config.json — v${branding.product.version} · ` +
    `commit ${buildInfo.commit}${buildInfo.dirty ? "+dirty" : ""}` +
    (placeholders ? ` — ⚠ ${placeholders} قيمة مؤقتة` : ""),
);
