import type { Express } from "express";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase } from "./setup/db.js";
import { uniq } from "./setup/factories.js";
import { api, bearer, makeApp, resetRateLimiters, seedAndLogin } from "./setup/harness.js";

describe("day-closing (integration)", () => {
  let app: Express;
  let adminToken: string;
  let managerToken: string;
  let cashierToken: string;

  const openDay = (token: string, openingCash = 100) =>
    api(app).post("/api/v1/day-closing/open").set(bearer(token)).send({ openingCash });
  const closeDay = (token: string, actualCash = 100) =>
    api(app).post("/api/v1/day-closing/close").set(bearer(token)).send({ actualCash, force: true });

  beforeEach(async () => {
    await resetDatabase();
    await resetRateLimiters();
    app = makeApp();
    adminToken = (await seedAndLogin(app, "ADMIN", "day")).accessToken;
    managerToken = (await seedAndLogin(app, "MANAGER", "day")).accessToken;
    cashierToken = (await seedAndLogin(app, "CASHIER", "day")).accessToken;
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("lifecycle", () => {
    it("opens a day, reflects it in /current, and rejects a second open (409)", async () => {
      const open = await openDay(adminToken);
      expect(open.status).toBe(201);
      expect(open.body.data.closing.status).toBe("OPEN");

      const current = await api(app).get("/api/v1/day-closing/current").set(bearer(adminToken));
      expect(current.status).toBe(200);
      expect(current.body.data.current).toBeTruthy();

      const again = await openDay(adminToken);
      expect(again.status).toBe(409);
    });

    it("runs the pre-close check then closes the day (CLOSED)", async () => {
      await openDay(adminToken);
      const check = await api(app).get("/api/v1/day-closing/pre-close-check").set(bearer(adminToken));
      expect(check.status).toBe(200);
      const close = await closeDay(adminToken);
      expect(close.status).toBe(200);
      expect(close.body.data.closing.status).toBe("CLOSED");
    });

    it("cannot close when no day is open (409)", async () => {
      const close = await closeDay(adminToken);
      expect(close.status).toBe(409);
    });
  });

  describe("period lock (books become read-only after close)", () => {
    it("blocks guarded write routes with 423 after close, and unblocks after reopen", async () => {
      const open = await openDay(adminToken);
      const closedId = open.body.data.closing.id;
      await closeDay(adminToken);

      // تطبيق جديد ⇒ فحص قفل جديد (بلا كاش قديم): كتابة على مسار محروس → 423
      const locked = makeApp();
      const blocked = await api(locked)
        .post("/api/v1/inventory/items")
        .set(bearer(adminToken))
        .send({ sku: `SKU-${uniq()}`, name: "Locked Item" });
      expect(blocked.status).toBe(423);

      // إعادة الفتح (ADMIN فقط)
      const reopen = await api(app)
        .post(`/api/v1/day-closing/${closedId}/reopen`)
        .set(bearer(adminToken))
        .send({ reason: "correction needed" });
      expect(reopen.status).toBe(200);

      // بعد إعادة الفتح: تطبيق جديد ⇒ الكتابة مسموحة
      const unlocked = makeApp();
      const allowed = await api(unlocked)
        .post("/api/v1/inventory/items")
        .set(bearer(adminToken))
        .send({ sku: `SKU-${uniq()}`, name: "Unlocked Item" });
      expect(allowed.status).toBe(201);
    });
  });

  describe("RBAC", () => {
    it("CASHIER cannot open a day (403)", async () => {
      const res = await openDay(cashierToken);
      expect(res.status).toBe(403);
    });

    it("MANAGER cannot reopen (day:reopen is ADMIN-only) → 403", async () => {
      const open = await openDay(adminToken);
      const id = open.body.data.closing.id;
      await closeDay(adminToken);
      const reopen = await api(app)
        .post(`/api/v1/day-closing/${id}/reopen`)
        .set(bearer(managerToken))
        .send({ reason: "manager tries" });
      expect(reopen.status).toBe(403);
    });

    it("MANAGER can approve a closed day (day:approve)", async () => {
      const open = await openDay(adminToken);
      const id = open.body.data.closing.id;
      await closeDay(adminToken);
      const approve = await api(app).post(`/api/v1/day-closing/${id}/approve`).set(bearer(managerToken)).send({});
      expect(approve.status).toBe(200);
    });
  });
});
