import { describe, expect, it } from "vitest";
import { NOTIFICATION_RECIPIENT_ROLES } from "../../src/modules/notifications/notification.constants";
import { isTargetedEvent } from "../../src/modules/notifications/notification.types";

const VALID_ROLES = new Set(["ADMIN", "MANAGER", "CASHIER", "WORKER", "DELIVERY"]);

describe("Notifications — recipient role map", () => {
  it("maps every broadcast type to a non-empty list of valid roles", () => {
    for (const [type, roles] of Object.entries(NOTIFICATION_RECIPIENT_ROLES)) {
      expect(roles.length, `${type} must have recipients`).toBeGreaterThan(0);
      for (const r of roles) expect(VALID_ROLES.has(r), `${type} → ${r}`).toBe(true);
    }
  });

  it("includes the Phase 9.5 day-closing broadcast events", () => {
    expect(NOTIFICATION_RECIPIENT_ROLES.DAY_OPENED).toEqual(["ADMIN", "MANAGER"]);
    expect(NOTIFICATION_RECIPIENT_ROLES.DAY_CLOSED).toEqual(["ADMIN", "MANAGER"]);
    expect(NOTIFICATION_RECIPIENT_ROLES.DAY_REOPENED).toEqual(["ADMIN", "MANAGER"]);
  });
});

describe("Notifications — targeted event detection", () => {
  it("classifies self-directed events as targeted", () => {
    expect(isTargetedEvent({ type: "TEST", data: {}, targetUserId: "u1" })).toBe(true);
    expect(
      isTargetedEvent({
        type: "PASSWORD_RESET",
        data: { resetAt: "now" },
        targetUserId: "u1",
      }),
    ).toBe(true);
  });

  it("classifies broadcast events as non-targeted", () => {
    expect(
      isTargetedEvent({
        type: "DAY_CLOSED",
        data: {
          dayClosingId: "d1",
          businessDate: "2026-07-29",
          totalRevenue: 0,
          cashDifference: 0,
          closedByEmail: "a@b.c",
        },
      }),
    ).toBe(false);
  });
});
