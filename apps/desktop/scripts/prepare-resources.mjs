import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * يجهّز resources/ قبل التغليف: ينسخ الـ API المبني وواجهة Next standalone ليُشغَّلا
 * كعمليتَي Node مدمجتين داخل Electron.
 *
 * ملاحظات إنتاجية مهمّة (لا يخفيها هذا السكربت):
 * 1) الوحدات الأصلية للـ API (bcrypt/@prisma engines) مبنية لـ Node النظام. عند
 *    تشغيلها عبر ELECTRON_RUN_AS_NODE قد تحتاج إعادة بناء لـ ABI الخاص بـ Electron
 *    (electron-rebuild) أو تشغيل الـ API بـ Node منفصل مثبَّت على الجهاز.
 * 2) أسرار .env (Neon URL / JWT) لا تُنسخ هنا: توزيعها داخل مُثبِّت قرار نشر أمني
 *    يجب أن يتّخذه فريق النشر (مثلاً حقن config وقت التثبيت).
 */
const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..");
const resources = path.join(root, "resources");

const apiDist = path.join(root, "apps", "api", "dist");
const apiNodeModules = path.join(root, "apps", "api", "node_modules");
const apiPkg = path.join(root, "apps", "api", "package.json");
const apiPrisma = path.join(root, "apps", "api", "prisma");
const standalone = path.join(root, "apps", "admin", ".next", "standalone");
const nextStatic = path.join(root, "apps", "admin", ".next", "static");
const adminPublic = path.join(root, "apps", "admin", "public");

function require_(p, hint) {
  if (!existsSync(p)) {
    console.error(`✗ مفقود: ${p}\n  ${hint}`);
    process.exit(1);
  }
}

require_(apiDist, "شغّل: pnpm --filter @laundry/api build");
require_(standalone, "شغّل: pnpm --filter @laundry/admin build (يتطلّب output: standalone)");

rmSync(resources, { recursive: true, force: true });
mkdirSync(path.join(resources, "api"), { recursive: true });
mkdirSync(path.join(resources, "renderer"), { recursive: true });

// ---- API ----
cpSync(apiDist, path.join(resources, "api", "dist"), { recursive: true });
cpSync(apiPkg, path.join(resources, "api", "package.json"));
if (existsSync(apiPrisma)) cpSync(apiPrisma, path.join(resources, "api", "prisma"), { recursive: true });
if (existsSync(apiNodeModules)) {
  console.log("• نسخ node_modules للـ API (قد يكون كبيراً)…");
  cpSync(apiNodeModules, path.join(resources, "api", "node_modules"), { recursive: true });
}

// ---- Renderer (Next standalone) ----
// نحافظ على روابط pnpm الرمزية حرفياً (verbatimSymlinks): بنية .pnpm تعتمد على
// الروابط النسبية لحلّ الحزم المتناظرة (مثل @swc/helpers بجوار next). أي "فكّ رموز"
// (dereference) ينقل next خارج سياق .pnpm فيكسر require('@swc/helpers').
//
// ملاحظة نشر مهمّة: إنشاء الروابط الرمزية على Windows يتطلّب صلاحية (وضع المطوّر
// أو مسؤول). إن كانت غير متاحة: فعّل Developer Mode، أو ثبّت الواجهة بـ
// node-linker=hoisted لإنتاج node_modules بلا روابط. الخادم standalone يعمل بذاته
// (تحقّقنا منه محليّاً)؛ القيد هنا في نسخ الروابط عبر أنظمة بلا صلاحية.
cpSync(standalone, path.join(resources, "renderer"), { recursive: true, verbatimSymlinks: true });
// standalone لا يتضمّن .next/static ولا public — يجب نسخهما بجواره
if (existsSync(nextStatic))
  cpSync(nextStatic, path.join(resources, "renderer", "apps", "admin", ".next", "static"), { recursive: true });
if (existsSync(adminPublic))
  cpSync(adminPublic, path.join(resources, "renderer", "apps", "admin", "public"), { recursive: true });

console.log("✓ resources/ جاهزة (api + renderer). راجع ملاحظات الوحدات الأصلية والأسرار أعلاه.");
