import { describe, expect, it } from "vitest";
import {
  cancelPaymentSchema,
  createPaymentSchema,
  refundPaymentSchema,
  updatePaymentSchema,
} from "../../src/modules/payments/payments.validator";

const CUID = "cme0000000000000000000000";

describe("payments.validator — createPaymentSchema", () => {
  it("accepts a valid payment with defaults", () => {
    const r = createPaymentSchema.safeParse({ orderId: CUID, amount: 100 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.method).toBe("CASH");
      expect(r.data.status).toBe("COMPLETED");
    }
  });

  it("rejects zero / negative amount (positive rule)", () => {
    expect(createPaymentSchema.safeParse({ orderId: CUID, amount: 0 }).success).toBe(false);
    expect(createPaymentSchema.safeParse({ orderId: CUID, amount: -5 }).success).toBe(false);
  });

  it("rejects >2 decimal amount (boundary)", () => {
    expect(createPaymentSchema.safeParse({ orderId: CUID, amount: 10.001 }).success).toBe(false);
  });

  it("rejects a non-creatable status like REFUNDED", () => {
    expect(
      createPaymentSchema.safeParse({ orderId: CUID, amount: 10, status: "REFUNDED" }).success,
    ).toBe(false);
    expect(
      createPaymentSchema.safeParse({ orderId: CUID, amount: 10, status: "PENDING" }).success,
    ).toBe(true);
  });

  it("rejects an invalid payment method", () => {
    expect(
      createPaymentSchema.safeParse({ orderId: CUID, amount: 10, method: "CRYPTO" }).success,
    ).toBe(false);
  });
});

describe("payments.validator — update / refund / cancel", () => {
  it("updatePaymentSchema rejects empty patch and non-transition status", () => {
    expect(updatePaymentSchema.safeParse({}).success).toBe(false);
    expect(updatePaymentSchema.safeParse({ status: "PENDING" }).success).toBe(false);
    expect(updatePaymentSchema.safeParse({ status: "COMPLETED" }).success).toBe(true);
  });

  it("refundPaymentSchema allows omitted amount (full refund)", () => {
    expect(refundPaymentSchema.safeParse({}).success).toBe(true);
    expect(refundPaymentSchema.safeParse({ amount: 50, reason: "تالف" }).success).toBe(true);
    expect(refundPaymentSchema.safeParse({ amount: -1 }).success).toBe(false);
  });

  it("cancelPaymentSchema accepts an optional reason", () => {
    expect(cancelPaymentSchema.safeParse({}).success).toBe(true);
  });
});
