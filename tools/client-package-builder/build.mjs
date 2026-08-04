/**
 * Laundry ERP — Client Package Builder (Phase 15C).
 *
 * ⚠ أداة المطوّر فقط. لا تُشحن للعميل. تلمس المفتاح الخاص وروابط قواعد البيانات.
 *
 * تُنتج حزمة تسليم كاملة لعميل واحد: المُثبِّت + الترخيص + إعداد التشغيل +
 * العلامة التجارية + الأدلّة + سكربت تجهيز بنقرة واحدة.
 *
 * الاستخدام (تفاعلي):
 *   node tools/client-package-builder/build.mjs
 *
 * أو غير تفاعلي:
 *   node tools/client-package-builder/build.mjs --config عميل.json
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { pathToFileURL } from "node:url";
import { loadBranding, render, ROOT } from "../branding.mjs";

const RELEASE_DIR = path.join(ROOT, "apps", "desktop", "release");
const DOCS = path.join(ROOT, "docs");
const KEYS = path.join(ROOT, "tools", "license-generator", "keys");
const OUT_ROOT = path.join(ROOT, "dist-client");
const LM_DATA = path.join(ROOT, "tools", "license-manager", "data");

const sdk = await import(
  pathToFileURL(path.join(ROOT, "packages", "license-sdk", "dist", "index.js")).href
);

const DAY = 86_400_000;
const arg = (k) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : null;
};

// ==================== جمع البيانات ====================

/** الأسئلة بالترتيب الذي طلبه سير العمل التجاري. */
const FIELDS = [
  { key: "customerName", q: "اسم العميل (الشخص المسؤول)", required: true },
  { key: "laundryName", q: "اسم المغسلة", required: true },
  { key: "phone", q: "رقم الهاتف", required: false },
  { key: "companyName", q: "اسم الشركة (للفواتير)", required: false },
  { key: "branchName", q: "اسم الفرع", required: false, def: "الفرع الرئيسي" },
  { key: "licenseType", q: "نوع الترخيص [trial|starter|professional|enterprise]", required: false, def: "professional" },
  { key: "licenseDays", q: "مدة الترخيص بالأيام (فارغ = دائم)", required: false, def: "365" },
  { key: "maxUsers", q: "عدد المستخدمين (فارغ = افتراضي النوع)", required: false },
  { key: "databaseUrl", q: "رابط قاعدة البيانات (postgresql://…)", required: true, secret: true },
  { key: "activationRequest", q: "مسار ملفّ طلب التفعيل من العميل (.json)", required: true },
];

async function ask() {
  const cfgPath = arg("config");
  if (cfgPath) {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
    for (const f of FIELDS) {
      if (f.required && !cfg[f.key]) throw new Error(`ينقص الحقل المطلوب: ${f.key} (${f.q})`);
      cfg[f.key] ??= f.def ?? "";
    }
    return cfg;
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const out = {};
  console.log("\n  ═══ تجهيز حزمة عميل جديد ═══\n");
  for (const f of FIELDS) {
    const hint = f.def ? ` [${f.def}]` : f.required ? " *" : "";
    // eslint-disable-next-line no-await-in-loop -- أسئلة متسلسلة عمداً
    let v = (await rl.question(`  ${f.q}${hint}: `)).trim();
    if (!v) v = f.def ?? "";
    if (f.required && !v) throw new Error(`الحقل مطلوب: ${f.q}`);
    out[f.key] = v;
  }
  rl.close();
  return out;
}

// ==================== التحقّق ====================

function validate(cfg) {
  const errors = [];
  if (!/^postgres(ql)?:\/\/.+/i.test(cfg.databaseUrl)) {
    errors.push("رابط قاعدة البيانات يجب أن يبدأ بـ postgresql://");
  }
  if (!fs.existsSync(cfg.activationRequest)) {
    errors.push(`ملفّ طلب التفعيل غير موجود: ${cfg.activationRequest}`);
  }
  if (!sdk.LICENSE_PRESETS[cfg.licenseType]) {
    errors.push(`نوع ترخيص غير معروف: ${cfg.licenseType}`);
  }
  if (!fs.existsSync(path.join(KEYS, "private-key.pem"))) {
    errors.push("المفتاح الخاص غير موجود — شغّل keygen أولاً");
  }
  if (errors.length) throw new Error(`تحقّق فاشل:\n  • ${errors.join("\n  • ")}`);
}

// ==================== الترخيص ====================

function issueLicense(cfg) {
  const req = JSON.parse(fs.readFileSync(cfg.activationRequest, "utf8"));
  if (!req.machineId || !req.fullHash || !req.components) {
    throw new Error("ملفّ طلب التفعيل غير صالح (ينقص machineId/fullHash/components)");
  }
  const preset = sdk.LICENSE_PRESETS[cfg.licenseType];
  const days = cfg.licenseDays ? Number(cfg.licenseDays) : null;

  const payload = {
    schema: 1,
    licenseId: crypto.randomUUID(),
    customerName: cfg.customerName,
    companyName: cfg.companyName || cfg.laundryName,
    type: cfg.licenseType,
    expiryDate: days ? new Date(Date.now() + days * DAY).toISOString() : null,
    issueDate: new Date().toISOString(),
    maxUsers: cfg.maxUsers ? Number(cfg.maxUsers) : preset.maxUsers,
    maxDevices: preset.maxDevices,
    maxBranches: preset.maxBranches,
    features: preset.features,
    minAppVersion: "1.0",
    machine: { machineId: req.machineId, fullHash: req.fullHash, components: req.components },
  };

  const license = {
    payload,
    signature: sdk.signPayload(payload, fs.readFileSync(path.join(KEYS, "private-key.pem"), "utf8")),
    algorithm: "RSA-SHA256",
  };
  if (!sdk.verifyLicenseSignature(license, fs.readFileSync(path.join(KEYS, "public-key.pem"), "utf8"))) {
    throw new Error("فشل التحقّق الذاتي من التوقيع — لم تُنتَج الحزمة");
  }
  return { license, text: sdk.encodeLicenseFile(license), machineId: req.machineId };
}

/** يسجّل الترخيص في سجلّ مدير التراخيص كي يبقى مصدر حقيقة واحداً. */
function recordInRegistry(cfg, payload, fileName) {
  const regFile = path.join(LM_DATA, "registry.json");
  let reg = { version: 1, licenses: [] };
  try { reg = JSON.parse(fs.readFileSync(regFile, "utf8")); } catch { /* سجلّ جديد */ }
  reg.licenses.push({
    licenseId: payload.licenseId,
    customerName: payload.customerName,
    companyName: payload.companyName,
    type: payload.type,
    machineId: payload.machine.machineId,
    issueDate: payload.issueDate,
    expiryDate: payload.expiryDate,
    maxUsers: payload.maxUsers,
    maxDevices: payload.maxDevices,
    maxBranches: payload.maxBranches,
    status: "active",
    fileName,
    notes: `حزمة عميل — ${cfg.laundryName}${cfg.phone ? ` — ${cfg.phone}` : ""}`,
    price: "",
    history: [{ at: payload.issueDate, action: "issued", note: "عبر Client Package Builder" }],
  });
  fs.mkdirSync(LM_DATA, { recursive: true });
  fs.mkdirSync(path.join(LM_DATA, "issued"), { recursive: true });
  const tmp = `${regFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(reg, null, 2), "utf8");
  fs.renameSync(tmp, regFile);
}

// ==================== الحزمة ====================

function build(cfg) {
  validate(cfg);
  const branding = loadBranding();
  const version = branding.product.version;
  const { license, text, machineId } = issueLicense(cfg);
  const payload = license.payload;

  const safe = (s) => String(s).replace(/[^\w؀-ۿ-]+/g, "_").slice(0, 40);
  const outName = `LaundryERP-v${version}-${safe(cfg.laundryName)}`;
  const OUT = path.join(OUT_ROOT, outName);
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const files = [];
  const put = (rel, content, mode) => {
    const f = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, content, mode ? { encoding: "utf8", mode } : "utf8");
    files.push(rel);
  };
  const copy = (from, rel) => {
    const f = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.copyFileSync(from, f);
    files.push(rel);
  };

  // ---------- 1. المُثبِّت ----------
  const exes = fs.existsSync(RELEASE_DIR) ? fs.readdirSync(RELEASE_DIR).filter((f) => f.endsWith(".exe")) : [];
  const setup = exes.find((f) => !/portable/i.test(f));
  if (!setup) throw new Error("المُثبِّت غير موجود — شغّل: pnpm --filter @laundry/desktop run dist");
  copy(path.join(RELEASE_DIR, setup), path.join("1-التثبيت", setup));
  const yml = path.join(RELEASE_DIR, "latest.yml");
  if (fs.existsSync(yml)) copy(yml, path.join("1-التثبيت", "latest.yml"));

  // ---------- 2. التجهيز (إعداد التشغيل) ----------
  // ملفّ واحد يحمل كل ما يحتاجه الجهاز: الاتصال + العلامة + بيانات التركيب.
  // أسرار JWT **ليست هنا** — يولّدها التطبيق محلّياً عند أول تشغيل.
  const provision = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    databaseUrl: cfg.databaseUrl,
    env: { NODE_ENV: "production", PORT: "4000" },
    branding: {
      ...branding,
      company: { ...branding.company, name: cfg.companyName || branding.company.name },
    },
    installation: {
      customerName: cfg.customerName,
      laundryName: cfg.laundryName,
      phone: cfg.phone,
      companyName: cfg.companyName || cfg.laundryName,
      branchName: cfg.branchName,
      licenseId: payload.licenseId,
      maxUsers: payload.maxUsers,
      provisionedAt: new Date().toISOString(),
    },
  };
  put(path.join("2-التجهيز", "provision.json"), JSON.stringify(provision, null, 2), 0o600);

  const licFile = `${safe(cfg.laundryName)}-${payload.licenseId.slice(0, 8)}.lkey`;
  put(path.join("2-التجهيز", licFile), text);

  // نسخة في سجلّ مدير التراخيص أيضاً
  fs.mkdirSync(path.join(LM_DATA, "issued"), { recursive: true });
  fs.writeFileSync(path.join(LM_DATA, "issued", licFile), text, "utf8");
  recordInRegistry(cfg, payload, licFile);

  // ---------- سكربت التجهيز بنقرة واحدة ----------
  // ينسخ provision.json إلى مجلّد إعداد التشغيل ثم يشغّل المُثبِّت.
  // التطبيق يقرؤه عند أول تشغيل فيجهّز نفسه بلا أي تدخّل من العميل.
  put(
    "تثبيت وتجهيز.cmd",
    // ⚠️ النصّ إنجليزي عمداً. سطر أوامر ويندوز لا يدعم اتجاه RTL ولا وصل
    // الحروف العربية حتى مع chcp 65001، فتظهر معكوسة ومقطّعة — وهي أول شاشة
    // يراها العميل. الإنجليزية البسيطة أوضح من عربية مشوّهة.
    [
      "@echo off",
      "chcp 65001 >nul",
      "setlocal",
      `title Laundry ERP v${version} - Setup`,
      "echo.",
      "echo   ============================================",
      `echo     Laundry ERP v${version}  -  Setup`,
      "echo   ============================================",
      "echo.",
      'set "RT=%APPDATA%\\@laundry\\runtime"',
      'if not exist "%RT%" mkdir "%RT%" >nul 2>&1',
      "echo   [1/2] Preparing device configuration...",
      'copy /Y "%~dp02-التجهيز\\provision.json" "%RT%\\provision.json" >nul',
      "if errorlevel 1 (echo   FAILED to copy configuration. & echo. & pause & exit /b 1)",
      "echo         Done.",
      "echo.",
      "echo   [2/2] Running installer...",
      `start /wait "" "%~dp01-التثبيت\\${setup}"`,
      "echo.",
      "echo   ============================================",
      "echo     Setup complete.",
      "echo.",
      "echo     1. Launch Laundry ERP from the desktop icon",
      "echo     2. Wait about 90 seconds on first run",
      "echo     3. Open the License page and import the .lkey",
      "echo        file from the 2-التجهيز folder",
      "echo   ============================================",
      "echo.",
      "pause",
    ].join("\r\n"),
  );

  // ---------- 3. الأدلّة ----------
  for (const [base, ar] of [
    ["ACTIVATION_GUIDE", "دليل التفعيل"],
    ["USER_MANUAL", "دليل الاستخدام"],
    ["SUPPORT_GUIDE", "دليل الدعم الفني"],
    ["RELEASE_NOTES", "ملف التغييرات"],
  ]) {
    const pdf = path.join(DOCS, "pdf", `${base}.pdf`);
    const md = path.join(DOCS, `${base}.md`);
    if (fs.existsSync(pdf)) copy(pdf, path.join("3-الأدلّة", `${ar}.pdf`));
    else if (fs.existsSync(md)) copy(md, path.join("3-الأدلّة", `${ar}.md`));
  }

  // ---------- 4. الدعم والفاتورة ----------
  // دليل الدعم الفني يحيل العميل صراحةً إلى «بيانات الدعم الفني.txt»؛ غيابه
  // يترك مرجعاً مكسوراً في وثيقة تُسلَّم للعميل.
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
        "  • من «مساعدة ← عن التطبيق ← نسخ بيانات الدعم»",
        "    (ينسخ الإصدار والترخيص ومعرّف الجهاز دفعة واحدة).",
        "  • وصف المشكلة وخطوات تكرارها، ولقطة شاشة إن أمكن.",
        "  • ملفّ السجلّات: «عن التطبيق ← فتح السجلّات».",
        "",
        `العميل         : ${cfg.customerName}`,
        `المغسلة        : ${cfg.laundryName}`,
        `معرّف الجهاز   : ${machineId}`,
        `رقم الترخيص    : ${payload.licenseId}`,
        "",
        "{{legal.copyright}}",
      ].join("\n"),
      branding,
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
        `الترخيص          : ${payload.type} — ${payload.expiryDate ? `ينتهي ${payload.expiryDate.slice(0, 10)}` : "دائم"}`,
        `العميل           : ${cfg.customerName} — ${cfg.laundryName}`,
        "",
        "العملة           : {{invoice.currency}}",
        "طرق السداد       : {{invoice.paymentMethods}}",
        "بيانات التحويل   : {{invoice.bankDetails}}",
        "",
        "الضمان والصيانة  : {{legal.warranty}}",
        "شروط الترخيص     : {{legal.licenseTerms}}",
        "",
        "ملاحظات          : {{invoice.notes}}",
        "",
        "للاستفسار: {{support.email}} · {{support.phone}}",
      ].join("\n"),
      branding,
    ),
  );

  // ---------- 5. اقرأني ----------
  put(
    "اقرأني أولاً.txt",
    [
      "════════════════════════════════════════════════════",
      `   Laundry ERP v${version} — ${cfg.laundryName}`,
      "════════════════════════════════════════════════════",
      "",
      `العميل  : ${cfg.customerName}`,
      `المغسلة : ${cfg.laundryName}`,
      cfg.branchName ? `الفرع   : ${cfg.branchName}` : "",
      `الجهاز  : ${machineId}`,
      `الترخيص : ${payload.type} — ${payload.expiryDate ? `ينتهي ${payload.expiryDate.slice(0, 10)}` : "دائم"}`,
      "",
      "──────────── خطوة واحدة فقط ────────────",
      "",
      '  شغّل الملفّ:  «تثبيت وتجهيز.cmd»',
      "",
      "  يقوم تلقائياً بتجهيز الجهاز ثم تثبيت البرنامج.",
      "  لا تحتاج نسخ أي ملفّ يدوياً.",
      "",
      "──────────── بعد التثبيت ────────────",
      "",
      "  1. شغّل البرنامج من أيقونة سطح المكتب.",
      "  2. افتح صفحة «الترخيص» من القائمة الجانبية.",
      "  3. اضغط «استيراد ملفّ الترخيص» واختر:",
      `     2-التجهيز\\${licFile}`,
      "  4. تظهر شارة «مُفعَّل» — جاهز.",
      "",
      "⚠ مجلّد «2-التجهيز» يحتوي إعدادات حسّاسة — لا تشاركه مع أحد.",
      "",
      `الدعم: ${branding.support.email} · ${branding.support.phone}`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  put(
    "MANIFEST.txt",
    [
      `Laundry ERP v${version}`,
      `العميل      : ${cfg.customerName} — ${cfg.laundryName}`,
      `معرّف الجهاز : ${machineId}`,
      `رقم الترخيص : ${payload.licenseId}`,
      `بُنيت       : ${new Date().toISOString()}`,
      "",
      "الملفّات:",
      ...files.map((f) => `  ${f}`),
    ].join("\n"),
  );

  return { OUT, files: files.length + 1, payload, machineId, licFile };
}

// ==================== التشغيل ====================

try {
  const cfg = await ask();
  const r = build(cfg);
  console.log("\n  ✓ جاهزة للتسليم");
  console.log(`    المجلّد     : ${r.OUT}`);
  console.log(`    الملفّات    : ${r.files}`);
  console.log(`    الجهاز      : ${r.machineId}`);
  console.log(`    رقم الترخيص : ${r.payload.licenseId}`);
  console.log(`    الانتهاء    : ${r.payload.expiryDate?.slice(0, 10) ?? "دائم"}`);
  console.log("\n  سُجِّل الترخيص في مدير التراخيص أيضاً.\n");
} catch (err) {
  console.error(`\n  ✗ ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}
