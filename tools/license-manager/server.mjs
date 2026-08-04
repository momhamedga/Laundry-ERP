/**
 * Laundry ERP — License Manager (أداة المطوّر فقط — لا تُشحن للعميل).
 *
 * واجهة رسومية محلّية لإدارة دورة حياة التراخيص: إصدار، تجديد، إلغاء، تصدير،
 * بحث، وسجلّ كامل. تعمل على 127.0.0.1 فقط ولا تتصل بأي شبكة خارجية.
 *
 * تشارك **نفس** زوج المفاتيح مع license-generator — لا يوجد مفتاح خاص ثانٍ.
 *
 * التشغيل:  node tools/license-manager/server.mjs
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const KEYS = path.join(ROOT, "tools", "license-generator", "keys");
const PRIVATE_KEY_PATH = path.join(KEYS, "private-key.pem");
const PUBLIC_KEY_PATH = path.join(KEYS, "public-key.pem");
const DATA_DIR = path.join(HERE, "data");
const REGISTRY = path.join(DATA_DIR, "registry.json");
const OUT_DIR = path.join(DATA_DIR, "issued");
const PORT = Number(process.env.LM_PORT ?? 7788);

const sdk = await import(
  pathToFileURL(path.join(ROOT, "packages", "license-sdk", "dist", "index.js")).href
);
const { LICENSE_PRESETS, UNLIMITED, signPayload, verifyLicenseSignature, encodeLicenseFile, decodeLicenseFile, validateLicense, getMachineFingerprint } = sdk;

// ==================== السجلّ المحلّي ====================

/**
 * كل ترخيص صدر يُسجَّل هنا. هذا هو المصدر الوحيد لمعرفة من اشترى ماذا ومتى
 * ينتهي — لا يوجد خادم يحفظ ذلك نيابةً عنك.
 */
function loadRegistry() {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
  } catch {
    return { version: 1, licenses: [] };
  }
}

function saveRegistry(reg) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  // كتابة ذرّية: ملفّ مؤقت ثم إعادة تسمية — انقطاع الكهرباء لا يُتلف السجلّ
  const tmp = `${REGISTRY}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(reg, null, 2), "utf8");
  fs.renameSync(tmp, REGISTRY);
}

function backupRegistry() {
  if (!fs.existsSync(REGISTRY)) return;
  const dir = path.join(DATA_DIR, "backups");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.copyFileSync(REGISTRY, path.join(dir, `registry-${stamp}.json`));
  // نُبقي آخر 30 نسخة
  const files = fs.readdirSync(dir).filter((f) => f.startsWith("registry-")).sort();
  for (const f of files.slice(0, Math.max(0, files.length - 30))) {
    fs.unlinkSync(path.join(dir, f));
  }
}

// ==================== إصدار ====================

const DAY = 86_400_000;

function keysExist() {
  return fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH);
}

function issueLicense({ request, customerName, companyName, type, days, expiry, users, devices, branches, minAppVersion, notes, price }) {
  if (!keysExist()) throw new Error("زوج المفاتيح غير موجود — شغّل: node tools/license-generator/dist/cli.js keygen");
  const preset = LICENSE_PRESETS[type];
  if (!preset) throw new Error(`نوع ترخيص غير معروف: ${type}`);
  if (!customerName) throw new Error("اسم العميل مطلوب");
  if (!request?.machineId || !request?.fullHash || !request?.components) {
    throw new Error("طلب التفعيل غير صالح — يجب أن يحتوي machineId و fullHash و components");
  }

  let expiryDate = null;
  if (expiry) expiryDate = new Date(expiry).toISOString();
  else if (days) expiryDate = new Date(Date.now() + Number(days) * DAY).toISOString();
  else if (preset.trialDays) expiryDate = new Date(Date.now() + preset.trialDays * DAY).toISOString();

  const num = (v, d) => (v === undefined || v === null || v === "" ? d : Number(v));

  const payload = {
    schema: 1,
    licenseId: crypto.randomUUID(),
    customerName,
    companyName: companyName || customerName,
    type,
    expiryDate,
    issueDate: new Date().toISOString(),
    maxUsers: num(users, preset.maxUsers),
    maxDevices: num(devices, preset.maxDevices),
    maxBranches: num(branches, preset.maxBranches),
    features: preset.features,
    minAppVersion: minAppVersion || "1.0",
    machine: { machineId: request.machineId, fullHash: request.fullHash, components: request.components },
  };

  const license = {
    payload,
    signature: signPayload(payload, fs.readFileSync(PRIVATE_KEY_PATH, "utf8")),
    algorithm: "RSA-SHA256",
  };

  // تحقّق ذاتي — لا نُسلّم ترخيصاً لا يمرّ تحقّقنا نحن
  if (!verifyLicenseSignature(license, fs.readFileSync(PUBLIC_KEY_PATH, "utf8"))) {
    throw new Error("فشل التحقّق الذاتي من التوقيع — لم يُصدَر الترخيص");
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const safe = customerName.replace(/[^\w؀-ۿ-]+/g, "_").slice(0, 40);
  const fileName = `${safe}-${type}-${payload.licenseId.slice(0, 8)}.lkey`;
  fs.writeFileSync(path.join(OUT_DIR, fileName), encodeLicenseFile(license), "utf8");

  const reg = loadRegistry();
  backupRegistry();
  reg.licenses.push({
    licenseId: payload.licenseId,
    customerName,
    companyName: payload.companyName,
    type,
    machineId: request.machineId,
    issueDate: payload.issueDate,
    expiryDate,
    maxUsers: payload.maxUsers,
    maxDevices: payload.maxDevices,
    maxBranches: payload.maxBranches,
    status: "active",
    fileName,
    notes: notes || "",
    price: price || "",
    history: [{ at: payload.issueDate, action: "issued", note: "إصدار أوّل" }],
  });
  saveRegistry(reg);

  return { payload, fileName };
}

function renewLicense({ licenseId, days, expiry, notes, price }) {
  const reg = loadRegistry();
  const prev = reg.licenses.find((l) => l.licenseId === licenseId);
  if (!prev) throw new Error("الترخيص غير موجود في السجلّ");
  if (prev.status === "revoked") throw new Error("هذا الترخيص ملغى — لا يُجدَّد. أصدر ترخيصاً جديداً إن كنت تقصد ذلك.");

  // نعيد بناء طلب التفعيل من الترخيص السابق (نفس الجهاز)
  const file = path.join(OUT_DIR, prev.fileName);
  if (!fs.existsSync(file)) throw new Error(`ملفّ الترخيص السابق مفقود: ${prev.fileName}`);
  const old = decodeLicenseFile(fs.readFileSync(file, "utf8"));
  if (!old) throw new Error("تعذّر قراءة الترخيص السابق");

  const out = issueLicense({
    request: old.payload.machine,
    customerName: prev.customerName,
    companyName: prev.companyName,
    type: prev.type,
    days,
    expiry,
    users: prev.maxUsers,
    devices: prev.maxDevices,
    branches: prev.maxBranches,
    minAppVersion: old.payload.minAppVersion,
    notes: notes || `تجديد للترخيص ${licenseId.slice(0, 8)}`,
    price,
  });

  const reg2 = loadRegistry();
  const oldRow = reg2.licenses.find((l) => l.licenseId === licenseId);
  oldRow.status = "renewed";
  oldRow.renewedBy = out.payload.licenseId;
  oldRow.history.push({ at: new Date().toISOString(), action: "renewed", note: `استُبدل بـ ${out.payload.licenseId.slice(0, 8)}` });
  const newRow = reg2.licenses.find((l) => l.licenseId === out.payload.licenseId);
  newRow.renewalOf = licenseId;
  saveRegistry(reg2);

  return out;
}

/**
 * الإلغاء **محلّي في هذا السجلّ فقط**.
 *
 * لا توجد قناة تصل لجهاز عميل مُفعَّل في نظام يعمل دون إنترنت، فالترخيص الذي
 * سُلّم يبقى صالحاً على جهازه حتى تاريخ انتهائه. فائدة الإلغاء هنا: يمنعك
 * المدير من تجديده، ويظهر بوضوح في البحث والسجلّ.
 */
function revokeLicense({ licenseId, reason }) {
  const reg = loadRegistry();
  const row = reg.licenses.find((l) => l.licenseId === licenseId);
  if (!row) throw new Error("الترخيص غير موجود في السجلّ");
  if (row.status === "revoked") throw new Error("الترخيص ملغى بالفعل");
  backupRegistry();
  row.status = "revoked";
  row.revokedAt = new Date().toISOString();
  row.revokeReason = reason || "";
  row.history.push({ at: row.revokedAt, action: "revoked", note: reason || "" });
  saveRegistry(reg);
  return row;
}

/** حالة محسوبة للعرض (السجلّ لا يخزّن "منتهٍ" — يُحسب من التاريخ). */
function decorate(row) {
  const now = Date.now();
  let effective = row.status;
  let daysRemaining = null;
  if (row.expiryDate) {
    daysRemaining = Math.ceil((new Date(row.expiryDate).getTime() - now) / DAY);
    if (row.status === "active" && daysRemaining <= 0) effective = "expired";
    else if (row.status === "active" && daysRemaining <= 30) effective = "expiring";
  }
  return { ...row, effective, daysRemaining };
}

// ==================== HTTP ====================

function json(res, code, body) {
  const s = JSON.stringify(body);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(s) });
  res.end(s);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = "";
    req.on("data", (c) => {
      d += c;
      if (d.length > 5e6) reject(new Error("الطلب كبير جداً"));
    });
    req.on("end", () => {
      try {
        resolve(d ? JSON.parse(d) : {});
      } catch {
        reject(new Error("JSON غير صالح"));
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const p = url.pathname;

  try {
    if (p === "/" || p === "/index.html") {
      const html = fs.readFileSync(path.join(HERE, "ui.html"), "utf8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(html);
    }

    if (p === "/api/state" && req.method === "GET") {
      const reg = loadRegistry();
      return json(res, 200, {
        keysReady: keysExist(),
        presets: LICENSE_PRESETS,
        unlimited: UNLIMITED,
        licenses: reg.licenses.map(decorate).reverse(),
      });
    }

    if (p === "/api/issue" && req.method === "POST") {
      const b = await readBody(req);
      const out = issueLicense(b);
      return json(res, 200, { ok: true, ...out });
    }

    if (p === "/api/renew" && req.method === "POST") {
      const b = await readBody(req);
      const out = renewLicense(b);
      return json(res, 200, { ok: true, ...out });
    }

    if (p === "/api/revoke" && req.method === "POST") {
      const b = await readBody(req);
      return json(res, 200, { ok: true, row: revokeLicense(b) });
    }

    /** يتحقّق من ملفّ ترخيص كما يفعل التطبيق تماماً — للتشخيص عند شكوى عميل. */
    if (p === "/api/verify" && req.method === "POST") {
      const { content } = await readBody(req);
      const lic = decodeLicenseFile(String(content ?? ""));
      if (!lic) return json(res, 200, { ok: true, valid: false, reason: "malformed", message: "الملفّ تالف أو ليس ترخيصاً" });
      const fp = { machineId: lic.payload.machine.machineId, fullHash: lic.payload.machine.fullHash, components: lic.payload.machine.components };
      const st = validateLicense({
        license: lic,
        publicKeyPem: fs.readFileSync(PUBLIC_KEY_PATH, "utf8"),
        fingerprint: fp, // نتحقّق كأننا على جهاز العميل نفسه
        appVersion: "99.0.0",
      });
      return json(res, 200, { ok: true, ...st });
    }

    if (p === "/api/download") {
      const file = url.searchParams.get("file") ?? "";
      // لا نسمح بالخروج من مجلّد الإصدار
      const safe = path.basename(file);
      const full = path.join(OUT_DIR, safe);
      if (!fs.existsSync(full)) return json(res, 404, { ok: false, error: "الملفّ غير موجود" });
      res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(safe)}"`,
      });
      return res.end(fs.readFileSync(full));
    }

    if (p === "/api/machine-id" && req.method === "GET") {
      return json(res, 200, { ok: true, machineId: getMachineFingerprint().machineId });
    }

    json(res, 404, { ok: false, error: "غير موجود" });
  } catch (err) {
    json(res, 400, { ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// 127.0.0.1 فقط — لا يُصغي على الشبكة إطلاقاً
server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n  Laundry ERP — License Manager`);
  console.log(`  افتح: http://127.0.0.1:${PORT}\n`);
  console.log(`  السجلّ  : ${REGISTRY}`);
  console.log(`  التراخيص: ${OUT_DIR}`);
  console.log(`  المفاتيح: ${keysExist() ? "جاهزة ✓" : "غير موجودة ✗ — شغّل keygen أولاً"}\n`);
});

export { issueLicense, renewLicense, revokeLicense, loadRegistry, saveRegistry, decorate, REGISTRY, OUT_DIR };
