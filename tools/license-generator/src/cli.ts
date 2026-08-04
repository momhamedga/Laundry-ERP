#!/usr/bin/env node
/**
 * Laundry ERP — License Generator (Phase 15B)
 *
 * ⚠️ أداة المطوّر فقط. **لا تُسلَّم للعميل ولا تُغلَّف داخل التطبيق إطلاقاً.**
 * هي المكان الوحيد الذي يوجد فيه المفتاح الخاص.
 *
 * الاستخدام:
 *   node dist/cli.js keygen                          # مرّة واحدة فقط
 *   node dist/cli.js issue --request <file> [...]    # إصدار ترخيص
 *   node dist/cli.js inspect <license-file>          # فحص ترخيص
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  LICENSE_PRESETS,
  UNLIMITED,
  encodeLicenseFile,
  decodeLicenseFile,
  generateKeyPair,
  signPayload,
  verifyLicenseSignature,
  type LicenseFile,
  type LicensePayload,
  type LicenseType,
} from "@laundry/license-sdk";

const KEYS_DIR = process.env.LICENSE_KEYS_DIR ?? path.join(process.cwd(), "keys");
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, "private-key.pem");
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, "public-key.pem");
const OUT_DIR = process.env.LICENSE_OUT_DIR ?? path.join(process.cwd(), "issued");

// التعليق الصريح ضروري: بدونه لا يضيّق TypeScript النوع بعد استدعاء دالة never
// مُسنَدة إلى ثابت، فتظهر أخطاء "possibly null" بعد die().
const die: (msg: string) => never = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

function args(): Record<string, string> {
  const out: Record<string, string> = {};
  const a = process.argv.slice(3);
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (k?.startsWith("--")) {
      const key = k.slice(2);
      const next = a[i + 1];
      if (next && !next.startsWith("--")) {
        out[key] = next;
        i++;
      } else {
        out[key] = "true";
      }
    }
  }
  return out;
}

// ==================== keygen ====================
function keygen(): void {
  if (fs.existsSync(PRIVATE_KEY_PATH)) {
    die(
      `المفتاح الخاص موجود بالفعل: ${PRIVATE_KEY_PATH}\n` +
        `  توليد مفتاح جديد سيُبطل كل التراخيص الصادرة سابقاً. احذف الملفّ يدوياً إن كنت متأكداً.`,
    );
  }
  fs.mkdirSync(KEYS_DIR, { recursive: true });
  console.log("• توليد زوج مفاتيح RSA-4096 (قد يستغرق ثوانٍ)…");
  const { publicKey, privateKey } = generateKeyPair();
  fs.writeFileSync(PRIVATE_KEY_PATH, privateKey, { mode: 0o600 });
  fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);
  console.log(`✓ المفتاح الخاص : ${PRIVATE_KEY_PATH}`);
  console.log(`✓ المفتاح العام : ${PUBLIC_KEY_PATH}`);
  console.log("");
  console.log("الخطوات التالية:");
  console.log("  1) انسخ المفتاح الخاص إلى مكان آمن (مدير كلمات سر / USB مشفّرة). لا تضعه في Git.");
  console.log("  2) ضع محتوى المفتاح العام في apps/desktop/src/main/license/public-key.ts");
  console.log("  ⚠️ فقدان المفتاح الخاص = استحالة إصدار تراخيص للعملاء الحاليين.");
}

// ==================== issue ====================
function issue(): void {
  if (!fs.existsSync(PRIVATE_KEY_PATH)) die(`المفتاح الخاص غير موجود. شغّل: keygen`);
  const a = args();

  // بيانات الجهاز تأتي من طلب التفعيل الذي يرسله العميل
  const requestPath = a.request;
  if (!requestPath) die("مطلوب --request <activation-request.json> (يصدّره العميل من التطبيق)");
  if (!fs.existsSync(requestPath)) die(`ملفّ الطلب غير موجود: ${requestPath}`);
  const req = JSON.parse(fs.readFileSync(requestPath, "utf8")) as {
    machineId: string;
    fullHash: string;
    components: Record<string, string>;
    appVersion?: string;
  };
  if (!req.machineId || !req.components) die("ملفّ الطلب غير صالح (ينقصه machineId أو components)");

  const type = (a.type ?? "trial") as LicenseType;
  if (!LICENSE_PRESETS[type]) die(`نوع ترخيص غير معروف: ${type}`);
  const preset = LICENSE_PRESETS[type];

  const customerName = a.customer ?? die("مطلوب --customer <اسم العميل>");
  const companyName = a.company ?? customerName;

  // تاريخ الانتهاء: --days N، أو --expiry ISO، أو الافتراضي حسب النوع
  let expiryDate: string | null = null;
  if (a.expiry) {
    expiryDate = new Date(a.expiry).toISOString();
  } else if (a.days) {
    expiryDate = new Date(Date.now() + Number(a.days) * 86_400_000).toISOString();
  } else if (preset.trialDays) {
    expiryDate = new Date(Date.now() + preset.trialDays * 86_400_000).toISOString();
  }

  const payload: LicensePayload = {
    schema: 1,
    licenseId: crypto.randomUUID(),
    customerName,
    companyName,
    type,
    expiryDate,
    issueDate: new Date().toISOString(),
    maxUsers: a.users ? Number(a.users) : preset.maxUsers,
    maxDevices: a.devices ? Number(a.devices) : preset.maxDevices,
    maxBranches: a.branches ? Number(a.branches) : preset.maxBranches,
    features: preset.features,
    minAppVersion: a["min-version"] ?? "1.0",
    machine: {
      machineId: req.machineId,
      fullHash: req.fullHash,
      components: req.components as LicensePayload["machine"]["components"],
    },
  };

  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf8");
  const license: LicenseFile = {
    payload,
    signature: signPayload(payload, privateKey),
    algorithm: "RSA-SHA256",
  };

  // تحقّق ذاتي قبل التسليم — لا نُصدر ترخيصاً لا يمرّ تحققنا
  const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, "utf8");
  if (!verifyLicenseSignature(license, publicKey)) die("فشل التحقّق الذاتي من التوقيع — لم يُصدَر الترخيص");

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const safe = customerName.replace(/[^\w؀-ۿ-]+/g, "_").slice(0, 40);
  const outPath = path.join(OUT_DIR, `${safe}-${type}.license`);
  fs.writeFileSync(outPath, encodeLicenseFile(license), "utf8");

  const fmt = (n: number): string => (n === UNLIMITED ? "غير محدود" : String(n));
  console.log("✓ صدر الترخيص وتحقّقنا من توقيعه");
  console.log(`  الملفّ    : ${outPath}`);
  console.log(`  العميل    : ${customerName} (${companyName})`);
  console.log(`  النوع     : ${type}`);
  console.log(`  الجهاز    : ${req.machineId}`);
  console.log(`  الانتهاء  : ${expiryDate ? expiryDate.slice(0, 10) : "دائم"}`);
  console.log(`  الحدود    : مستخدمون=${fmt(payload.maxUsers)} أجهزة=${fmt(payload.maxDevices)} فروع=${fmt(payload.maxBranches)}`);
  console.log(`  المزايا   : ${payload.features.join(", ") || "—"}`);
  console.log(`  المعرّف   : ${payload.licenseId}`);
}

// ==================== inspect ====================
function inspect(): void {
  const file = process.argv[3];
  if (!file || !fs.existsSync(file)) die("الاستخدام: inspect <license-file>");
  const license = decodeLicenseFile(fs.readFileSync(file, "utf8"));
  if (!license) die("تعذّرت قراءة الملفّ (تالف أو ليس ترخيصاً)");
  const publicKey = fs.existsSync(PUBLIC_KEY_PATH) ? fs.readFileSync(PUBLIC_KEY_PATH, "utf8") : "";
  const sigOk = publicKey ? verifyLicenseSignature(license, publicKey) : null;
  console.log(JSON.stringify(license.payload, null, 2));
  console.log("");
  console.log(`التوقيع: ${sigOk === null ? "لا يمكن التحقق (المفتاح العام غير موجود)" : sigOk ? "✓ صالح" : "✗ غير صالح"}`);
}

const cmd = process.argv[2];
if (cmd === "keygen") keygen();
else if (cmd === "issue") issue();
else if (cmd === "inspect") inspect();
else {
  console.log("Laundry ERP — License Generator (أداة المطوّر فقط)");
  console.log("");
  console.log("  keygen                                توليد زوج المفاتيح (مرّة واحدة)");
  console.log("  issue --request <f> --customer <n> [--company <n>] [--type trial|starter|professional|enterprise]");
  console.log("        [--days N | --expiry ISO] [--users N] [--devices N] [--branches N] [--min-version 1.0]");
  console.log("  inspect <license-file>                فحص ترخيص والتحقق من توقيعه");
  process.exit(cmd ? 1 : 0);
}
