import { describe, expect, it } from "vitest";
import {
  createCouponSchema,
  redeemCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
} from "../../src/modules/coupons/coupons.validator";

describe("coupons.validator — createCouponSchema", () => {
  it("accepts a valid coupon and upper-cases the code", () => {
    const r = createCouponSchema.safeParse({ code: "save10", value: 10 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.code).toBe("SAVE10");
      expect(r.data.type).toBe("PERCENTAGE"); // default
      expect(r.data.minOrder).toBe(0); // default
      expect(r.data.allowedServices).toEqual([]); // default
    }
  });

  it("rejects too-short code (boundary)", () => {
    expect(createCouponSchema.safeParse({ code: "x", value: 10 }).success).toBe(false);
  });

  it("rejects negative value", () => {
    expect(createCouponSchema.safeParse({ code: "SAVE", value: -1 }).success).toBe(false);
  });

  it("rejects usageLimit < 1 (boundary)", () => {
    expect(createCouponSchema.safeParse({ code: "SAVE", value: 5, usageLimit: 0 }).success).toBe(
      false,
    );
  });

  it("coerces numeric strings for value/minOrder", () => {
    const r = createCouponSchema.safeParse({ code: "SAVE", value: "15", minOrder: "50" });
    expect(r.success && r.data.value).toBe(15);
    expect(r.success && r.data.minOrder).toBe(50);
  });
});

describe("coupons.validator — update / validate / redeem", () => {
  it("updateCouponSchema rejects an empty patch", () => {
    expect(updateCouponSchema.safeParse({}).success).toBe(false);
    expect(updateCouponSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it("validateCouponSchema requires code + orderSubtotal", () => {
    expect(validateCouponSchema.safeParse({ code: "SAVE", orderSubtotal: 100 }).success).toBe(true);
    expect(validateCouponSchema.safeParse({ orderSubtotal: 100 }).success).toBe(false);
    expect(validateCouponSchema.safeParse({ code: "SAVE", orderSubtotal: -1 }).success).toBe(false);
  });

  it("redeemCouponSchema accepts optional customer/order refs", () => {
    expect(redeemCouponSchema.safeParse({ code: "SAVE", orderSubtotal: 100 }).success).toBe(true);
  });
});
