import { describe, expect, it } from "vitest";
import {
  hasAnyRole,
  hasPermission,
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from "@/constants/permissions";

describe("FE permission mirror", () => {
  it("has no duplicate permissions", () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
  });

  it("ADMIN mirror holds every permission", () => {
    expect(ROLE_PERMISSIONS.ADMIN.length).toBe(PERMISSIONS.length);
  });

  it("hasPermission returns false for undefined role", () => {
    expect(hasPermission(undefined, "orders:read")).toBe(false);
  });

  it("hasPermission reflects role grants", () => {
    expect(hasPermission("CASHIER", "orders:create")).toBe(true);
    expect(hasPermission("CASHIER", "employees:read")).toBe(false);
    expect(hasPermission("MANAGER", "attendance:manage")).toBe(true);
  });

  it("hasAnyRole matches membership", () => {
    expect(hasAnyRole("MANAGER", "ADMIN", "MANAGER")).toBe(true);
    expect(hasAnyRole("WORKER", "ADMIN", "MANAGER")).toBe(false);
    expect(hasAnyRole(undefined, "ADMIN")).toBe(false);
  });

  it("every role's permissions are valid registry keys", () => {
    const valid = new Set<string>(PERMISSIONS);
    for (const role of Object.keys(ROLE_PERMISSIONS) as (keyof typeof ROLE_PERMISSIONS)[]) {
      for (const p of ROLE_PERMISSIONS[role]) expect(valid.has(p)).toBe(true);
    }
  });
});
