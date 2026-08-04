/**
 * اختبارات نظام الترخيص (Phase 15B) — تعمل على dist المبنيّ فعلاً، أي نفس
 * الشيفرة التي تُشحن للعميل، لا على مصدر منفصل.
 *
 * التشغيل: node --test test/
 */
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  canonicalize,
  decodeLicenseFile,
  encodeLicenseFile,
  generateKeyPair,
  getMachineFingerprint,
  hasFeature,
  scoreMatch,
  signPayload,
  validateLicense,
  verifyLicenseSignature,
  GRACE_PERIOD_DAYS,
  MACHINE_MATCH_THRESHOLD,
} from "../dist/index.js";

const DAY = 86_400_000;

// زوج مفاتيح واحد لكل الاختبارات (توليد RSA-4096 مكلف — ~ثوانٍ لكل زوج)
const KEYS = generateKeyPair();
const OTHER = generateKeyPair();

/** مكوّنات جهاز وهمية قابلة للتحكّم (بدل قراءة العتاد الحقيقي) */
function machineComponents(seed = "A") {
  return {
    machineGuid: `guid-${seed}`,
    baseboardSerial: `board-${seed}`,
    systemUuid: `uuid-${seed}`,
    cpuId: `cpu-${seed}`,
    diskSerial: `disk-${seed}`,
  };
}

const FP = getMachineFingerprint(machineComponents("A"));

function makePayload(over = {}) {
  return {
    schema: 1,
    licenseId: "LIC-TEST-0001",
    customerName: "مغسلة الاختبار",
    companyName: "Test Laundry",
    type: "professional",
    expiryDate: new Date(Date.now() + 365 * DAY).toISOString(),
    issueDate: new Date(Date.now() - DAY).toISOString(),
    maxUsers: 10,
    maxDevices: 3,
    maxBranches: 2,
    features: ["pos", "reports", "inventory"],
    minAppVersion: "1.0",
    machine: { machineId: FP.machineId, fullHash: FP.fullHash, components: FP.components },
    ...over,
  };
}

function makeLicense(over = {}, key = KEYS.privateKey) {
  const payload = makePayload(over);
  return { payload, signature: signPayload(payload, key), algorithm: "RSA-SHA256" };
}

const baseInput = (license, extra = {}) => ({
  license,
  publicKeyPem: KEYS.publicKey,
  fingerprint: FP,
  appVersion: "2.0.0",
  now: new Date(),
  ...extra,
});

// ==================== 1. التحقق من الترخيص ====================
test("1. License Verification — ترخيص سليم يُقبل بكل حقوله", () => {
  const s = validateLicense(baseInput(makeLicense()));
  assert.equal(s.valid, true, s.message);
  assert.equal(s.reason, undefined);
  assert.equal(s.machineScore, 5);
  assert.equal(s.inGrace, false);
  assert.ok(s.daysRemaining > 360 && s.daysRemaining <= 365);
  assert.equal(s.payload.customerName, "مغسلة الاختبار");
  assert.equal(hasFeature(s, "pos"), true);
  assert.equal(hasFeature(s, "multi_branch_unlimited"), false);
});

test("1b. ترخيص دائم (expiryDate=null) صالح بلا أيام متبقّية", () => {
  const s = validateLicense(baseInput(makeLicense({ expiryDate: null })));
  assert.equal(s.valid, true, s.message);
  assert.equal(s.daysRemaining, null);
});

test("1c. غياب الترخيص = no_license داخل السماح", () => {
  const s = validateLicense(baseInput(null));
  assert.equal(s.valid, false);
  assert.equal(s.reason, "no_license");
  assert.equal(s.inGrace, true);
});

// ==================== 2. توقيع RSA ====================
test("2. RSA Signature — توقيع صحيح يُقبل، ومفتاح عام آخر يُرفض", () => {
  const lic = makeLicense();
  assert.equal(verifyLicenseSignature(lic, KEYS.publicKey), true);
  assert.equal(verifyLicenseSignature(lic, OTHER.publicKey), false);
});

test("2b. المفتاح 4096-bit والتوقيع 512 بايت وSHA-256", () => {
  const pub = crypto.createPublicKey(KEYS.publicKey);
  assert.equal(pub.asymmetricKeyDetails.modulusLength, 4096);
  assert.equal(Buffer.from(makeLicense().signature, "base64").length, 512);
});

test("2c. ترخيص موقَّع بمفتاح خاص مزوَّر يُرفض", () => {
  const s = validateLicense(baseInput(makeLicense({}, OTHER.privateKey)));
  assert.equal(s.valid, false);
  assert.equal(s.reason, "signature_invalid");
});

test("2d. تغيير حقل algorithm يُرفض (لا تفاوض على الخوارزمية)", () => {
  const lic = makeLicense();
  lic.algorithm = "none";
  assert.equal(verifyLicenseSignature(lic, KEYS.publicKey), false);
});

test("2e. canonicalize مستقرّ مهما اختلف ترتيب المفاتيح", () => {
  assert.equal(canonicalize({ b: 1, a: { d: 2, c: 3 } }), canonicalize({ a: { c: 3, d: 2 }, b: 1 }));
});

// ==================== 3. بصمة الجهاز ====================
test("3. Machine Fingerprint — حتمية، مُهَشَّمة، وبصيغة LAU-XXXX-XXXX-XXXX", () => {
  const a = getMachineFingerprint(machineComponents("A"));
  const b = getMachineFingerprint(machineComponents("A"));
  assert.equal(a.fullHash, b.fullHash);
  assert.equal(a.machineId, b.machineId);
  assert.match(a.machineId, /^LAU-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  // لا تسرّب: لا تظهر أي قيمة عتاد خام في المخرجات
  const dump = JSON.stringify(a);
  assert.ok(!dump.includes("guid-A") && !dump.includes("disk-A"));
  for (const h of Object.values(a.components)) assert.match(h, /^[0-9a-f]{64}$/);
});

test("3b. جهاز مختلف ⇒ بصمة مختلفة", () => {
  assert.notEqual(getMachineFingerprint(machineComponents("B")).fullHash, FP.fullHash);
});

test("3c. مطابقة بالنقاط: 5/5 و4/5 و3/5 تُقبل، 2/5 تُرفض", () => {
  const target = FP.components;
  for (const changed of [0, 1, 2]) {
    const c = machineComponents("A");
    const keys = ["diskSerial", "cpuId", "baseboardSerial"];
    for (let i = 0; i < changed; i++) c[keys[i]] = `${keys[i]}-NEW`;
    const score = scoreMatch(getMachineFingerprint(c).components, target);
    assert.equal(score, 5 - changed);
    assert.ok(score >= MACHINE_MATCH_THRESHOLD);
  }
  const c = machineComponents("A");
  c.diskSerial = "x"; c.cpuId = "y"; c.baseboardSerial = "z";
  assert.equal(scoreMatch(getMachineFingerprint(c).components, target), 2);
});

test("3d. استبدال قرص + معالج (3/5) لا يزال يشغّل النظام", () => {
  const c = machineComponents("A");
  c.diskSerial = "NEW-DISK";
  c.cpuId = "NEW-CPU";
  const s = validateLicense(baseInput(makeLicense(), { fingerprint: getMachineFingerprint(c) }));
  assert.equal(s.valid, true, s.message);
  assert.equal(s.machineScore, 3);
});

// ==================== 4. ترخيص منتهٍ ====================
test("4. Expired License — يُرفض بسبب expired مع بقاء السماح", () => {
  const s = validateLicense(
    baseInput(makeLicense({
      issueDate: new Date(Date.now() - 400 * DAY).toISOString(),
      expiryDate: new Date(Date.now() - 2 * DAY).toISOString(),
    })),
  );
  assert.equal(s.valid, false);
  assert.equal(s.reason, "expired");
  assert.equal(s.daysRemaining, 0);
  assert.equal(s.inGrace, true);
});

test("4b. فترة السماح تنتهي بعد GRACE_PERIOD_DAYS فيُحجب", () => {
  const lic = makeLicense({ expiryDate: new Date(Date.now() - 2 * DAY).toISOString() });
  const started = new Date(Date.now() - (GRACE_PERIOD_DAYS + 1) * DAY);
  const s = validateLicense(baseInput(lic, { graceStartedAt: started }));
  assert.equal(s.valid, false);
  assert.equal(s.inGrace, false);
  assert.equal(s.graceDaysRemaining, 0);
});

test("4c. داخل السماح: الأيام المتبقّية تتناقص بشكل صحيح", () => {
  const lic = makeLicense({ expiryDate: new Date(Date.now() - 2 * DAY).toISOString() });
  const s = validateLicense(baseInput(lic, { graceStartedAt: new Date(Date.now() - 4 * DAY) }));
  assert.equal(s.inGrace, true);
  assert.equal(s.graceDaysRemaining, GRACE_PERIOD_DAYS - 4);
});

test("4d. إرجاع ساعة النظام يُكشَف (clock_tampered) قبل أي فحص زمني", () => {
  const lic = makeLicense({ expiryDate: new Date(Date.now() - 30 * DAY).toISOString() });
  const s = validateLicense(
    baseInput(lic, { now: new Date(Date.now() - 60 * DAY), lastSeen: new Date() }),
  );
  assert.equal(s.valid, false);
  assert.equal(s.reason, "clock_tampered");
});

test("4e. تاريخ إصدار في المستقبل ⇒ not_yet_valid", () => {
  const s = validateLicense(baseInput(makeLicense({ issueDate: new Date(Date.now() + 10 * DAY).toISOString() })));
  assert.equal(s.valid, false);
  assert.equal(s.reason, "not_yet_valid");
});

// ==================== 5. ترخيص تالف ====================
test("5. Corrupted License — نصّ عشوائي/base64 مقطوع/JSON ناقص يُعاد null بلا رمي", () => {
  for (const bad of [
    "",
    "not a license at all",
    "-----BEGIN LAUNDRY ERP LICENSE-----\n!!!not-base64!!!\n-----END LAUNDRY ERP LICENSE-----",
    Buffer.from("{ broken json").toString("base64"),
    Buffer.from(JSON.stringify({ payload: {} })).toString("base64"),
  ]) {
    assert.equal(decodeLicenseFile(bad), null, `يجب رفض: ${bad.slice(0, 20)}`);
  }
});

test("5b. ترخيص مبتور (نصف الملفّ) لا يُقبل", () => {
  const text = encodeLicenseFile(makeLicense());
  assert.equal(decodeLicenseFile(text.slice(0, Math.floor(text.length / 2))), null);
});

// ==================== 6. جهاز خاطئ ====================
test("6. Wrong Machine — ترخيص جهاز آخر يُرفض بـ machine_mismatch", () => {
  const s = validateLicense(baseInput(makeLicense(), { fingerprint: getMachineFingerprint(machineComponents("B")) }));
  assert.equal(s.valid, false);
  assert.equal(s.reason, "machine_mismatch");
  assert.equal(s.machineScore, 0);
  assert.equal(s.inGrace, true);
});

test("6b. نسخ الترخيص لجهاز ثانٍ لا يُفعّله (منع النسخ)", () => {
  const copied = decodeLicenseFile(encodeLicenseFile(makeLicense()));
  const s = validateLicense(baseInput(copied, { fingerprint: getMachineFingerprint(machineComponents("C")) }));
  assert.equal(s.valid, false);
  assert.equal(s.reason, "machine_mismatch");
});

// ==================== 7. إصدار خاطئ ====================
test("7. Wrong Version — إصدار تطبيق أقدم من minAppVersion يُرفض", () => {
  const s = validateLicense(baseInput(makeLicense({ minAppVersion: "3.0" }), { appVersion: "2.0.0" }));
  assert.equal(s.valid, false);
  assert.equal(s.reason, "version_unsupported");
});

test("7b. إصدار أحدث أو مساوٍ يُقبل", () => {
  for (const [min, appv] of [["2.0", "2.0.0"], ["1.4", "2.0.0"], ["2.0", "2.1.5"]]) {
    const s = validateLicense(baseInput(makeLicense({ minAppVersion: min }), { appVersion: appv }));
    assert.equal(s.valid, true, `${appv} يجب أن يقبل ${min}: ${s.message}`);
  }
});

// ==================== 8. ترخيص مكرَّر ====================
test("8. Duplicate License — نفس الحمولة تُنتج نفس التوقيع بالضبط (حتمية)", () => {
  const p = makePayload();
  assert.equal(signPayload(p, KEYS.privateKey), signPayload(p, KEYS.privateKey));
});

test("8b. استيراد نفس الترخيص مرّتين لا يغيّر النتيجة (idempotent)", () => {
  const text = encodeLicenseFile(makeLicense());
  const a = validateLicense(baseInput(decodeLicenseFile(text)));
  const b = validateLicense(baseInput(decodeLicenseFile(text)));
  assert.equal(a.valid, true);
  assert.deepEqual(a.payload, b.payload);
});

// ==================== 9. الاستيراد/التصدير ====================
test("9. Import/Export — دورة ترميز/فكّ كاملة بلا فقد بيانات", () => {
  const lic = makeLicense();
  const text = encodeLicenseFile(lic);
  assert.ok(text.includes("-----BEGIN LAUNDRY ERP LICENSE-----"));
  assert.ok(text.includes("-----END LAUNDRY ERP LICENSE-----"));
  const back = decodeLicenseFile(text);
  assert.deepEqual(back.payload, lic.payload);
  assert.equal(back.signature, lic.signature);
  assert.equal(validateLicense(baseInput(back)).valid, true);
});

test("9b. الملفّ يتحمّل مسافات/أسطر إضافية من النسخ واللصق في البريد", () => {
  const text = encodeLicenseFile(makeLicense());
  const messy = `\r\n  ${text.replace(/\n/g, "\r\n")}  \r\n\r\n`;
  const back = decodeLicenseFile(messy);
  assert.ok(back, "يجب قبول الملفّ رغم فوضى المسافات");
  assert.equal(validateLicense(baseInput(back)).valid, true);
});

// ==================== 10. كشف التلاعب ====================
test("10. Tampering — تمديد تاريخ الانتهاء يدوياً يُكشَف", () => {
  const lic = makeLicense();
  lic.payload.expiryDate = new Date(Date.now() + 9999 * DAY).toISOString();
  const s = validateLicense(baseInput(lic));
  assert.equal(s.valid, false);
  assert.equal(s.reason, "signature_invalid");
});

test("10b. رفع الحدود (maxUsers/maxBranches) يُكشَف", () => {
  for (const field of ["maxUsers", "maxDevices", "maxBranches"]) {
    const lic = makeLicense();
    lic.payload[field] = 9999;
    assert.equal(validateLicense(baseInput(lic)).reason, "signature_invalid", field);
  }
});

test("10c. ترقية النوع أو إضافة ميزة يُكشَف", () => {
  const a = makeLicense();
  a.payload.type = "enterprise";
  assert.equal(validateLicense(baseInput(a)).reason, "signature_invalid");
  const b = makeLicense();
  b.payload.features.push("multi_branch_unlimited");
  assert.equal(validateLicense(baseInput(b)).reason, "signature_invalid");
});

test("10d. استبدال بصمة الجهاز داخل الحمولة يُكشَف (لا سرقة ترخيص)", () => {
  const lic = makeLicense();
  const other = getMachineFingerprint(machineComponents("Z"));
  lic.payload.machine = { machineId: other.machineId, fullHash: other.fullHash, components: other.components };
  const s = validateLicense(baseInput(lic, { fingerprint: other }));
  assert.equal(s.valid, false);
  assert.equal(s.reason, "signature_invalid");
});

test("10e. قلب بت واحد في التوقيع يُكشَف", () => {
  const lic = makeLicense();
  const raw = Buffer.from(lic.signature, "base64");
  raw[0] ^= 0x01;
  lic.signature = raw.toString("base64");
  assert.equal(verifyLicenseSignature(lic, KEYS.publicKey), false);
});

test("10f. حذف التوقيع أو تفريغه يُرفض (لا يمرّ الفراغ)", () => {
  for (const sig of ["", null, undefined, "AAAA"]) {
    const lic = makeLicense();
    lic.signature = sig;
    assert.equal(verifyLicenseSignature(lic, KEYS.publicKey), false, `sig=${sig}`);
  }
});

test("10g. التوقيع يُفحص قبل كل شيء — ترخيص مُعدَّل لجهاز خاطئ يُبلّغ عن التوقيع لا الجهاز", () => {
  const lic = makeLicense();
  lic.payload.customerName = "مهاجم";
  const s = validateLicense(baseInput(lic, { fingerprint: getMachineFingerprint(machineComponents("Q")) }));
  assert.equal(s.reason, "signature_invalid");
});
