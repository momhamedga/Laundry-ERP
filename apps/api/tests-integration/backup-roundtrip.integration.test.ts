import type { Express } from "express";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { BACKUP_TABLES } from "../src/modules/backup/backup.tables.js";
import { prisma, resetDatabase } from "./setup/db.js";
import { api, bearer, makeApp, resetRateLimiters, seedAndLogin } from "./setup/harness.js";

/**
 * دورة كاملة للنسخ الاحتياطي: تصدير ← حذف ← استعادة ← تحقّق.
 *
 * العطل الذي يمنعه: كانت النسخة تصدّر 10 جداول من 48، فتبدو ناجحة بينما
 * تُسقط عند الاستعادة الفواتير والمخزون والمشتريات والرواتب والإغلاق المحاسبي.
 * لا يظهر ذلك إلا يوم الكارثة — أي بعد فوات الأوان. هنا يظهر في كل دفعة.
 *
 * الاختبار يُنشئ بيانات في جداول من كل عائلة، ثم يحذفها فعلياً، ثم يستعيدها
 * من الملف نفسه، ويقارن العدد قبل وبعد. لا Mock: قاعدة PostgreSQL حقيقية
 * وHTTP حقيقي عبر نفس مسارات الـAPI.
 */
describe("backup round-trip (integration)", () => {
  let app: Express;
  let adminToken: string;

  beforeEach(async () => {
    await resetDatabase();
    await resetRateLimiters();
    app = makeApp();
    adminToken = (await seedAndLogin(app, "ADMIN", "bk")).accessToken;
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  /** بيانات تمسّ عائلات مختلفة: تجارة، مخزون، مشتريات، ولاء، موارد بشرية */
  async function seedBusinessData() {
    const branch = await prisma.branch.create({
      data: { name: "فرع الاختبار", address: "ش. الاختبار", phone: "0100000000" },
    });
    const customer = await prisma.customer.create({
      data: { name: "عميل الاختبار", phone: `0111${Date.now().toString().slice(-7)}` },
    });
    const category = await prisma.serviceCategory.create({ data: { name: "تصنيف الاختبار" } });
    const service = await prisma.service.create({
      data: { name: "غسيل اختبار", price: 100, categoryId: category.id, unit: "PIECE" },
    });
    const supplier = await prisma.supplier.create({
      data: { name: "مورّد الاختبار", phone: "0122222222" },
    });
    const item = await prisma.inventoryItem.create({
      data: {
        name: "صنف الاختبار",
        sku: `SKU-${Date.now()}`,
        type: "PRODUCT",
        quantity: 10,
        costPrice: 5,
        supplierId: supplier.id,
      },
    });

    return { branch, customer, category, service, supplier, item };
  }

  it("يصدّر كل جدول مُدرَج في السِجِلّ — لا 10 جداول فقط", async () => {
    await seedBusinessData();

    const res = await api(app).get("/api/v1/backup").set(bearer(adminToken));
    expect(res.status).toBe(200);

    const payload = JSON.parse(res.text) as Record<string, unknown>;
    const missing = BACKUP_TABLES.map((t) => t.key).filter((k) => !(k in payload));

    expect(missing, `مفاتيح غائبة عن ملف النسخة: ${missing.join(", ")}`).toEqual([]);
    expect(payload.metadata).toBeTruthy();
  });

  it("الجداول التي كانت غائبة صارت تحمل بياناتها فعلاً", async () => {
    const seeded = await seedBusinessData();

    const res = await api(app).get("/api/v1/backup").set(bearer(adminToken));
    const payload = JSON.parse(res.text) as Record<string, { id: string }[] | undefined>;
    const ids = (key: string) => (payload[key] ?? []).map((r) => r.id);

    // هذه الثلاثة كانت خارج النسخة تماماً قبل الإصلاح
    expect(ids("suppliers")).toContain(seeded.supplier.id);
    expect(ids("inventoryItems")).toContain(seeded.item.id);
    expect(Array.isArray(payload.invoices)).toBe(true);
  });

  it("الاستعادة تُرجِع صفوفاً حُذفت فعلاً من جدول لم يكن مشمولاً", async () => {
    const seeded = await seedBusinessData();

    const exported = await api(app).get("/api/v1/backup").set(bearer(adminToken));
    expect(exported.status).toBe(200);
    const file = Buffer.from(exported.text, "utf-8");

    // حذف حقيقي — المورّد والصنف اللذان لم تكن النسخة تحملهما أصلاً
    await prisma.inventoryItem.delete({ where: { id: seeded.item.id } });
    await prisma.supplier.delete({ where: { id: seeded.supplier.id } });
    expect(await prisma.supplier.count()).toBe(0);
    expect(await prisma.inventoryItem.count()).toBe(0);

    const restored = await api(app)
      .post("/api/v1/backup/restore")
      .set(bearer(adminToken))
      .set("Content-Type", "application/json")
      .send(file);

    expect(restored.status).toBe(200);
    expect(await prisma.supplier.count()).toBe(1);
    expect(await prisma.inventoryItem.count()).toBe(1);

    const back = await prisma.inventoryItem.findUnique({ where: { id: seeded.item.id } });
    expect(back?.name).toBe("صنف الاختبار");
    expect(Number(back?.quantity)).toBe(10);
  });

  it("ملف نسخة قديم (بالجداول العشرة فقط) لا يزال قابلاً للاستعادة", async () => {
    const seeded = await seedBusinessData();

    const exported = await api(app).get("/api/v1/backup").set(bearer(adminToken));
    const full = JSON.parse(exported.text) as Record<string, unknown>;

    // محاكاة ملف ما قبل التوسعة: الجداول العشرة القديمة وحدها
    const legacyKeys = [
      "metadata",
      "branches",
      "users",
      "customers",
      "serviceCategories",
      "services",
      "orders",
      "orderItems",
      "orderStatusHistory",
      "payments",
      "auditLogs",
      "settings",
    ];
    const legacy: Record<string, unknown> = {};
    for (const k of legacyKeys) legacy[k] = full[k];

    await prisma.service.delete({ where: { id: seeded.service.id } });
    expect(await prisma.service.count()).toBe(0);

    const res = await api(app)
      .post("/api/v1/backup/restore")
      .set(bearer(adminToken))
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify(legacy), "utf-8"));

    expect(res.status).toBe(200);
    expect(await prisma.service.count()).toBe(1);
  });

  it("النسخة لا تحمل كلمات السرّ المهشّرة ولا رموز الجلسات", async () => {
    await seedBusinessData();
    const res = await api(app).get("/api/v1/backup").set(bearer(adminToken));

    expect(res.text).not.toContain("passwordHash");
    expect(res.text).not.toContain("resetTokenHash");
    expect(res.text).not.toContain("refreshToken");
  });
});
