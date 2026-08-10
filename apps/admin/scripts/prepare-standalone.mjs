import { cpSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * يُكمِل خرج standalone بالأصول التي لا ينسخها Next بنفسه.
 *
 * `output: "standalone"` يُخرج خادماً مكتفياً ذاتياً لكنه **يترك عمداً**
 * `.next/static` و`public` خارجه، على افتراض أن مُشغِّلاً خارجياً (CDN) سيقدّمها.
 * تشغيله كما هو يرفع صفحات بلا أي CSS ولا خطوط ولا صور — والصفحة تظهر فعلاً
 * لا تفشل، فيبدو النشر ناجحاً. وقعتُ في هذا حرفياً أثناء تصوير صفحة الدخول:
 * لقطة بلا تنسيق أوهمتني بخلل في التصميم لا في التشغيل.
 *
 * يُشغَّل بعد `next build` مباشرةً ضمن build:standalone.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(here, "..");
const standaloneApp = path.join(appDir, ".next", "standalone", "apps", "admin");

if (!existsSync(standaloneApp)) {
  console.error(
    `✗ لم يُعثر على خرج standalone في ${standaloneApp}\n` +
      "  تأكّد أن `next build` نُفِّذ وأن output=standalone مفعّل (أي بناء خارج Vercel).",
  );
  process.exit(1);
}

const copies = [
  { from: path.join(appDir, ".next", "static"), to: path.join(standaloneApp, ".next", "static"), label: "الأصول الساكنة" },
  { from: path.join(appDir, "public"), to: path.join(standaloneApp, "public"), label: "مجلد public" },
];

for (const { from, to, label } of copies) {
  if (!existsSync(from)) {
    console.log(`• ${label}: غير موجود — يُتخطّى`);
    continue;
  }
  cpSync(from, to, { recursive: true });
  console.log(`• ${label}: نُسخ إلى ${path.relative(appDir, to)}`);
}

console.log("✓ خرج standalone مكتمل");
