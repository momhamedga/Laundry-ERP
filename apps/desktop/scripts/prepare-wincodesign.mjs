#!/usr/bin/env node
/**
 * يُجهّز أداة winCodeSign في كاش electron-builder قبل التغليف على Windows.
 *
 * لماذا: أرشيف winCodeSign-2.6.0.7z يحوي روابط رمزية لـ macOS
 * (darwin/10.12/lib/libcrypto.dylib و libssl.dylib). استخراجها على Windows يتطلّب
 * صلاحية إنشاء روابط رمزية (وضع المطوّر أو Admin)؛ بدونها يُنهي 7za بالرمز 2،
 * فيَعتبره electron-builder فشلاً ويُعيد المحاولة ثم يفشل البناء بالكامل — حتى مع
 * عدم وجود شهادة توقيع أصلاً، لأن مسار signAndEditExecutable (تضمين الأيقونة
 * وبيانات الإصدار عبر rcedit) يمرّ على نفس الأداة.
 *
 * الحل: نستخرج الأرشيف يدويّاً مستثنين مجلد darwin (لا لزوم له على Windows)،
 * فينجح الاستخراج ويجد electron-builder الكاش جاهزاً ويتخطّى التنزيل/الاستخراج.
 *
 * آمن للتشغيل المتكرّر (idempotent) ويتخطّى نفسه على غير Windows.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const VERSION = "2.6.0";
const NAME = `winCodeSign-${VERSION}`;
const URL = `https://github.com/electron-userland/electron-builder-binaries/releases/download/${NAME}/${NAME}.7z`;

if (process.platform !== "win32") {
  console.log("• prepare-wincodesign: تخطّي (ليس Windows)");
  process.exit(0);
}

const cacheRoot = path.join(
  process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE ?? "", "AppData", "Local"),
  "electron-builder",
  "Cache",
  "winCodeSign",
);
const target = path.join(cacheRoot, NAME);
const marker = path.join(target, "rcedit-x64.exe"); // ما يحتاجه فعلاً على Windows

if (fs.existsSync(marker)) {
  console.log(`• prepare-wincodesign: الكاش جاهز مسبقاً (${target})`);
  process.exit(0);
}

/**
 * يعثر على ثنائي 7za المرفق مع 7zip-bin (تبعية غير مباشرة لـ electron-builder).
 * يجرّب الحلّ العادي أوّلاً، ثم يبحث في مخزن pnpm (.pnpm) حيث تُستضاف التبعيات
 * غير المباشرة ولا يمكن حلّها بالاسم من هنا.
 */
function find7za() {
  const rel = path.join("win", "x64", "7za.exe");
  const require_ = createRequire(import.meta.url);
  try {
    const pkg = require_.resolve("7zip-bin/package.json");
    const bin = path.join(path.dirname(pkg), rel);
    if (fs.existsSync(bin)) return bin;
  } catch {
    /* نتابع للبحث في مخزن pnpm */
  }

  // ابحث في node_modules/.pnpm لكل من مجلد التطبيق وجذر مساحة العمل
  const roots = [
    path.resolve(process.cwd(), "node_modules", ".pnpm"),
    path.resolve(process.cwd(), "..", "..", "node_modules", ".pnpm"),
  ];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const match = fs
      .readdirSync(root)
      .filter((d) => d.startsWith("7zip-bin@"))
      .sort()
      .reverse()[0];
    if (!match) continue;
    const bin = path.join(root, match, "node_modules", "7zip-bin", rel);
    if (fs.existsSync(bin)) return bin;
  }
  return null;
}

const sevenZip = find7za();
if (!sevenZip) {
  console.error("✗ prepare-wincodesign: تعذّر إيجاد 7za.exe (حزمة 7zip-bin). شغّل pnpm install أولاً.");
  process.exit(1);
}

fs.mkdirSync(cacheRoot, { recursive: true });

// أعد استخدام أي أرشيف منزَّل سابقاً في الكاش، وإلا نزّله.
let archive = fs
  .readdirSync(cacheRoot)
  .filter((f) => f.endsWith(".7z"))
  .map((f) => path.join(cacheRoot, f))
  .find((f) => fs.statSync(f).size > 1_000_000);

if (!archive) {
  archive = path.join(cacheRoot, `${NAME}.7z`);
  console.log(`• prepare-wincodesign: تنزيل ${URL}`);
  const res = await fetch(URL);
  if (!res.ok) {
    console.error(`✗ فشل التنزيل: HTTP ${res.status}`);
    process.exit(1);
  }
  fs.writeFileSync(archive, Buffer.from(await res.arrayBuffer()));
}

console.log(`• prepare-wincodesign: استخراج (بلا darwin/) → ${target}`);
fs.rmSync(target, { recursive: true, force: true });
const out = spawnSync(sevenZip, ["x", "-bd", "-y", "-x!darwin*", archive, `-o${target}`], {
  stdio: ["ignore", "pipe", "pipe"],
  encoding: "utf8",
});

if (out.status !== 0 || !fs.existsSync(marker)) {
  console.error(`✗ prepare-wincodesign: فشل الاستخراج (rc=${out.status})`);
  console.error(out.stderr || out.stdout);
  process.exit(1);
}

console.log("✓ prepare-wincodesign: winCodeSign جاهز (rcedit + signtool متاحان).");
