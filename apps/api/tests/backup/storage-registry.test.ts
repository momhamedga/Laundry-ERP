import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * سجلّ مزوّدي التخزين.
 *
 * العطل الذي يمنعه: كان الاختيار السحابي وهماً — ثلاثة مزوّدين هياكل فارغة
 * configured=false وpersist() ترمي «SDK integration pending» بلا مستدعٍ أصلاً،
 * فيرى المستخدم اسم مزوّده في القائمة ونسخه على قرص الخادم وحده. هذه
 * الاختبارات تثبت أن الحالة المعروضة تطابق الحقيقة، وأن غياب الإعداد يتراجع
 * إلى المحلّي بدل أن يُسقط إنشاء النسخة.
 */
async function loadRegistry() {
  vi.resetModules();
  const mod = await import("../../src/modules/backup/backup.storage.js");
  return new mod.BackupStorageRegistry();
}

const B2_VARS = ["BACKUP_B2_KEY_ID", "BACKUP_B2_APP_KEY", "BACKUP_B2_BUCKET"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of B2_VARS) saved[k] = process.env[k];
});
afterEach(() => {
  for (const k of B2_VARS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.resetModules();
});

describe("سجلّ مزوّدي تخزين النسخ", () => {
  it("بلا متغيّرات B2: المزوّد غير مُعَدّ ولا يُبلِّغ عن أسرار موجودة", async () => {
    for (const k of B2_VARS) delete process.env[k];
    const registry = await loadRegistry();

    const b2 = registry.statusList().find((p) => p.provider === "BACKBLAZE");
    expect(b2?.configured).toBe(false);
    expect(b2?.credentialsDetected).toBe(false);
  });

  it("بمتغيّرات B2 كاملة: المزوّد مُعَدّ", async () => {
    process.env.BACKUP_B2_KEY_ID = "k";
    process.env.BACKUP_B2_APP_KEY = "s";
    process.env.BACKUP_B2_BUCKET = "b";
    const registry = await loadRegistry();

    const b2 = registry.statusList().find((p) => p.provider === "BACKBLAZE");
    expect(b2?.configured).toBe(true);
  });

  it("متغيّر ناقص واحد لا يجعله مُعَدّاً جزئياً", async () => {
    process.env.BACKUP_B2_KEY_ID = "k";
    process.env.BACKUP_B2_APP_KEY = "s";
    delete process.env.BACKUP_B2_BUCKET;
    const registry = await loadRegistry();

    expect(registry.statusList().find((p) => p.provider === "BACKBLAZE")?.configured).toBe(false);
  });

  it("المحلّي مُعَدّ دائماً — لا يعتمد على شيء", async () => {
    const registry = await loadRegistry();
    const local = registry.statusList().find((p) => p.provider === "LOCAL");
    expect(local?.configured).toBe(true);
  });

  it("لم يعد يعرض S3 ولا R2 — خيارٌ لا يعمل أسوأ من غيابه", async () => {
    const registry = await loadRegistry();
    const providers = registry.statusList().map((p) => p.provider);
    expect(providers).toEqual(["LOCAL", "BACKBLAZE"]);
  });

  it("سجلٌّ قديم بمزوّد لم يعد مدعوماً يُعامَل كمحلّي بدل أن يُسقط الطلب", async () => {
    const registry = await loadRegistry();
    expect(registry.get("S3").provider).toBe("LOCAL");
    expect(registry.get("R2").provider).toBe("LOCAL");
  });

  it("فحص السحابة بلا إعداد يُبلِّغ «غير مُعَدّ» لا «فشل»", async () => {
    for (const k of B2_VARS) delete process.env[k];
    const registry = await loadRegistry();

    const result = await registry.probeCloud();
    expect(result).toEqual({ configured: false, ok: false, error: null });
  });
});
