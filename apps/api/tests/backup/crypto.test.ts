import { gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * تشفير النسخ الاحتياطية.
 *
 * العطل الذي يعالجه: كان `encryptionEnabled` معروضاً وقابلاً للتفعيل بينما
 * الشيفرة تكتب `encrypted: false` نصّاً ثابتاً ولا تشفّر شيئاً — فمن يفعّله
 * يظنّ ملفّه محميّاً وهو نصٌّ صريح بأسماء العملاء وهواتفهم وفواتيرهم.
 *
 * لذلك لا يكفي أن تمرّ دورة تشفير/فكّ: يجب أن يثبت أن النصّ الصريح **غائب**
 * فعلاً من الناتج، وأن مفتاحاً خاطئاً أو ملفاً معدَّلاً يُرفَض لا يُقبَل بصمت.
 */
const KEY_VAR = "BACKUP_ENCRYPTION_KEY";
let savedKey: string | undefined;

async function loadCrypto() {
  vi.resetModules();
  return import("../../src/modules/backup/backup.crypto.js");
}

/** يشفّر نصّاً عبر الواجهة المتدفّقة نفسها التي تستخدمها الخدمة */
async function encrypt(plain: string, mod: Awaited<ReturnType<typeof loadCrypto>>) {
  const { header, cipher, readAuthTag } = mod.createEncryptor();
  const chunks: Buffer[] = [];
  cipher.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((resolve) => cipher.on("end", () => resolve()));
  cipher.end(Buffer.from(plain, "utf8"));
  await done;
  return Buffer.concat([header, ...chunks, readAuthTag()]);
}

beforeEach(() => {
  savedKey = process.env[KEY_VAR];
  process.env[KEY_VAR] = "مفتاح-اختبار-قوي-جداً-1234567890";
});
afterEach(() => {
  if (savedKey === undefined) delete process.env[KEY_VAR];
  else process.env[KEY_VAR] = savedKey;
  vi.resetModules();
});

describe("تشفير النسخ الاحتياطية", () => {
  it("النصّ الصريح غائب فعلاً عن الملف المشفَّر", async () => {
    const mod = await loadCrypto();
    const plain = JSON.stringify({ customers: [{ name: "محمد جمال سلامة", phone: "01214115724" }] });

    const encrypted = await encrypt(plain, mod);
    const asText = encrypted.toString("utf8");
    const asLatin = encrypted.toString("latin1");

    for (const needle of ["محمد جمال سلامة", "01214115724", "customers"]) {
      expect(asText.includes(needle), `«${needle}» ظاهر في الملف المشفَّر`).toBe(false);
      expect(asLatin.includes(needle)).toBe(false);
    }
  });

  it("دورة كاملة: يُفكّ إلى النصّ الأصلي حرفياً", async () => {
    const mod = await loadCrypto();
    const plain = JSON.stringify({ orders: [{ id: "o1", total: 500 }], عربي: "نصّ" });

    const round = mod.decryptBackup(await encrypt(plain, mod)).toString("utf8");
    expect(round).toBe(plain);
  });

  it("ملفّان لنفس المحتوى يختلفان — لا يُستدلّ على التكرار", async () => {
    const mod = await loadCrypto();
    const plain = "نفس المحتوى تماماً";

    const a = await encrypt(plain, mod);
    const b = await encrypt(plain, mod);
    expect(a.equals(b)).toBe(false);
    expect(mod.decryptBackup(a).toString("utf8")).toBe(plain);
    expect(mod.decryptBackup(b).toString("utf8")).toBe(plain);
  });

  it("مفتاح مختلف لا يفكّ الملف", async () => {
    const mod = await loadCrypto();
    const encrypted = await encrypt("سرّي", mod);

    process.env[KEY_VAR] = "مفتاح-آخر-مختلف-تماماً";
    const other = await loadCrypto();
    expect(() => other.decryptBackup(encrypted)).toThrow(/المفتاح غير مطابق|تالف/);
  });

  it("تعديل بايت واحد في الملف يُكتشف ولا يمرّ", async () => {
    const mod = await loadCrypto();
    const encrypted = await encrypt("بيانات مهمّة", mod);

    const tampered = Buffer.from(encrypted);
    const mid = Math.floor(tampered.length / 2);
    tampered[mid] = tampered[mid]! ^ 0x01; // قلب بت واحد

    expect(() => mod.decryptBackup(tampered)).toThrow();
  });

  it("قطع الوسم من آخر الملف يُكتشف", async () => {
    const mod = await loadCrypto();
    const encrypted = await encrypt("بيانات", mod);

    expect(() => mod.decryptBackup(encrypted.subarray(0, encrypted.length - 4))).toThrow();
  });

  it("يميّز الملف المشفَّر عن الصريح وعن المضغوط", async () => {
    const mod = await loadCrypto();
    const encrypted = await encrypt("{}", mod);

    expect(mod.isEncryptedBackup(encrypted)).toBe(true);
    expect(mod.isEncryptedBackup(Buffer.from('{"a":1}', "utf8"))).toBe(false);
    expect(mod.isEncryptedBackup(gzipSync(Buffer.from('{"a":1}')))).toBe(false);
  });

  it("غياب المفتاح يمنع التشفير برسالة صريحة لا بملف صريح", async () => {
    delete process.env[KEY_VAR];
    const mod = await loadCrypto();

    expect(mod.hasEncryptionKey()).toBe(false);
    expect(() => mod.createEncryptor()).toThrow(/BACKUP_ENCRYPTION_KEY/);
  });

  it("canDecrypt يميّز المفتاح الصالح من غيره", async () => {
    const mod = await loadCrypto();
    const encrypted = await encrypt("x", mod);
    expect(mod.canDecrypt(encrypted)).toBe(true);

    process.env[KEY_VAR] = "مفتاح-غلط";
    const other = await loadCrypto();
    expect(other.canDecrypt(encrypted)).toBe(false);
  });
});
