import { describe, expect, it } from "vitest";
import {
  cashMovementSchema,
  closeDaySchema,
  openDaySchema,
  reopenDaySchema,
} from "../../src/modules/day-closing/day-closing.validator";

describe("day-closing validators", () => {
  it("openDaySchema accepts empty body (openingCash optional)", () => {
    expect(openDaySchema.safeParse({}).success).toBe(true);
  });

  it("openDaySchema rejects negative opening cash", () => {
    expect(openDaySchema.safeParse({ openingCash: -5 }).success).toBe(false);
  });

  it("closeDaySchema requires actualCash", () => {
    expect(closeDaySchema.safeParse({}).success).toBe(false);
    expect(closeDaySchema.safeParse({ actualCash: 100 }).success).toBe(true);
  });

  it("closeDaySchema coerces force to boolean", () => {
    const r = closeDaySchema.safeParse({ actualCash: 100, force: "true" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.force).toBe(true);
  });

  it("reopenDaySchema requires a reason of at least 3 chars", () => {
    expect(reopenDaySchema.safeParse({ reason: "ok" }).success).toBe(false);
    expect(reopenDaySchema.safeParse({ reason: "تصحيح" }).success).toBe(true);
  });

  it("cashMovementSchema enforces IN/OUT + positive amount", () => {
    expect(cashMovementSchema.safeParse({ type: "IN", amount: 50 }).success).toBe(true);
    expect(cashMovementSchema.safeParse({ type: "OUT", amount: 0 }).success).toBe(false);
    expect(cashMovementSchema.safeParse({ type: "SIDE", amount: 5 }).success).toBe(false);
  });
});
