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
      .set("x-restore-confirm", "true") // حارس مقصود: الاستعادة لا تُنفَّذ بلا تأكيد صريح
      .set("Content-Type", "application/octet-stream")
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
      .set("x-restore-confirm", "true")
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from(JSON.stringify(legacy), "utf-8"));

    expect(res.status).toBe(200);
    expect(await prisma.service.count()).toBe(1);
  });

  it("الاستعادة بلا رأس التأكيد تُرفض — الحارس نفسه جزء من العقد", async () => {
    await seedBusinessData();
    const exported = await api(app).get("/api/v1/backup").set(bearer(adminToken));

    const res = await api(app)
      .post("/api/v1/backup/restore")
      .set(bearer(adminToken))
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from(exported.text, "utf-8"));

    expect(res.status).toBe(400);
  });

  /**
   * التشفير من طرف إلى طرف عبر الـAPI الحقيقي.
   *
   * اختبارات الوحدة تثبت أن المُشفِّر يعمل؛ هذه تثبت أن النظام **يستخدمه** —
   * وهو بالضبط ما كان مفقوداً حين كان الإعداد معروضاً والشيفرة تكتب
   * `encrypted: false` نصّاً ثابتاً.
   */
  describe("التشفير", () => {
    it("نسخة مشفَّرة: الملف المخزَّن لا يحوي نصّاً صريحاً، والاستعادة منه تنجح", async () => {
      const seeded = await seedBusinessData();

      await api(app)
        .put("/api/v1/backup/settings")
        .set(bearer(adminToken))
        .send({ encryptionEnabled: true });

      const created = await api(app).post("/api/v1/backup").set(bearer(adminToken)).send({});
      expect(created.status).toBe(201);
      const record = created.body.data.backup;
      expect(record.encrypted, "السجلّ يجب أن يعلن التشفير").toBe(true);
      expect(record.filename).toMatch(/\.enc$/);

      // التنزيل يعيد الملف المخزَّن كما هو (مشفَّراً) — لا نصّ صريح فيه
      const downloaded = await api(app)
        .get(`/api/v1/backup/history/${record.id}/download`)
        .set(bearer(adminToken))
        .responseType("blob");
      expect(downloaded.status).toBe(200);

      const raw = Buffer.from(downloaded.body as Buffer);
      expect(raw.subarray(0, 8).toString("utf8")).toBe("LERPBKE1");
      expect(raw.toString("latin1")).not.toContain("مورّد الاختبار");
      expect(raw.toString("latin1")).not.toContain(seeded.supplier.id);

      // والاستعادة من الملف المشفَّر نفسه تعمل
      await prisma.supplier.delete({ where: { id: seeded.supplier.id } });
      expect(await prisma.supplier.count()).toBe(0);

      const restored = await api(app)
        .post("/api/v1/backup/restore")
        .set(bearer(adminToken))
        .set("x-restore-confirm", "true")
        .set("Content-Type", "application/octet-stream")
        .send(raw);

      expect(restored.status).toBe(200);
      expect(await prisma.supplier.count()).toBe(1);
    });

    /**
     * ملف مشفَّر لا يُفكّ ⇒ 409 برسالة مفهومة، لا 500 «حدث خطأ غير متوقّع».
     *
     * يغطّي التعيين الذي أسقطه CI أوّل مرّة: كان BackupEncryptionError يمرّ إلى
     * المعالج المركزي فتضيع الرسالة المكتوبة ليعرف المسؤول ما عليه فعله.
     *
     * ملفٌ تالف لا مفتاحٌ مختلف: `env` يُقرأ مرّة واحدة عند الإقلاع، فتغيير
     * المفتاح في process.env أثناء التشغيل لا يصل إلى الخادم أصلاً — وهو ما
     * أسقط محاولتي الأولى.
     */
    it("ملف مشفَّر تالف يُرفَض بـ409 برسالة مفهومة لا بعطل خادم", async () => {
      await seedBusinessData();

      // رأس صحيح (MAGIC + إصدار + ملح + متجه) ثم حشوٌ لا يفكّه أي مفتاح
      const corrupt = Buffer.concat([
        Buffer.from("LERPBKE1", "utf8"),
        Buffer.from([1]),
        Buffer.alloc(16, 7), // ملح
        Buffer.alloc(12, 9), // متجه
        Buffer.alloc(64, 3), // نصّ مشفَّر زائف
        Buffer.alloc(16, 5), // وسم زائف
      ]);

      const res = await api(app)
        .post("/api/v1/backup/restore")
        .set(bearer(adminToken))
        .set("x-restore-confirm", "true")
        .set("Content-Type", "application/octet-stream")
        .send(corrupt);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/فكّ تشفير|المفتاح غير مطابق|تالف/);
    });
  });

  it("النسخة لا تحمل كلمات السرّ المهشّرة ولا رموز الجلسات", async () => {
    await seedBusinessData();
    const res = await api(app).get("/api/v1/backup").set(bearer(adminToken));

    expect(res.text).not.toContain("passwordHash");
    expect(res.text).not.toContain("resetTokenHash");
    expect(res.text).not.toContain("refreshToken");
  });
});
