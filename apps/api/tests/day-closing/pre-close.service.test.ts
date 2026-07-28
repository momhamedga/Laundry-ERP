import { describe, expect, it, vi } from "vitest";
import { DayClosingService } from "../../src/modules/day-closing/day-closing.service";
import type { DayClosingRepository } from "../../src/modules/day-closing/day-closing.repository";

const ZERO_COUNTS = {
  priorOpenDays: 0,
  pendingPayments: 0,
  draftInvoices: 0,
  inProgressOrders: 0,
  readyOrders: 0,
  draftPurchases: 0,
  pendingPurchases: 0,
  negativeInventory: 0,
  failedBackups: 0,
  failedNotifications: 0,
  openStockAlerts: 0,
};

function serviceWith(counts: Partial<typeof ZERO_COUNTS>): DayClosingService {
  const repo = {
    findOpenDay: vi.fn(async () => null),
    preCloseCounts: vi.fn(async () => ({ ...ZERO_COUNTS, ...counts })),
  } as unknown as DayClosingRepository;
  return new DayClosingService(repo);
}

describe("DayClosingService.preCloseCheck (Phase 9.6a)", () => {
  it("is ready with no pending items", async () => {
    const check = await serviceWith({}).preCloseCheck();
    expect(check.ready).toBe(true);
    expect(check.hasBlocking).toBe(false);
    expect(check.hasWarnings).toBe(false);
    expect(check.items).toHaveLength(0);
  });

  it("flags a prior open day as blocking", async () => {
    const check = await serviceWith({ priorOpenDays: 1 }).preCloseCheck();
    expect(check.hasBlocking).toBe(true);
    expect(check.items.find((i) => i.key === "priorOpenDays")?.severity).toBe("blocking");
  });

  it("flags pending payments as a warning (not blocking)", async () => {
    const check = await serviceWith({ pendingPayments: 3 }).preCloseCheck();
    expect(check.hasWarnings).toBe(true);
    expect(check.hasBlocking).toBe(false);
    const item = check.items.find((i) => i.key === "pendingPayments");
    expect(item?.severity).toBe("warning");
    expect(item?.count).toBe(3);
  });

  it("treats ready-orders as info only (not a warning gate)", async () => {
    const check = await serviceWith({ readyOrders: 2 }).preCloseCheck();
    expect(check.ready).toBe(false); // there is an item…
    expect(check.hasWarnings).toBe(false); // …but info doesn't block force-less close
    expect(check.items.find((i) => i.key === "readyOrders")?.severity).toBe("info");
  });

  it("only includes items whose count > 0", async () => {
    const check = await serviceWith({ draftInvoices: 1, failedBackups: 2 }).preCloseCheck();
    expect(check.items.map((i) => i.key).sort()).toEqual(["draftInvoices", "failedBackups"]);
  });
});
