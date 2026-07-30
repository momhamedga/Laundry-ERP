import type { Express } from "express";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase } from "./setup/db.js";
import { createCustomer, uniquePhone } from "./setup/factories.js";
import { api, bearer, makeApp, resetRateLimiters, seedAndLogin } from "./setup/harness.js";

describe("customers (integration)", () => {
  let app: Express;
  let adminToken: string;
  let cashierToken: string;

  beforeEach(async () => {
    await resetDatabase();
    await resetRateLimiters();
    app = makeApp();
    adminToken = (await seedAndLogin(app, "ADMIN", "cust")).accessToken;
    cashierToken = (await seedAndLogin(app, "CASHIER", "cust")).accessToken;
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("create + validation + RBAC", () => {
    it("creates a customer and persists it (201)", async () => {
      const phone = uniquePhone();
      const res = await api(app)
        .post("/api/v1/customers")
        .set(bearer(adminToken))
        .send({ name: "أحمد علي", phone });
      expect(res.status).toBe(201);
      expect(res.body.data.customer.phone).toBe(phone);
      const inDb = await prisma.customer.findUnique({ where: { id: res.body.data.customer.id } });
      expect(inDb).not.toBeNull();
    });

    it("rejects an invalid phone with 400", async () => {
      const res = await api(app)
        .post("/api/v1/customers")
        .set(bearer(adminToken))
        .send({ name: "Bad Phone", phone: "12" });
      expect(res.status).toBe(400);
    });

    it("rejects a too-short name with 400", async () => {
      const res = await api(app)
        .post("/api/v1/customers")
        .set(bearer(adminToken))
        .send({ name: "A", phone: uniquePhone() });
      expect(res.status).toBe(400);
    });

    it("rejects a duplicate phone with 409", async () => {
      const phone = uniquePhone();
      await createCustomer(app, adminToken, { phone });
      const res = await api(app)
        .post("/api/v1/customers")
        .set(bearer(adminToken))
        .send({ name: "Duplicate", phone });
      expect(res.status).toBe(409);
    });

    it("CASHIER can create (customers:manage) → 201", async () => {
      const res = await api(app)
        .post("/api/v1/customers")
        .set(bearer(cashierToken))
        .send({ name: "By Cashier", phone: uniquePhone() });
      expect(res.status).toBe(201);
    });

    it("WORKER cannot create (no customers:manage) → 403", async () => {
      const worker = await seedAndLogin(app, "WORKER", "cust");
      const res = await api(app)
        .post("/api/v1/customers")
        .set(bearer(worker.accessToken))
        .send({ name: "By Worker", phone: uniquePhone() });
      expect(res.status).toBe(403);
    });

    it("unauthenticated → 401", async () => {
      const res = await api(app).post("/api/v1/customers").send({ name: "No Auth", phone: uniquePhone() });
      expect(res.status).toBe(401);
    });
  });

  describe("list: search + pagination", () => {
    it("paginates with meta", async () => {
      for (let i = 0; i < 3; i++) await createCustomer(app, adminToken, { name: `Pager ${i}` });
      const res = await api(app).get("/api/v1/customers?page=1&limit=2").set(bearer(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.data.customers.length).toBe(2);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(3);
    });

    it("searches by name", async () => {
      await createCustomer(app, adminToken, { name: "Zorro Unique" });
      await createCustomer(app, adminToken, { name: "Someone Else" });
      const res = await api(app).get("/api/v1/customers?search=Zorro").set(bearer(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.data.customers.some((c: { name: string }) => c.name.includes("Zorro"))).toBe(true);
    });
  });

  describe("read + update + notes", () => {
    it("gets by id and by phone", async () => {
      const phone = uniquePhone();
      const c = await createCustomer(app, adminToken, { phone });
      const byId = await api(app).get(`/api/v1/customers/${c.id}`).set(bearer(adminToken));
      expect(byId.status).toBe(200);
      const byPhone = await api(app).get(`/api/v1/customers/phone/${phone}`).set(bearer(adminToken));
      expect(byPhone.status).toBe(200);
      expect(byPhone.body.data.customer.id).toBe(c.id);
    });

    it("unknown id → 404", async () => {
      const res = await api(app).get("/api/v1/customers/ckzzzzzzzzzzzzzzzzzzzzzzzz").set(bearer(adminToken));
      expect([400, 404]).toContain(res.status);
    });

    it("updates fields", async () => {
      const c = await createCustomer(app, adminToken);
      const res = await api(app)
        .patch(`/api/v1/customers/${c.id}`)
        .set(bearer(adminToken))
        .send({ name: "Renamed Customer" });
      expect(res.status).toBe(200);
      expect(res.body.data.customer.name).toBe("Renamed Customer");
    });

    it("rejects an empty update body with 400", async () => {
      const c = await createCustomer(app, adminToken);
      const res = await api(app).patch(`/api/v1/customers/${c.id}`).set(bearer(adminToken)).send({});
      expect(res.status).toBe(400);
    });
  });

  describe("delete + restore (ADMIN/MANAGER only)", () => {
    it("CASHIER cannot delete → 403", async () => {
      const c = await createCustomer(app, adminToken);
      const res = await api(app).delete(`/api/v1/customers/${c.id}`).set(bearer(cashierToken));
      expect(res.status).toBe(403);
    });

    it("ADMIN soft-deletes then restores", async () => {
      const c = await createCustomer(app, adminToken);
      const del = await api(app).delete(`/api/v1/customers/${c.id}`).set(bearer(adminToken));
      expect([200, 204]).toContain(del.status);
      const afterDelete = await prisma.customer.findUnique({ where: { id: c.id } });
      expect(afterDelete?.isActive).toBe(false);

      const restore = await api(app).patch(`/api/v1/customers/${c.id}/restore`).set(bearer(adminToken));
      expect(restore.status).toBe(200);
      const afterRestore = await prisma.customer.findUnique({ where: { id: c.id } });
      expect(afterRestore?.isActive).toBe(true);
    });
  });

  describe("merge (ADMIN/MANAGER only)", () => {
    // العقد الحقيقي: الدمج مُتحقَّق ومحمي بالدور لكنه هيكل غير مُنفَّذ بعد (501).
    it("valid merge is authorized + validated but returns 501 (structure-only endpoint)", async () => {
      const source = await createCustomer(app, adminToken);
      const target = await createCustomer(app, adminToken);
      const res = await api(app)
        .post("/api/v1/customers/merge")
        .set(bearer(adminToken))
        .send({ sourceId: source.id, targetId: target.id });
      expect(res.status).toBe(501);
    });

    it("CASHIER cannot merge (role-guarded) → 403", async () => {
      const source = await createCustomer(app, adminToken);
      const target = await createCustomer(app, adminToken);
      const res = await api(app)
        .post("/api/v1/customers/merge")
        .set(bearer(cashierToken))
        .send({ sourceId: source.id, targetId: target.id });
      expect(res.status).toBe(403);
    });

    it("rejects merging a customer into itself with 400", async () => {
      const c = await createCustomer(app, adminToken);
      const res = await api(app)
        .post("/api/v1/customers/merge")
        .set(bearer(adminToken))
        .send({ sourceId: c.id, targetId: c.id });
      expect(res.status).toBe(400);
    });
  });
});
