import { describe, expect, it } from "vitest";
import {
  adjustSchema,
  bonusSchema,
  createCampaignSchema,
  redeemSchema,
  updateSettingsSchema,
} from "../../src/modules/loyalty/loyalty.validator";

const CUID = "cme0000000000000000000000";

describe("loyalty.validator — points operations", () => {
  it("adjustSchema forbids zero points (refine) and short reason", () => {
    expect(adjustSchema.safeParse({ customerId: CUID, points: 0, reason: "خطأ" }).success).toBe(
      false,
    );
    expect(adjustSchema.safeParse({ customerId: CUID, points: 5, reason: "x" }).success).toBe(false);
    expect(adjustSchema.safeParse({ customerId: CUID, points: -5, reason: "تصحيح" }).success).toBe(
      true,
    );
  });

  it("redeemSchema requires a positive integer points", () => {
    expect(redeemSchema.safeParse({ customerId: CUID, points: 100 }).success).toBe(true);
    expect(redeemSchema.safeParse({ customerId: CUID, points: -1 }).success).toBe(false);
    expect(redeemSchema.safeParse({ customerId: CUID, points: 1.5 }).success).toBe(false);
  });

  it("bonusSchema restricts type to the known bonus kinds", () => {
    expect(bonusSchema.safeParse({ customerId: CUID, type: "WELCOME" }).success).toBe(true);
    expect(bonusSchema.safeParse({ customerId: CUID, type: "RANDOM" }).success).toBe(false);
  });
});

describe("loyalty.validator — settings / campaign", () => {
  it("updateSettingsSchema rejects empty patch and bad expiry bounds", () => {
    expect(updateSettingsSchema.safeParse({}).success).toBe(false);
    expect(updateSettingsSchema.safeParse({ pointExpiryDays: 0 }).success).toBe(false);
    expect(updateSettingsSchema.safeParse({ pointExpiryDays: 4000 }).success).toBe(false);
    expect(updateSettingsSchema.safeParse({ pointsPerCurrency: 2 }).success).toBe(true);
  });

  it("createCampaignSchema applies defaults", () => {
    const r = createCampaignSchema.safeParse({ name: "حملة الصيف" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.type).toBe("BONUS");
      expect(r.data.points).toBe(0);
      expect(r.data.membershipLevels).toEqual([]);
    }
    expect(createCampaignSchema.safeParse({ name: "x" }).success).toBe(false);
  });
});
