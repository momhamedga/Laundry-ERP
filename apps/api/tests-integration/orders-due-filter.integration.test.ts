import type { Express } from "express";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase } from "./setup/db.js";
import { createCustomer, createService, seedBranch } from "./setup/factories.js";
import { api, bearer, makeApp, resetRateLimiters, seedAndLogin } from "./setup/harness.js";

/**
 * تصفية الطلبات بتاريخ الاستحقاق (dueFrom/dueTo).
 *
 * لماذا أُضيفت: dueDate كان قابلاً للفرز وغير قابل للتصفية، والفلتر الزمني
 * الوحيد على receivedAt. فشاشة «تسليمات اليوم» — وهي سؤالٌ عن dueDate — كانت
 * تستلزم جلب كل الطلبات وغربلتها في المتصفّح: تكلفةٌ تنمو مع كل طلب يُنشأ.
 *
 * وهذه الاختبارات تفصل الحقلين صراحةً: طلبٌ استُلم اليوم ويُستحقّ غداً يجب ألّا
 * يظهر في تسليمات اليوم، وخلطُ الحقلين خطأٌ يُنتج قائمةً تبدو معقولة وهي خاطئة.
 */
describe("orders due-date filter (integration)", () => {
  let app: Express;
  let adminToken: string;
  let branchId: string;
  let customerId: string;
  let serviceId: string;

  const DAY = 86_400_000;

  /**
   * يُنشئ طلباً باستحقاق محدَّد — receivedAt ثابت دائماً لعزل الحقلين.
   *
   * والاستلام قبل شهر لا قبل يوم: المُتحقِّق يفرض أن يكون التسليم بعد الاستلام،
   * فطلبٌ «متأخّر» باستحقاق قبل يومين كان يُرفض بـ400 حين كان الاستلام أمس —
   * لا لخلل في الفلتر بل لأن العيّنة نفسها مستحيلة. المسافة الواسعة تُبقي كل
   * الإزاحات المُختبَرة (سالبها وموجبها) طلباتٍ صالحة.
   */
  const RECEIVED_OFFSET = 30 * 86_400_000;

  async function orderDueAt(dueOffsetMs: number) {
    const now = Date.now();
    const res = await api(app)
      .post("/api/v1/orders")
      .set(bearer(adminToken))
      .send({
        customerId,
        branchId,
        items: [{ serviceId, quantity: 1 }],
        receivedAt: new Date(now - RECEIVED_OFFSET).toISOString(),
        dueDate: new Date(now + dueOffsetMs).toISOString(),
      });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return res.body.data.order as { id: string; orderNumber: string; dueDate: string };
  }

  function listOrders(query: Record<string, string>) {
    return api(app).get("/api/v1/orders").query(query).set(bearer(adminToken));
  }

  beforeEach(async () => {
    await resetDatabase();
    await resetRateLimiters();
    app = makeApp();
    adminToken = (await seedAndLogin(app, "ADMIN", "due")).accessToken;
    branchId = (await seedBranch()).id;
    customerId = (await createCustomer(app, adminToken)).id;
    serviceId = (await createService(app, adminToken, { price: 25 })).id;
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("dueTo وحده يعيد المتأخّرة فقط", async () => {
    const overdue = await orderDueAt(-2 * DAY);
    await orderDueAt(2 * DAY); // قادم — يجب ألّا يظهر

    const res = await listOrders({ dueTo: new Date(Date.now() - 1000).toISOString() });

    expect(res.status).toBe(200);
    const numbers = res.body.data.orders.map((o: { orderNumber: string }) => o.orderNumber);
    expect(numbers).toEqual([overdue.orderNumber]);
  });

  it("dueFrom وحده يعيد القادمة فقط", async () => {
    await orderDueAt(-2 * DAY);
    const upcoming = await orderDueAt(2 * DAY);

    const res = await listOrders({ dueFrom: new Date(Date.now() + 1000).toISOString() });

    const numbers = res.body.data.orders.map((o: { orderNumber: string }) => o.orderNumber);
    expect(numbers).toEqual([upcoming.orderNumber]);
  });

  it("نطاق مغلق يعيد ما بداخله وحده", async () => {
    await orderDueAt(-3 * DAY);
    const inRange = await orderDueAt(2 * 3600_000); // بعد ساعتين
    await orderDueAt(5 * DAY);

    const res = await listOrders({
      dueFrom: new Date(Date.now() - 3600_000).toISOString(),
      dueTo: new Date(Date.now() + DAY).toISOString(),
    });

    const numbers = res.body.data.orders.map((o: { orderNumber: string }) => o.orderNumber);
    expect(numbers).toEqual([inRange.orderNumber]);
  });

  it("يفصل الاستحقاق عن الاستلام — طلبٌ استُلم سابقاً ويُستحقّ بعد يومين ليس ضمن اليوم", async () => {
    await orderDueAt(2 * DAY); // الاستلام في الماضي، والاستحقاق بعد يومين

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const res = await listOrders({
      dueFrom: start.toISOString(),
      dueTo: end.toISOString(),
    });

    expect(res.body.data.orders).toHaveLength(0);
  });

  it("يتركّب مع فلاتر قائمة (الفرع) بلا تعارض", async () => {
    const other = await seedBranch(`فرع آخر ${Date.now()}`);
    await orderDueAt(3600_000);

    const mine = await listOrders({
      dueFrom: new Date(Date.now() - DAY).toISOString(),
      branchId,
    });
    const others = await listOrders({
      dueFrom: new Date(Date.now() - DAY).toISOString(),
      branchId: other.id,
    });

    expect(mine.body.data.orders).toHaveLength(1);
    expect(others.body.data.orders).toHaveLength(0);
  });

  it("غياب المعاملين يُبقي السلوك كما كان — إضافة محضة", async () => {
    await orderDueAt(-2 * DAY);
    await orderDueAt(2 * DAY);

    const res = await listOrders({});
    expect(res.body.data.orders).toHaveLength(2);
  });

  it("قيمة تاريخ غير صالحة تُرفض بـ400 لا تُتجاهَل بصمت", async () => {
    const res = await listOrders({ dueFrom: "ليس تاريخاً" });
    expect(res.status).toBe(400);
  });
});
