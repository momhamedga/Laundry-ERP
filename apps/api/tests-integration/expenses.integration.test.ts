import type { Express } from "express";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase } from "./setup/db.js";
import { seedBranch } from "./setup/factories.js";
import { api, bearer, makeApp, resetRateLimiters, seedAndLogin } from "./setup/harness.js";

/**
 * وحدة المصروفات عبر HTTP الحقيقي.
 *
 * ما تحرسه هذه السويت تحديداً: المصروف سجلٌّ مالي، فلا يُحذف أبداً ولا يُنسب
 * لغير من سجّله ولا يُعدَّل بعد إلغائه. الاختبارات الوحدوية تُثبت المنطق على
 * مستودعٍ مُقلَّد؛ وهنا يُثبَت أن الصلاحيات والتحقّق والاستمرارية تعمل معاً على
 * المسار الفعلي الذي يسلكه المتصفّح.
 */
describe("expenses (integration)", () => {
  let app: Express;
  let adminToken: string;
  let managerToken: string;
  let cashierToken: string;
  let branchId: string;
  let inactiveBranchId: string;

  function createExpense(token: string, body: Record<string, unknown>) {
    return api(app).post("/api/v1/expenses").set(bearer(token)).send(body);
  }

  function validBody(over: Record<string, unknown> = {}) {
    return {
      amount: 500,
      category: "ELECTRICITY",
      branchId,
      expenseDate: new Date("2026-08-05T10:00:00.000Z").toISOString(),
      ...over,
    };
  }

  async function seedExpense(over: Record<string, unknown> = {}) {
    const res = await createExpense(adminToken, validBody(over));
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return res.body.data.expense as { id: string; amount: string; status: string };
  }

  beforeEach(async () => {
    await resetDatabase();
    await resetRateLimiters();
    app = makeApp();

    const branch = await seedBranch();
    branchId = branch.id;
    const inactive = await prisma.branch.create({
      data: { name: "فرع موقوف", isActive: false },
    });
    inactiveBranchId = inactive.id;

    adminToken = (await seedAndLogin(app, "ADMIN", "exp")).accessToken;
    managerToken = (await seedAndLogin(app, "MANAGER", "exp")).accessToken;
    cashierToken = (await seedAndLogin(app, "CASHIER", "exp")).accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("الصلاحيات", () => {
    it("يرفض غير المصادَق بـ401", async () => {
      const res = await api(app).get("/api/v1/expenses");
      expect(res.status).toBe(401);
    });

    it("الكاشير لا يرى المصروفات (403)", async () => {
      const res = await api(app).get("/api/v1/expenses").set(bearer(cashierToken));
      expect(res.status).toBe(403);
    });

    it("الكاشير لا يسجّل مصروفاً (403)", async () => {
      const res = await createExpense(cashierToken, validBody());
      expect(res.status).toBe(403);
    });

    it("المدير الفرعي يسجّل ويرى", async () => {
      expect((await createExpense(managerToken, validBody())).status).toBe(201);
      expect((await api(app).get("/api/v1/expenses").set(bearer(managerToken))).status).toBe(200);
    });
  });

  describe("الإنشاء", () => {
    it("ينشئ مصروفاً ويعيده كاملاً", async () => {
      const res = await createExpense(adminToken, validBody({ notes: "فاتورة أغسطس" }));
      expect(res.status).toBe(201);
      const e = res.body.data.expense;
      expect(e.amount).toBe("500");
      expect(e.category).toBe("ELECTRICITY");
      expect(e.status).toBe("ACTIVE");
      expect(e.notes).toBe("فاتورة أغسطس");
      expect(e.branch.name).toBeTruthy();
      expect(e.createdBy.name).toBeTruthy();
    });

    it("ينسب المصروف للمستخدم المسجِّل حتى لو حاول الجسم تزويره", async () => {
      const other = await seedAndLogin(app, "MANAGER", "other");
      const res = await createExpense(adminToken, validBody({ createdById: other.user.id }));
      expect(res.status).toBe(201);
      expect(res.body.data.expense.createdById).not.toBe(other.user.id);
    });

    it("يتجاهل status المُمرَّر في الجسم", async () => {
      const res = await createExpense(adminToken, validBody({ status: "CANCELLED" }));
      expect(res.status).toBe(201);
      expect(res.body.data.expense.status).toBe("ACTIVE");
    });

    it("يرفض مبلغاً غير موجب بـ400", async () => {
      expect((await createExpense(adminToken, validBody({ amount: 0 }))).status).toBe(400);
      expect((await createExpense(adminToken, validBody({ amount: -10 }))).status).toBe(400);
    });

    it("يرفض فئة مجهولة بـ400", async () => {
      expect((await createExpense(adminToken, validBody({ category: "X" }))).status).toBe(400);
    });

    it("يرفض فرعاً غير نشط بـ404", async () => {
      const res = await createExpense(adminToken, validBody({ branchId: inactiveBranchId }));
      expect(res.status).toBe(404);
    });

    it("يحفظ الكسور العشرية بلا انجراف", async () => {
      const res = await createExpense(adminToken, validBody({ amount: 0.1 }));
      expect(res.status).toBe(201);
      await createExpense(adminToken, validBody({ amount: 0.2 }));
      const list = await api(app).get("/api/v1/expenses").set(bearer(adminToken));
      expect(list.body.data.totalAmount).toBe("0.3");
    });
  });

  describe("التصفية والترقيم", () => {
    beforeEach(async () => {
      await seedExpense({ amount: 100, category: "RENT", expenseDate: "2026-08-01T00:00:00.000Z" });
      await seedExpense({ amount: 200, category: "WATER", expenseDate: "2026-08-15T00:00:00.000Z" });
      await seedExpense({ amount: 300, category: "RENT", expenseDate: "2026-09-01T00:00:00.000Z" });
    });

    it("يصفّي بالفئة", async () => {
      const res = await api(app)
        .get("/api/v1/expenses")
        .query({ category: "RENT" })
        .set(bearer(adminToken));
      expect(res.body.data.expenses).toHaveLength(2);
    });

    it("يصفّي بالمدى الزمني", async () => {
      const res = await api(app)
        .get("/api/v1/expenses")
        .query({ from: "2026-08-01", to: "2026-08-31" })
        .set(bearer(adminToken));
      expect(res.body.data.expenses).toHaveLength(2);
    });

    /** الإجمالي لكل النتيجة لا للصفحة — وإلا عرضت الواجهة رقماً يتغيّر بالتصفّح */
    it("يعيد إجمالي كل النتيجة لا الصفحة الظاهرة", async () => {
      const res = await api(app)
        .get("/api/v1/expenses")
        .query({ limit: 1 })
        .set(bearer(adminToken));
      expect(res.body.data.expenses).toHaveLength(1);
      expect(res.body.data.totalAmount).toBe("600");
      expect(res.body.meta.total).toBe(3);
    });
  });

  describe("التعديل", () => {
    it("يعدّل المبلغ والفئة", async () => {
      const e = await seedExpense();
      const res = await api(app)
        .patch(`/api/v1/expenses/${e.id}`)
        .set(bearer(adminToken))
        .send({ amount: 750, category: "MAINTENANCE" });
      expect(res.status).toBe(200);
      expect(res.body.data.expense.amount).toBe("750");
      expect(res.body.data.expense.category).toBe("MAINTENANCE");
    });

    it("يرفض جسماً فارغاً بـ400", async () => {
      const e = await seedExpense();
      const res = await api(app).patch(`/api/v1/expenses/${e.id}`).set(bearer(adminToken)).send({});
      expect(res.status).toBe(400);
    });

    it("يرفض تعديل مصروف ملغى بـ409", async () => {
      const e = await seedExpense();
      await api(app)
        .post(`/api/v1/expenses/${e.id}/cancel`)
        .set(bearer(adminToken))
        .send({ reason: "مكرر" });

      const res = await api(app)
        .patch(`/api/v1/expenses/${e.id}`)
        .set(bearer(adminToken))
        .send({ amount: 1 });
      expect(res.status).toBe(409);
    });

    it("يرفض مصروفاً غير موجود بـ404", async () => {
      const res = await api(app)
        .patch("/api/v1/expenses/clx0000000000000000000000")
        .set(bearer(adminToken))
        .send({ amount: 1 });
      expect(res.status).toBe(404);
    });
  });

  describe("الإلغاء", () => {
    it("يلغي ويحفظ السبب والمُلغي دون حذف السجلّ", async () => {
      const e = await seedExpense();
      const res = await api(app)
        .post(`/api/v1/expenses/${e.id}/cancel`)
        .set(bearer(adminToken))
        .send({ reason: "سُجّل مرتين" });

      expect(res.status).toBe(200);
      expect(res.body.data.expense.status).toBe("CANCELLED");
      expect(res.body.data.expense.cancelReason).toBe("سُجّل مرتين");
      expect(res.body.data.expense.cancelledBy.name).toBeTruthy();

      // السجلّ ما زال قابلاً للاسترجاع
      const still = await api(app).get(`/api/v1/expenses/${e.id}`).set(bearer(adminToken));
      expect(still.status).toBe(200);
    });

    it("يلزم السبب (400)", async () => {
      const e = await seedExpense();
      const res = await api(app)
        .post(`/api/v1/expenses/${e.id}/cancel`)
        .set(bearer(adminToken))
        .send({});
      expect(res.status).toBe(400);
    });

    it("يرفض إلغاء الملغى بـ409", async () => {
      const e = await seedExpense();
      const cancel = () =>
        api(app)
          .post(`/api/v1/expenses/${e.id}/cancel`)
          .set(bearer(adminToken))
          .send({ reason: "مكرر" });
      expect((await cancel()).status).toBe(200);
      expect((await cancel()).status).toBe(409);
    });

    it("الملغى يخرج من الإجمالي", async () => {
      const keep = await seedExpense({ amount: 100 });
      const drop = await seedExpense({ amount: 400 });
      await api(app)
        .post(`/api/v1/expenses/${drop.id}/cancel`)
        .set(bearer(adminToken))
        .send({ reason: "مكرر" });

      const res = await api(app).get("/api/v1/expenses").set(bearer(adminToken));
      expect(res.body.data.totalAmount).toBe("100");
      // ويبقى ظاهراً في القائمة
      expect(res.body.data.expenses.map((x: { id: string }) => x.id)).toContain(keep.id);
      expect(res.body.data.expenses).toHaveLength(2);
    });

    it("لا يوجد مسار حذف إطلاقاً", async () => {
      const e = await seedExpense();
      const res = await api(app).delete(`/api/v1/expenses/${e.id}`).set(bearer(adminToken));
      expect(res.status).toBe(404);
    });
  });

  describe("التدقيق", () => {
    it("يكتب سجلّاً لكل من الإنشاء والتعديل والإلغاء", async () => {
      const e = await seedExpense();
      await api(app).patch(`/api/v1/expenses/${e.id}`).set(bearer(adminToken)).send({ amount: 9 });
      await api(app)
        .post(`/api/v1/expenses/${e.id}/cancel`)
        .set(bearer(adminToken))
        .send({ reason: "مكرر" });

      const logs = await prisma.auditLog.findMany({
        where: { action: { in: ["EXPENSE_CREATED", "EXPENSE_UPDATED", "EXPENSE_CANCELLED"] } },
      });
      expect(logs.map((l) => l.action).sort()).toEqual([
        "EXPENSE_CANCELLED",
        "EXPENSE_CREATED",
        "EXPENSE_UPDATED",
      ]);
    });
  });

  describe("الملخّص التشغيلي", () => {
    it("يعيد الإيراد والمصروف والناتج", async () => {
      await seedExpense({ amount: 250 });
      const res = await api(app)
        .get("/api/v1/expenses/summary")
        .query({ from: "2026-08-01", to: "2026-08-31" })
        .set(bearer(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.summary.expenses).toBe("250");
      expect(res.body.data.summary.revenue).toBe("0");
      expect(res.body.data.summary.operatingResult).toBe("-250.00");
    });

    it("يرفض مدى مقلوباً بـ400", async () => {
      const res = await api(app)
        .get("/api/v1/expenses/summary")
        .query({ from: "2026-08-31", to: "2026-08-01" })
        .set(bearer(adminToken));
      expect(res.status).toBe(400);
    });

    /** /summary مُعرَّف قبل /:id — وإلا التقطه المسار كمُعرِّف وأعاد 404 */
    it("لا يلتقط /:id مسار الملخّص", async () => {
      const res = await api(app)
        .get("/api/v1/expenses/summary")
        .query({ from: "2026-08-01", to: "2026-08-31" })
        .set(bearer(adminToken));
      expect(res.status).not.toBe(404);
    });
  });
});
