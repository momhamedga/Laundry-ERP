import { describe, expect, it } from "vitest";
import {
  computeEffectivePermissions,
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from "../../src/modules/auth/auth.constants";

describe("RBAC — PERMISSIONS registry", () => {
  it("has no duplicate permission keys", () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
  });

  it("ADMIN holds every declared permission", () => {
    expect(ROLE_PERMISSIONS.ADMIN.length).toBe(PERMISSIONS.length);
    for (const p of PERMISSIONS) expect(ROLE_PERMISSIONS.ADMIN).toContain(p);
  });

  it("every role's permissions are a subset of the registry", () => {
    const valid = new Set<string>(PERMISSIONS);
    for (const role of Object.keys(ROLE_PERMISSIONS) as (keyof typeof ROLE_PERMISSIONS)[]) {
      for (const p of ROLE_PERMISSIONS[role]) expect(valid.has(p)).toBe(true);
    }
  });
});

describe("RBAC — computeEffectivePermissions (Phase 9.6c overrides)", () => {
  it("returns the role's permissions when there are no overrides", () => {
    const eff = computeEffectivePermissions("CASHIER", []);
    expect(new Set(eff)).toEqual(new Set(ROLE_PERMISSIONS.CASHIER));
  });

  it("grants a permission the role lacks (granted=true)", () => {
    expect(ROLE_PERMISSIONS.CASHIER).not.toContain("employees:read");
    const eff = computeEffectivePermissions("CASHIER", [
      { permission: "employees:read", granted: true },
    ]);
    expect(eff).toContain("employees:read");
  });

  it("revokes a permission the role has (granted=false)", () => {
    expect(ROLE_PERMISSIONS.CASHIER).toContain("orders:create");
    const eff = computeEffectivePermissions("CASHIER", [
      { permission: "orders:create", granted: false },
    ]);
    expect(eff).not.toContain("orders:create");
  });

  it("ignores unknown permission strings safely", () => {
    const eff = computeEffectivePermissions("CASHIER", [
      { permission: "totally:made-up", granted: true },
    ]);
    expect(eff).not.toContain("totally:made-up");
    expect(new Set(eff)).toEqual(new Set(ROLE_PERMISSIONS.CASHIER));
  });

  it("does not mutate the source ROLE_PERMISSIONS array", () => {
    const before = [...ROLE_PERMISSIONS.WORKER];
    computeEffectivePermissions("WORKER", [{ permission: "reports:view", granted: true }]);
    expect(ROLE_PERMISSIONS.WORKER).toEqual(before);
  });

  it("applies grant then revoke deterministically (last-write per key via map semantics)", () => {
    const eff = computeEffectivePermissions("WORKER", [
      { permission: "reports:view", granted: true },
      { permission: "orders:read", granted: false },
    ]);
    expect(eff).toContain("reports:view");
    expect(eff).not.toContain("orders:read");
  });
});
