import { cpSync, existsSync, mkdirSync, readdirSync, realpathSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * يجهّز resources/ قبل التغليف: ينسخ الـ API المبني وواجهة Next standalone ليُشغَّلا
 * كعمليتَي Node مدمجتين داخل Electron.
 *
 * جوهر الحلّ (Phase 11.2): pnpm يستخدم روابط رمزية للحزم (next → .pnpm/next، وكذلك
 * تبعيات الـ API). الروابط لا تنجو من النسخ/التغليف على Windows بلا صلاحية، فينكسر
 * الحلّ الوقتي (require('@swc/helpers') / import('puppeteer-core')). لذا نبني
 * node_modules **مسطّحاً بملفّات حقيقية** من مخزن .pnpm لكلٍّ من الـ API والواجهة،
 * فيحلّه Node بالاجتياز العادي وينجو من أي نسخ ومن المثبِّت. بلا إعادة تثبيت وبلا
 * تغيير أي منطق تطبيق.
 *
 * ملاحظة: أسرار .env (Neon URL / JWT) لا تُنسخ هنا - قرار نشر أمني لفريق النشر.
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

/** يشتقّ اسم الحزمة من مفتاح .pnpm: "@swc+helpers@0.5.15" → "@swc/helpers"، "next@16.._x" → "next" */
function pkgNameFromPnpmKey(key) {
  if (key.startsWith("@")) {
    const verAt = key.indexOf("@", 1); // الـ@ الثاني يفصل النسخة
    return key.slice(0, verAt).replace("+", "/");
  }
  return key.slice(0, key.indexOf("@"));
}

/**
 * يبني node_modules مسطّحاً حقيقياً (بلا روابط) في destNM من مخزن .pnpm الخاص
 * بـ srcNM. حزمة واحدة لكل مفتاح + عميل Prisma المُولَّد (.prisma) إن وُجد.
 */
/**
 * تسطيح بإغلاق التبعيات (Dependency Closure): للحزم التي تُشارك مخزن .pnpm على
 * جذر مساحة العمل (مثل الـ API) - لا يوجد .pnpm محلي، بل روابط إلى الجذر. نمشي
 * على شجرة node_modules عبر realpath ونعيد المحزوم حقيقياً ومسطّحاً (بلا روابط).
 */
function flattenClosure(projectNM, destNM) {
  const placed = new Map(); // اسم الحزمة → المسار الحقيقي الموضوع في القمة
  const nestedDone = new Set(); // "owner|name" لتفادي التكرار
  const scanned = new Set(); // حاويات node_modules فُحصت
  const queue = []; // { dir, owner } للمعالجة (BFS)
  let count = 0;
  let prismaDone = false;

  const copyPkg = (real, dest) => {
    if (existsSync(dest)) return;
    cpSync(real, dest, { recursive: true, dereference: true });
    count++;
  };

  /**
   * owner = الحزمة التي تُعدّ `name` تبعية لها (null للتبعيات المباشرة للمشروع).
   *
   * تعارض الإصدارات: pnpm يسمح بوجود نسخ متعدّدة من الحزمة نفسها، بينما القمة
   * المسطّحة تتّسع لواحدة فقط. سابقاً كانت النسخة الثانية تُهمَل بصمت فينكسر من
   * يحتاجها (مثال حقيقي: readable-stream@3 في القمة بينما jszip/unzipper يحتاجان
   * v2 ذات `passthrough.js` ⇒ انهيار الـ API المُجمَّع عند الإقلاع). الآن تُوضع
   * النسخة المخالفة داخل node_modules الخاصّة بصاحبها، وهو ما يحلّه Node أوّلاً.
   */
  const enqueue = (linkPath, name, owner) => {
    let real;
    try {
      real = realpathSync(linkPath);
    } catch {
      return;
    }

    const already = placed.get(name);
    if (already === undefined) {
      // BFS يضمن أن تبعيات الـ API المباشرة تُنسخ أولاً فتفوز إصداراتها على مستوى
      // القمة (مثل zod@4 صاحب z.cuid) بدل نسخة انتقالية أقدم.
      copyPkg(real, path.join(destNM, ...name.split("/")));
      placed.set(name, real);
    } else if (already !== real && owner) {
      const key = `${owner}|${name}`;
      if (!nestedDone.has(key)) {
        nestedDone.add(key);
        copyPkg(real, path.join(destNM, ...owner.split("/"), "node_modules", ...name.split("/")));
      }
    } else if (already !== real) {
      return; // نسخة مخالفة بلا صاحب معروف - لا مكان آمن لوضعها
    }

    const marker = `${path.sep}node_modules${path.sep}`;
    const idx = real.lastIndexOf(marker);
    // حاوية الأشقّاء في مخزن pnpm تحوي تبعيات هذه الحزمة تحديداً ⇒ صاحبها هو name
    if (idx !== -1) queue.push({ dir: real.slice(0, idx + marker.length - 1), owner: name });
    const own = path.join(real, "node_modules");
    if (existsSync(own)) queue.push({ dir: own, owner: name });
  };

  const scan = (nmDir, owner) => {
    if (scanned.has(nmDir)) return;
    scanned.add(nmDir);
    let entries;
    try {
      entries = readdirSync(nmDir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry === ".bin" || entry === ".pnpm") continue;
      const full = path.join(nmDir, entry);
      if (entry === ".prisma") {
        if (!prismaDone) {
          try {
            cpSync(realpathSync(full), path.join(destNM, ".prisma"), { recursive: true, dereference: true });
            prismaDone = true;
          } catch {
            /* تجاهل */
          }
        }
        continue;
      }
      if (entry.startsWith("@")) {
        let inner;
        try {
          inner = readdirSync(full);
        } catch {
          continue;
        }
        for (const pkg of inner) enqueue(path.join(full, pkg), `${entry}/${pkg}`, owner);
        continue;
      }
      enqueue(full, entry, owner);
    }
  };

  scan(projectNM, null); // (المستوى الأول) التبعيات المباشرة تفوز
  while (queue.length) {
    const { dir, owner } = queue.shift(); // ثم الانتقالية عرضاً
    scan(dir, owner);
  }
  return count;
}

function flattenPnpm(srcNM, destNM) {
  const store = path.join(srcNM, ".pnpm");
  if (!existsSync(store)) {
    return flattenClosure(srcNM, destNM); // الـ API: يشارك مخزن الجذر → إغلاق تبعيات
  }
  let n = 0;
  let prismaCopied = false;
  for (const key of readdirSync(store)) {
    if (key.startsWith(".") || key === "node_modules") continue;
    const entryNM = path.join(store, key, "node_modules");
    if (!existsSync(entryNM)) continue;

    const segs = pkgNameFromPnpmKey(key).split("/");
    const srcPkg = path.join(entryNM, ...segs);
    const destPkg = path.join(destNM, ...segs);
    if (existsSync(srcPkg) && !existsSync(destPkg)) {
      cpSync(srcPkg, destPkg, { recursive: true, dereference: true });
      n++;
    }
    // عميل Prisma المُولَّد يقع بجوار @prisma/client كـ.prisma
    if (!prismaCopied) {
      const dotPrisma = path.join(entryNM, ".prisma");
      if (existsSync(dotPrisma)) {
        cpSync(dotPrisma, path.join(destNM, ".prisma"), { recursive: true, dereference: true });
        prismaCopied = true;
      }
    }
  }
  return n;
}

require_(apiDist, "شغّل: pnpm --filter @laundry/api build");
require_(standalone, "شغّل: pnpm --filter @laundry/admin build (يتطلّب output: standalone)");

rmSync(resources, { recursive: true, force: true });
mkdirSync(path.join(resources, "api"), { recursive: true });
mkdirSync(path.join(resources, "renderer"), { recursive: true });

// ==================== API ====================
cpSync(apiDist, path.join(resources, "api", "dist"), { recursive: true });
cpSync(apiPkg, path.join(resources, "api", "package.json"));
if (existsSync(apiPrisma)) cpSync(apiPrisma, path.join(resources, "api", "prisma"), { recursive: true });
if (existsSync(apiNodeModules)) {
  const nApi = flattenPnpm(apiNodeModules, path.join(resources, "api", "node_modules"));
  console.log(`• node_modules مسطّح للـ API: ${nApi} حزمة (بلا روابط رمزية)`);
}

// ==================== Renderer (Next standalone) ====================
const rendererDest = path.join(resources, "renderer");
// (1) ملفّات التطبيق (server.js/.next/…) متجاهلاً كل node_modules الرمزية
cpSync(standalone, rendererDest, {
  recursive: true,
  filter: (src) => !src.split(path.sep).includes("node_modules"),
});
// (2) node_modules مسطّح من .pnpm الخاص بالـ standalone
const nRen = flattenPnpm(path.join(standalone, "node_modules"), path.join(rendererDest, "node_modules"));
console.log(`• node_modules مسطّح للواجهة: ${nRen} حزمة (بلا روابط رمزية)`);
// (3) standalone لا يتضمّن .next/static ولا public — يجب نسخهما بجواره
if (existsSync(nextStatic))
  cpSync(nextStatic, path.join(rendererDest, "apps", "admin", ".next", "static"), { recursive: true });
if (existsSync(adminPublic))
  cpSync(adminPublic, path.join(rendererDest, "apps", "admin", "public"), { recursive: true });

console.log("✓ resources/ جاهزة (api + renderer) بـ node_modules مسطّح بلا روابط.");
