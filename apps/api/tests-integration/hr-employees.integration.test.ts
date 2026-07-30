import type { Express } from "express";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase } from "./setup/db.js";
import { uniq } from "./setup/factories.js";
import { api, bearer, createUser, makeApp, resetRateLimiters, seedAndLogin } from "./setup/harness.js";

describe("HR + employees (integration)", () => {
  let app: Express;
  let adminToken: string;
  let managerToken: string;

  async function createEmployeeFor(role: "WORKER" | "CASHIER" = "WORKER") {
    const user = await createUser({ email: `emp-${uniq()}@test.local`, role });
    const res = await api(app)
      .post("/api/v1/employees")
      .set(bearer(adminToken))
      .send({ userId: user.id, status: "ACTIVE" });
    if (res.status !== 201) throw new Error(`createEmployee ${res.status}: ${JSON.stringify(res.body)}`);
    return res.body.data.employee;
  }

  beforeEach(async () => {
    await resetDatabase();
    await resetRateLimiters();
    app = makeApp();
    adminToken = (await seedAndLogin(app, "ADMIN", "hr")).accessToken;
    managerToken = (await seedAndLogin(app, "MANAGER", "hr")).accessToken;
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("employees", () => {
    it("ADMIN creates an employee profile linked to a user (201)", async () => {
      const emp = await createEmployeeFor();
      expect(emp.id).toBeTruthy();
    });

    it("MANAGER cannot create an employee (employees:manage is ADMIN-only) → 403", async () => {
      const user = await createUser({ email: `emp-${uniq()}@test.local`, role: "WORKER" });
      const res = await api(app).post("/api/v1/employees").set(bearer(managerToken)).send({ userId: user.id, status: "ACTIVE" });
      expect(res.status).toBe(403);
    });

    it("MANAGER can read the employees list (employees:read)", async () => {
      await createEmployeeFor();
      const res = await api(app).get("/api/v1/employees").set(bearer(managerToken));
      expect(res.status).toBe(200);
    });

    it("attaches a document to an employee", async () => {
      const emp = await createEmployeeFor();
      const res = await api(app)
        .post(`/api/v1/employees/${emp.id}/documents`)
        .set(bearer(adminToken))
        .send({ type: "CONTRACT", name: "Employment Contract" });
      expect(res.status).toBe(201);
      expect(res.body.data.document.name).toBe("Employment Contract");
    });
  });

  describe("attendance", () => {
    it("records a clock-in for an employee (attendance:manage)", async () => {
      const emp = await createEmployeeFor();
      const res = await api(app)
        .post("/api/v1/hr/attendance/clock-in")
        .set(bearer(adminToken))
        .send({ employeeProfileId: emp.id });
      expect(res.status).toBe(200);
      expect(res.body.data.record).toBeTruthy();
    });

    it("rejects an invalid employeeProfileId (400)", async () => {
      const res = await api(app).post("/api/v1/hr/attendance/clock-in").set(bearer(adminToken)).send({ employeeProfileId: "not-a-cuid" });
      expect(res.status).toBe(400);
    });
  });

  describe("leaves", () => {
    it("submits a leave request (leave:manage)", async () => {
      const emp = await createEmployeeFor();
      const res = await api(app)
        .post("/api/v1/hr/leaves")
        .set(bearer(adminToken))
        .send({
          employeeProfileId: emp.id,
          type: "ANNUAL",
          startDate: new Date(Date.now() + 86_400_000).toISOString(),
          endDate: new Date(Date.now() + 3 * 86_400_000).toISOString(),
          reason: "vacation",
        });
      expect(res.status).toBe(201);
      expect(res.body.data.leave).toBeTruthy();
    });

    it("rejects an end date before the start date (400)", async () => {
      const emp = await createEmployeeFor();
      const res = await api(app)
        .post("/api/v1/hr/leaves")
        .set(bearer(adminToken))
        .send({
          employeeProfileId: emp.id,
          type: "SICK",
          startDate: new Date(Date.now() + 3 * 86_400_000).toISOString(),
          endDate: new Date(Date.now() + 86_400_000).toISOString(),
        });
      expect(res.status).toBe(400);
    });
  });

  describe("payroll", () => {
    it("ADMIN generates a payroll run (payroll:manage)", async () => {
      await createEmployeeFor();
      const res = await api(app)
        .post("/api/v1/hr/payroll/generate")
        .set(bearer(adminToken))
        .send({
          periodStart: new Date("2026-07-01").toISOString(),
          periodEnd: new Date("2026-07-31").toISOString(),
          label: "July 2026",
        });
      expect(res.status).toBe(201);
      expect(res.body.data.run).toBeTruthy();
    });

    it("MANAGER (payroll:view only) cannot generate payroll → 403", async () => {
      const res = await api(app)
        .post("/api/v1/hr/payroll/generate")
        .set(bearer(managerToken))
        .send({ periodStart: new Date("2026-07-01").toISOString(), periodEnd: new Date("2026-07-31").toISOString() });
      expect(res.status).toBe(403);
    });

    it("MANAGER can view the payroll list (payroll:view)", async () => {
      const res = await api(app).get("/api/v1/hr/payroll").set(bearer(managerToken));
      expect(res.status).toBe(200);
    });
  });
});
