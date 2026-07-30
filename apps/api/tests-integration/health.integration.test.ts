import { afterAll, describe, expect, it } from "vitest";
import { api, makeApp } from "./setup/harness.js";
import { prisma } from "./setup/db.js";

/**
 * فحص الصحّة يثبت أن المسار الحقيقي (Express → Prisma → Neon/integration_test)
 * موصول فعلاً - حجر الأساس لبقية طبقة التكامل.
 */
describe("health (integration)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("GET /api/v1/health → 200 with database connected", async () => {
    const res = await api(makeApp()).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.database).toBe("connected");
    expect(res.body.service).toBe("laundry-erp-api");
  });

  it("unknown route → 404 envelope", async () => {
    const res = await api(makeApp()).get("/api/v1/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
