/**
 * يبني حزمة العميل النهائية (Phase 15C).
 *
 * المخرج: مجلّد واحد جاهز للنسخ على فلاشة أو الضغط وإرساله — يحتوي المُثبِّت
 * والأدلّة وبيانات الدعم والفاتورة، ومكاناً مخصّصاً لملفّ الترخيص.
 *
 * الاستخدام:
 *   node tools/build-client-package.mjs                      # حزمة عامّة
 *   node tools/build-client-package.mjs --license <ملفّ.lkey> # حزمة مخصّصة لعميل
 *   node tools/build-client-package.mjs --customer "مغسلة النور"
 */
import fs from "node:fs";
import path from "node:path";
import { assertNoPlaceholders, loadBranding, render, ROOT } from "./branding.mjs";

const args = process.argv.slice(2);
const arg = (k) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : null;
};

const RELEASE_DIR = path.join(ROOT, "apps", "desktop", "release");
const DOCS = path.join(ROOT, "docs");

function main() {
  // حاجز مقصود: لا نبني حزمة تُسلَّم لعميل ببيانات دعم مؤقتة
  const b = assertNoPlaceholders(loadBranding());
  const version = b.product.version;

  const customer = arg("customer");
  const licenseFile = arg("license");
  const outName = customer
    ? `LaundryERP-v${version}-${customer.replace(/[^\w؀-ۿ-]+/g, "_").slice(0, 40)}`
    : `LaundryERP-v${version}-Client-Package`;
  const OUT = path.join(ROOT, "dist-client", outName);

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const report = [];
  const put = (rel, content) => {
    const p = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content, "utf8");
    report.push(rel);
  };
  const copy = (from, rel) => {
    const p = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.copyFileSync(from, p);
    report.push(rel);
  };

  // ==================== 1. المُثبِّت ====================
  const exes = fs.existsSync(RELEASE_DIR)
    ? fs.readdirSync(RELEASE_DIR).filter((f) => f.endsWith(".exe"))
    : [];
  // المُثبِّت هو ما ليس portable — لا نعتمد على وجود كلمة "setup" في الاسم،
  // فـ artifactName لا يحويها، وكان ذلك يسلّم النسخة المحمولة بدل المُثبِّت.
  const setup = exes.find((f) => !/portable/i.test(f));
  const portable = exes.find((f) => /portable/i.test(f));
  if (setup) {
    copy(path.join(RELEASE_DIR, setup), path.join("1-التثبيت", setup));
    // latest.yml لازم لعمل التحديث التلقائي من نفس المصدر
    const yml = path.join(RELEASE_DIR, "latest.yml");
    if (fs.existsSync(yml)) copy(yml, path.join("1-التثبيت", "latest.yml"));
    if (portable) {
      copy(path.join(RELEASE_DIR, portable), path.join("1-التثبيت", "نسخة محمولة (بلا تثبيت)", portable));
    }
  } else {
    put(
      path.join("1-التثبيت", "المُثبِّت-غير-موجود.txt"),
      "لم يُعثر على المُثبِّت في apps/desktop/release.\nشغّل: pnpm --filter @laundry/desktop run package:win\nثم أعد تشغيل بناء الحزمة.\n",
    );
    console.warn("⚠ لم يُعثر على المُثبِّت — الحزمة ناقصة.");
  }

  // ==================== 2. الترخيص ====================
  if (licenseFile) {
    if (!fs.existsSync(licenseFile)) throw new Error(`ملفّ الترخيص غير موجود: ${licenseFile}`);
    copy(licenseFile, path.join("2-الترخيص", path.basename(licenseFile)));
  } else {
    put(
      path.join("2-الترخيص", "ضع-ملفّ-الترخيص-هنا.txt"),
      [
        "ملفّ الترخيص (بامتداد .lkey) يُوضع في هذا المجلّد.",
        "",
        "إن لم تستلمه بعد:",
        "  1. ثبّت البرنامج وشغّله.",
        "  2. افتح صفحة «الترخيص» من القائمة الجانبية.",
        "  3. اضغط «تصدير طلب التفعيل» وأرسل الملفّ للدعم الفني.",
        "  4. ستستلم ملفّ .lkey — استورده من نفس الصفحة.",
        "",
        `الدعم الفني: ${b.support.email} · ${b.support.phone}`,
      ].join("\n"),
    );
  }

  // ==================== 3. الأدلّة ====================
  const docs = [
    ["ACTIVATION_GUIDE", "دليل التفعيل"],
    ["USER_MANUAL", "دليل الاستخدام"],
    ["SUPPORT_GUIDE", "دليل الدعم الفني"],
    ["RELEASE_NOTES", "ملف التغييرات"],
  ];
  for (const [base, ar] of docs) {
    const pdf = path.join(DOCS, "pdf", `${base}.pdf`);
    const md = path.join(DOCS, `${base}.md`);
    if (fs.existsSync(pdf)) copy(pdf, path.join("3-الأدلّة", `${ar}.pdf`));
    else if (fs.existsSync(md)) copy(md, path.join("3-الأدلّة", `${ar}.md`));
    else console.warn(`⚠ الدليل غير موجود: ${base}`);
  }

  // ==================== 4. الدعم والفاتورة ====================
  put(
    path.join("4-الدعم", "بيانات الدعم الفني.txt"),
    render(
      [
        "════════════════════════════════════════",
        "   الدعم الفني — {{product.name}} v{{product.version}}",
        "════════════════════════════════════════",
        "",
        "المورّد        : {{company.name}}",
        "الموقع         : {{company.website}}",
        "العنوان        : {{company.address}}",
        "",
        "البريد         : {{support.email}}",
        "الهاتف         : {{support.phone}}",
        "واتساب         : {{support.whatsapp}}",
        "أوقات العمل    : {{support.hours}}",
        "زمن الاستجابة  : {{support.responseTime}}",
        "الدعم عن بُعد  : {{support.remoteTool}}",
        "",
        "════════════════════════════════════════",
        "قبل التواصل، جهّز:",
        "  • رقم الترخيص ومعرّف الجهاز — من قائمة «مساعدة ← عن التطبيق»",
        "    ثم «نسخ بيانات الدعم» (ينسخ كل ما نحتاجه دفعة واحدة).",
        "  • وصف المشكلة وخطوات تكرارها.",
        "  • لقطة شاشة إن أمكن.",
        "  • ملفّ السجلّات: «مساعدة ← فتح مجلد السجلّات».",
        "",
        "{{legal.copyright}} {{company.name}}",
      ].join("\n"),
      b,
    ),
  );

  put(
    path.join("4-الدعم", "بيانات الفاتورة والسداد.txt"),
    render(
      [
        "════════════════════════════════════════",
        "   بيانات الفاتورة والسداد",
        "════════════════════════════════════════",
        "",
        "المورّد          : {{company.name}} ({{company.nameEn}})",
        "العنوان          : {{company.address}}",
        "الرقم الضريبي    : {{company.taxNumber}}",
        "السجل التجاري    : {{company.commercialRegister}}",
        "",
        "المنتج           : {{product.name}} v{{product.version}} {{product.edition}}",
        "العملة           : {{invoice.currency}}",
        "طرق السداد       : {{invoice.paymentMethods}}",
        "بيانات التحويل   : {{invoice.bankDetails}}",
        "",
        "الضمان والصيانة  : {{legal.warranty}}",
        "شروط الترخيص     : {{legal.licenseTerms}}",
        "",
        "ملاحظات          : {{invoice.notes}}",
        "",
        "للاستفسار عن الفواتير: {{support.email}} · {{support.phone}}",
      ].join("\n"),
      b,
    ),
  );

  // ==================== 5. اقرأني ====================
  put(
    "اقرأني أولاً.txt",
    render(
      [
        "════════════════════════════════════════════════════",
        "   {{product.name}} v{{product.version}} — {{product.nameAr}}",
        "════════════════════════════════════════════════════",
        "",
        customer ? `مُعدّة خصّيصاً لـ: ${customer}` : "",
        "",
        "محتويات الحزمة:",
        "  1-التثبيت  : المُثبِّت — شغّله أولاً",
        "  2-الترخيص  : ملفّ التفعيل (.lkey)",
        "  3-الأدلّة   : دليل التفعيل والاستخدام والدعم وملف التغييرات",
        "  4-الدعم    : بيانات التواصل والفاتورة",
        "",
        "──────────── خطوات البدء ────────────",
        "  1. افتح مجلّد «1-التثبيت» وشغّل المُثبِّت.",
        "  2. شغّل البرنامج من أيقونة سطح المكتب.",
        "  3. افتح صفحة «الترخيص» من القائمة الجانبية.",
        "  4. اضغط «استيراد ملفّ الترخيص» واختر الملفّ من مجلّد «2-الترخيص».",
        "  5. تظهر شارة «مُفعَّل» خضراء — البرنامج جاهز.",
        "",
        "إن لم يصلك ملفّ الترخيص بعد، اتبع التعليمات داخل مجلّد «2-الترخيص».",
        "",
        "──────────── مهم ────────────",
        "  • البرنامج يعمل دون إنترنت بالكامل — التفعيل والاستخدام.",
        "  • خذ نسخة احتياطية دورياً من داخل البرنامج.",
        "  • الترخيص مربوط بهذا الجهاز؛ نقله لجهاز آخر يحتاج ترخيصاً جديداً.",
        "",
        "الدعم: {{support.email}} · {{support.phone}}",
        "{{legal.copyright}} {{company.name}}",
      ]
        .filter((l) => l !== "")
        .join("\n"),
      b,
    ),
  );

  // ==================== بيان المحتويات ====================
  put(
    "MANIFEST.txt",
    [
      `${b.product.name} v${version} ${b.product.edition}`,
      `بُنيت: ${new Date().toISOString()}`,
      customer ? `العميل: ${customer}` : "حزمة عامّة",
      "",
      "الملفّات:",
      ...report.map((r) => `  ${r}`),
    ].join("\n"),
  );

  console.log(`\n✓ جاهزة: ${OUT}`);
  console.log(`  ${report.length + 1} ملفّاً`);
  if (!setup) console.log("  ⚠ بلا مُثبِّت — أعد البناء بعد package:win");
  return OUT;
}

try {
  main();
} catch (err) {
  console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}
