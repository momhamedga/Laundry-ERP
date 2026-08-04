import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync } from "node:fs";
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
/**
 * جذور تبعيات الإنتاج المُعلَنة في package.json المجاور لمجلّد node_modules.
 * تُعيد null إن تعذّرت القراءة (فيعود المُسطِّح لسلوكه القديم).
 */
function productionRoots(projectNM) {
  try {
    const pkg = JSON.parse(readFileSync(path.join(path.dirname(projectNM), "package.json"), "utf8"));
    const names = Object.keys(pkg.dependencies ?? {});
    return names.length > 0 ? names : null;
  } catch {
    return null;
  }
}

/**
 * ملفّات لا لزوم لها وقت التشغيل: خرائط المصدر، الاختبارات، الوثائق، ملفّات Git.
 * حذفها لا يمسّ التنفيذ — Node لا يقرأ ‎.map إلا عند فتح المنقّح.
 */
// ⚠ محافظة عمداً. المحاولة الأولى شملت "doc"/"docs"/"test"/"example" فحذفت
// exceljs/lib/doc — وهو شيفرة تشغيل حقيقية — فانهار الـ API بـ
// "Cannot find module './doc/workbook'". أسماء المجلّدات ليست دليلاً على
// المحتوى؛ لا نحذف إلا ما لا يمكن أن يكون شيفرة تشغيل.
const PRUNE_DIRS = new Set(["__tests__", "__mocks__", "__fixtures__", ".github", ".git", "coverage", ".nyc_output"]);
const PRUNE_FILE_RE = /(\.map|\.md|\.markdown|\.ts\.map)$/i;
const PRUNE_EXACT = /^(\.npmignore|\.editorconfig|\.eslintrc.*|\.prettierrc.*|\.travis\.yml|\.gitattributes|\.gitignore|AUTHORS|CONTRIBUTORS|\.DS_Store)$/i;
const PRUNE_TEST_FILE_RE = /\.(test|spec)\.[cm]?[jt]sx?$/i;

/** يمشي على الشجرة ويحذف ما سبق. يعيد عدد البايتات المحرَّرة. */
function pruneTree(root) {
  let freed = 0;
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (PRUNE_DIRS.has(e.name.toLowerCase())) {
          try {
            freed += dirSize(full);
            rmSync(full, { recursive: true, force: true });
          } catch {
            /* تجاهل */
          }
          continue;
        }
        walk(full);
      } else if (PRUNE_FILE_RE.test(e.name) || PRUNE_EXACT.test(e.name)) {
        try {
          freed += statSync(full).size;
          rmSync(full, { force: true });
        } catch {
          /* تجاهل */
        }
      }
    }
  };
  walk(root);
  return freed;
}

function dirSize(dir) {
  let total = 0;
  const walk = (d) => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else {
        try {
          total += statSync(full).size;
        } catch {
          /* تجاهل */
        }
      }
    }
  };
  walk(dir);
  return total;
}

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

  // Phase 15.5: المستوى الأول يقتصر على تبعيات الإنتاج المُعلَنة.
  // كان المسح يشمل كل ما في node_modules — بما فيه devDependencies (prisma CLI
  // 71MB، typescript 23MB، vitest 10MB، أدوات البناء) — فتُشحن للعميل بلا فائدة.
  // الإغلاق الانتقالي يبدأ من جذور الإنتاج فقط، فيبقى كل ما يحتاجه التشغيل.
  const prodRoots = productionRoots(projectNM);
  if (prodRoots) {
    for (const name of prodRoots) {
      enqueue(path.join(projectNM, ...name.split("/")), name, null);
    }
    // عميل Prisma المُولَّد (.prisma) ليس تبعية مُعلَنة لكنه لازم وقت التشغيل
    const dotPrisma = path.join(projectNM, ".prisma");
    if (existsSync(dotPrisma) && !prismaDone) {
      try {
        cpSync(realpathSync(dotPrisma), path.join(destNM, ".prisma"), { recursive: true, dereference: true });
        prismaDone = true;
      } catch {
        /* تجاهل */
      }
    }
  } else {
    scan(projectNM, null); // بلا package.json مقروء: السلوك القديم (آمن)
  }
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

/**
 * يرفض المتابعة إن كان البناء أقدم من المصدر.
 *
 * هذا السكربت ينسخ ما يجده ولا يبني، فبناء قديم يُشحن بصمت: نُصلح عيباً،
 * نبني المُغلِّف، ونسلّم حزمة لا تحتوي الإصلاح أصلاً. حدث هذا فعلاً مع
 * إصلاح رسالة انقطاع قاعدة البيانات، ولم يظهر إلا بفحص محتوى الحزمة يدوياً.
 */
function assertFresh(srcDir, outDir, label, fixHint) {
  if (!existsSync(srcDir)) return;
  const newest = (dir) => {
    let t = 0;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const p = path.join(dir, e.name);
      t = Math.max(t, e.isDirectory() ? newest(p) : statSync(p).mtimeMs);
    }
    return t;
  };
  const src = newest(srcDir);
  const out = newest(outDir);
  if (src > out) {
    console.error(
      `\n✗ بناء ${label} أقدم من مصدره — الحزمة ستُشحن بكود قديم.\n` +
        `  آخر تعديل في المصدر : ${new Date(src).toLocaleString("ar-EG")}\n` +
        `  آخر بناء            : ${new Date(out).toLocaleString("ar-EG")}\n` +
        `  الحل                : ${fixHint}\n`,
    );
    process.exit(1);
  }
}

assertFresh(
  path.join(root, "apps", "api", "src"),
  apiDist,
  "الخادم (api)",
  "pnpm --filter @laundry/api build",
);

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
  const freedApi = pruneTree(path.join(resources, "api", "node_modules"));
  console.log(`• تشذيب الـ API: تحرّر ${(freedApi / 1048576).toFixed(1)} MB (خرائط/اختبارات/وثائق)`);
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
const freedRen = pruneTree(path.join(rendererDest, "node_modules"));
console.log(`• تشذيب الواجهة: تحرّر ${(freedRen / 1048576).toFixed(1)} MB`);
// (3) standalone لا يتضمّن .next/static ولا public — يجب نسخهما بجواره
if (existsSync(nextStatic))
  cpSync(nextStatic, path.join(rendererDest, "apps", "admin", ".next", "static"), { recursive: true });
if (existsSync(adminPublic))
  cpSync(adminPublic, path.join(rendererDest, "apps", "admin", "public"), { recursive: true });

console.log("✓ resources/ جاهزة (api + renderer) بـ node_modules مسطّح بلا روابط.");
