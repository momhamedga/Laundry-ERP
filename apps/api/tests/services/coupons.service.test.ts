import { describe, expect, it, vi } from "vitest";
import { CouponsService } from "../../src/modules/coupons/coupons.service";
import type { CouponsRepository } from "../../src/modules/coupons/coupons.repository";
import type { AuthenticatedUser, RequestContext } from "../../src/modules/auth/index";

const actor: AuthenticatedUser = { id: "u1", email: "a@b.c", role: "ADMIN", branchId: null };
const ctx: RequestContext = { ipAddress: "127.0.0.1", userAgent: "test" };

// كوبون افتراضي صالح - القيم أرقام (الخدمة تلفّها بـNumber())
function makeCoupon(over: Record<string, unknown> = {}) {
  return {
    id: "c1",
    code: "SAVE",
    isActive: true,
    type: "PERCENTAGE",
    value: 10,
    maxDiscount: null,
    minOrder: 0,
    usedCount: 0,
    usageLimit: null,
    usagePerCustomer: null,
    startDate: null,
    endDate: null,
    allowedCustomers: [],
    allowedServices: [],
    allowedCategories: [],
    membershipLevels: [],
    ...over,
  } as never;
}

function buildRepo(over: Partial<CouponsRepository> = {}) {
  return {
    findByCode: vi.fn(async () => null),
    findById: vi.fn(async () => makeCoupon()),
    create: vi.fn(async (d: unknown) => ({ id: "c1", ...(d as object) })),
    update: vi.fn(async () => makeCoupon()),
    delete: vi.fn(async () => undefined),
    countRedemptionsByCustomer: vi.fn(async () => 0),
    customerLevel: vi.fn(async () => "GOLD"),
    redeem: vi.fn(async () => ({ id: "r1" })),
    createAuditLog: vi.fn(async () => undefined),
    ...over,
  } as unknown as CouponsRepository;
}

describe("CouponsService.create", () => {
  it("rejects a duplicate code", async () => {
    const svc = new CouponsService(buildRepo({ findByCode: vi.fn(async () => makeCoupon()) as never }));
    await expect(
      svc.create({ code: "SAVE", type: "PERCENTAGE", value: 10 } as never, actor, ctx),
    ).rejects.toThrow();
  });

  it("creates when code is free (audit recorded)", async () => {
    const repo = buildRepo();
    const svc = new CouponsService(repo);
    await svc.create(
      {
        code: "NEW",
        type: "PERCENTAGE",
        value: 10,
        minOrder: 0,
        allowedCategories: [],
        allowedServices: [],
        allowedCustomers: [],
        membershipLevels: [],
      } as never,
      actor,
      ctx,
    );
    expect(repo.create).toHaveBeenCalledOnce();
    expect(repo.createAuditLog).toHaveBeenCalledOnce();
  });
});

describe("CouponsService.getById", () => {
  it("throws 404 when missing", async () => {
    const svc = new CouponsService(buildRepo({ findById: vi.fn(async () => null) as never }));
    await expect(svc.getById("x")).rejects.toThrow();
  });
});

describe("CouponsService.validate — rules", () => {
  const validateWith = (coupon: unknown, dto: Record<string, unknown>) =>
    new CouponsService(buildRepo({ findByCode: vi.fn(async () => coupon) as never })).validate({
      code: "SAVE",
      orderSubtotal: 200,
      ...dto,
    } as never);

  it("fails for inactive/missing coupon", async () => {
    expect((await validateWith(null, {})).valid).toBe(false);
    expect((await validateWith(makeCoupon({ isActive: false }), {})).valid).toBe(false);
  });

  it("fails when not started or expired", async () => {
    const future = new Date(Date.now() + 86_400_000);
    const past = new Date(Date.now() - 86_400_000);
    expect((await validateWith(makeCoupon({ startDate: future }), {})).valid).toBe(false);
    expect((await validateWith(makeCoupon({ endDate: past }), {})).valid).toBe(false);
  });

  it("fails when usage limit exhausted", async () => {
    expect((await validateWith(makeCoupon({ usageLimit: 5, usedCount: 5 }), {})).valid).toBe(false);
  });

  it("fails below minimum order", async () => {
    expect((await validateWith(makeCoupon({ minOrder: 500 }), { orderSubtotal: 200 })).valid).toBe(
      false,
    );
  });

  it("computes a PERCENTAGE discount with maxDiscount cap", async () => {
    // 10% of 200 = 20, capped at 15
    const r = await validateWith(makeCoupon({ value: 10, maxDiscount: 15 }), { orderSubtotal: 200 });
    expect(r.valid).toBe(true);
    expect(r.discount).toBe(15);
  });

  it("computes a FIXED discount capped at the subtotal", async () => {
    const r = await validateWith(makeCoupon({ type: "FIXED", value: 300 }), { orderSubtotal: 100 });
    expect(r.discount).toBe(100);
  });

  it("enforces allowedCustomers restriction", async () => {
    const c = makeCoupon({ allowedCustomers: ["cOTHER"] });
    const r = await validateWith(c, { customerId: "cme0000000000000000000000" });
    expect(r.valid).toBe(false);
  });

  it("requires a customer when the coupon is customer/level scoped", async () => {
    const c = makeCoupon({ membershipLevels: ["GOLD"] });
    const r = await validateWith(c, {}); // no customerId
    expect(r.valid).toBe(false);
  });
});

describe("CouponsService.redeem", () => {
  it("records a redemption for a valid coupon", async () => {
    const repo = buildRepo({ findByCode: vi.fn(async () => makeCoupon({ value: 10 })) as never });
    const svc = new CouponsService(repo);
    const res = await svc.redeem({ code: "SAVE", orderSubtotal: 200 } as never, actor, ctx);
    expect(res.discount).toBe(20); // 10% of 200
    expect(repo.redeem).toHaveBeenCalledOnce();
  });

  it("throws 400 for an invalid coupon", async () => {
    const svc = new CouponsService(buildRepo({ findByCode: vi.fn(async () => null) as never }));
    await expect(
      svc.redeem({ code: "NOPE", orderSubtotal: 200 } as never, actor, ctx),
    ).rejects.toThrow();
  });
});
