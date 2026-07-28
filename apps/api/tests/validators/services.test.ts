import { describe, expect, it } from "vitest";
import {
  createServiceSchema,
  serviceStatusSchema,
  updateServiceSchema,
} from "../../src/modules/services/services.validator";

const CUID = "cme0000000000000000000000";

describe("services.validator — createServiceSchema", () => {
  it("accepts a valid service with defaults", () => {
    const r = createServiceSchema.safeParse({ name: "كي", categoryId: CUID, price: 10 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.unit).toBe("PIECE");
      expect(r.data.isActive).toBe(true);
      expect(r.data.sortOrder).toBe(0);
    }
  });

  it("rejects negative price (business rule)", () => {
    expect(createServiceSchema.safeParse({ name: "كي", categoryId: CUID, price: -1 }).success).toBe(
      false,
    );
  });

  it("rejects >2 decimal price (boundary)", () => {
    expect(
      createServiceSchema.safeParse({ name: "كي", categoryId: CUID, price: 10.005 }).success,
    ).toBe(false);
  });

  it("rejects non-positive estimatedHours", () => {
    expect(
      createServiceSchema.safeParse({ name: "كي", categoryId: CUID, price: 10, estimatedHours: 0 })
        .success,
    ).toBe(false);
  });

  it("rejects a bad category id (malformed)", () => {
    expect(createServiceSchema.safeParse({ name: "كي", categoryId: "x", price: 10 }).success).toBe(
      false,
    );
  });
});

describe("services.validator — update / status", () => {
  it("updateServiceSchema rejects empty patch", () => {
    expect(updateServiceSchema.safeParse({}).success).toBe(false);
    expect(updateServiceSchema.safeParse({ price: 20 }).success).toBe(true);
  });

  it("serviceStatusSchema requires a boolean isActive", () => {
    expect(serviceStatusSchema.safeParse({ isActive: true }).success).toBe(true);
    expect(serviceStatusSchema.safeParse({ isActive: "yes" }).success).toBe(false);
  });
});
