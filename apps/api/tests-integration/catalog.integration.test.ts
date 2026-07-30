import type { Express } from "express";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase } from "./setup/db.js";
import { createCategory, createService } from "./setup/factories.js";
import { api, bearer, makeApp, resetRateLimiters, seedAndLogin } from "./setup/harness.js";

/** تصنيفات الخدمات + الخدمات (التسعير) - CRUD + RBAC + تحقّق + فلترة */
describe("catalog: service-categories + services (integration)", () => {
  let app: Express;
  let adminToken: string;
  let managerToken: string;
  let cashierToken: string;

  beforeEach(async () => {
    await resetDatabase();
    await resetRateLimiters();
    app = makeApp();
    adminToken = (await seedAndLogin(app, "ADMIN", "cat")).accessToken;
    managerToken = (await seedAndLogin(app, "MANAGER", "cat")).accessToken;
    cashierToken = (await seedAndLogin(app, "CASHIER", "cat")).accessToken;
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("categories", () => {
    it("ADMIN creates a category (201)", async () => {
      const res = await api(app)
        .post("/api/v1/service-categories")
        .set(bearer(adminToken))
        .send({ name: "Ironing" });
      expect(res.status).toBe(201);
      expect(res.body.data.category.name).toBe("Ironing");
    });

    it("MANAGER can manage; CASHIER cannot (403) but can read (200)", async () => {
      const mgr = await api(app).post("/api/v1/service-categories").set(bearer(managerToken)).send({ name: "Wash" });
      expect(mgr.status).toBe(201);
      const cash = await api(app).post("/api/v1/service-categories").set(bearer(cashierToken)).send({ name: "Dry" });
      expect(cash.status).toBe(403);
      const read = await api(app).get("/api/v1/service-categories").set(bearer(cashierToken));
      expect(read.status).toBe(200);
    });

    it("rejects a short name with 400", async () => {
      const res = await api(app).post("/api/v1/service-categories").set(bearer(adminToken)).send({ name: "X" });
      expect(res.status).toBe(400);
    });

    it("updates and toggles status", async () => {
      const cat = await createCategory(app, adminToken, { name: "Toggle Me" });
      const upd = await api(app).patch(`/api/v1/service-categories/${cat.id}`).set(bearer(adminToken)).send({ name: "Renamed Cat" });
      expect(upd.status).toBe(200);
      expect(upd.body.data.category.name).toBe("Renamed Cat");
      const status = await api(app).patch(`/api/v1/service-categories/${cat.id}/status`).set(bearer(adminToken)).send({ isActive: false });
      expect(status.status).toBe(200);
      const inDb = await prisma.serviceCategory.findUnique({ where: { id: cat.id } });
      expect(inDb?.isActive).toBe(false);
    });
  });

  describe("services (pricing)", () => {
    it("creates a service with a price (201)", async () => {
      const cat = await createCategory(app, adminToken);
      const res = await api(app)
        .post("/api/v1/services")
        .set(bearer(adminToken))
        .send({ name: "Shirt Wash", categoryId: cat.id, price: 30.5, unit: "PIECE" });
      expect(res.status).toBe(201);
      expect(Number(res.body.data.service.price)).toBe(30.5);
    });

    it("rejects a negative price with 400", async () => {
      const cat = await createCategory(app, adminToken);
      const res = await api(app)
        .post("/api/v1/services")
        .set(bearer(adminToken))
        .send({ name: "Bad Price", categoryId: cat.id, price: -5 });
      expect(res.status).toBe(400);
    });

    it("rejects a missing/invalid categoryId with 400", async () => {
      const res = await api(app)
        .post("/api/v1/services")
        .set(bearer(adminToken))
        .send({ name: "No Cat", categoryId: "not-a-cuid", price: 10 });
      expect(res.status).toBe(400);
    });

    it("CASHIER cannot create a service (403)", async () => {
      const cat = await createCategory(app, adminToken);
      const res = await api(app)
        .post("/api/v1/services")
        .set(bearer(cashierToken))
        .send({ name: "Nope", categoryId: cat.id, price: 10 });
      expect(res.status).toBe(403);
    });

    it("filters the list by categoryId", async () => {
      const catA = await createCategory(app, adminToken);
      const catB = await createCategory(app, adminToken);
      await createService(app, adminToken, { categoryId: catA.id });
      await createService(app, adminToken, { categoryId: catB.id });
      const res = await api(app).get(`/api/v1/services?categoryId=${catA.id}`).set(bearer(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.data.services.length).toBe(1);
      expect(res.body.data.services[0].categoryId).toBe(catA.id);
    });

    it("soft-deletes then restores a service", async () => {
      const svc = await createService(app, adminToken);
      const del = await api(app).delete(`/api/v1/services/${svc.id}`).set(bearer(adminToken));
      expect([200, 204]).toContain(del.status);
      const afterDel = await prisma.service.findUnique({ where: { id: svc.id } });
      expect(afterDel?.isActive).toBe(false);
      const restore = await api(app).patch(`/api/v1/services/${svc.id}/restore`).set(bearer(adminToken));
      expect(restore.status).toBe(200);
    });
  });
});
