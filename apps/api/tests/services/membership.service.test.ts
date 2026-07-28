import { describe, expect, it, vi } from "vitest";
import { MembershipService } from "../../src/modules/membership/membership.service";
import type { MembershipRepository } from "../../src/modules/membership/membership.repository";
import type { AuthenticatedUser, RequestContext } from "../../src/modules/auth/index";

const actor: AuthenticatedUser = { id: "u1", email: "a@b.c", role: "ADMIN", branchId: null };
const ctx: RequestContext = { ipAddress: "127.0.0.1", userAgent: "test" };

const TIERS = [
  { level: "BRONZE", minLifetimePoints: 0, isActive: true },
  { level: "SILVER", minLifetimePoints: 100, isActive: true },
  { level: "GOLD", minLifetimePoints: 500, isActive: true },
] as never;

function buildRepo(over: Partial<MembershipRepository> = {}) {
  return {
    ensureTiers: vi.fn(async () => TIERS),
    distribution: vi.fn(async () => []),
    findTierByLevel: vi.fn(async () => TIERS[0]),
    findAccountByCustomer: vi.fn(async () => ({ membershipLevel: "BRONZE" })),
    updateAccountLevel: vi.fn(async () => undefined),
    updateTier: vi.fn(async () => TIERS[0]),
    createAuditLog: vi.fn(async () => undefined),
    ...over,
  } as unknown as MembershipRepository;
}

describe("MembershipService.reevaluateForCustomer — auto tiering", () => {
  it("upgrades BRONZE→SILVER when crossing the threshold", async () => {
    const repo = buildRepo();
    const res = await new MembershipService(repo).reevaluateForCustomer("c1", 150, "عميل");
    expect(res).toMatchObject({ changed: true, oldLevel: "BRONZE", newLevel: "SILVER", direction: "UP" });
    expect(repo.updateAccountLevel).toHaveBeenCalledWith("c1", "SILVER");
  });

  it("reports no change when the level is unchanged", async () => {
    const repo = buildRepo({
      findAccountByCustomer: vi.fn(async () => ({ membershipLevel: "SILVER" })) as never,
    });
    const res = await new MembershipService(repo).reevaluateForCustomer("c1", 150, "عميل");
    expect(res).toMatchObject({ changed: false, direction: "NONE" });
    expect(repo.updateAccountLevel).not.toHaveBeenCalled();
  });

  it("downgrades GOLD→BRONZE when points fall", async () => {
    const repo = buildRepo({
      findAccountByCustomer: vi.fn(async () => ({ membershipLevel: "GOLD" })) as never,
    });
    const res = await new MembershipService(repo).reevaluateForCustomer("c1", 50, "عميل");
    expect(res).toMatchObject({ newLevel: "BRONZE", direction: "DOWN" });
  });
});

describe("MembershipService.manualSetLevel", () => {
  it("throws when the customer has no loyalty account", async () => {
    const svc = new MembershipService(
      buildRepo({ findAccountByCustomer: vi.fn(async () => null) as never }),
    );
    await expect(svc.manualSetLevel({ customerId: "c1", level: "GOLD" } as never, actor, ctx)).rejects.toThrow();
  });

  it("throws when already at the requested level", async () => {
    const svc = new MembershipService(
      buildRepo({ findAccountByCustomer: vi.fn(async () => ({ membershipLevel: "GOLD" })) as never }),
    );
    await expect(svc.manualSetLevel({ customerId: "c1", level: "GOLD" } as never, actor, ctx)).rejects.toThrow();
  });

  it("sets a new level and audits it", async () => {
    const repo = buildRepo({
      findAccountByCustomer: vi.fn(async () => ({ membershipLevel: "BRONZE" })) as never,
    });
    const res = await new MembershipService(repo).manualSetLevel(
      { customerId: "c1", level: "GOLD" } as never,
      actor,
      ctx,
    );
    expect(res).toMatchObject({ direction: "UP", newLevel: "GOLD" });
    expect(repo.createAuditLog).toHaveBeenCalledOnce();
  });
});

describe("MembershipService.getTierBenefits / updateTier", () => {
  it("throws 404 when a tier config is missing", async () => {
    const svc = new MembershipService(buildRepo({ findTierByLevel: vi.fn(async () => null) as never }));
    await expect(svc.getTierBenefits("SILVER")).rejects.toThrow();
  });

  it("updates a tier and audits", async () => {
    const repo = buildRepo();
    await new MembershipService(repo).updateTier("SILVER", { discountPercent: 5 } as never, actor, ctx);
    expect(repo.updateTier).toHaveBeenCalledOnce();
    expect(repo.createAuditLog).toHaveBeenCalledOnce();
  });
});
