import { describe, expect, it } from "vitest";
import {
  adminResetPasswordSchema,
  assignRoleSchema,
  createUserSchema,
  updateProfileSchema,
  updateUserSchema,
} from "../../src/modules/users/users.validator";
import {
  changePasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "../../src/modules/auth/auth.validator";

const STRONG = "Admin123";

describe("users.validator — createUserSchema", () => {
  it("accepts a valid user and lower-cases email; role default CASHIER", () => {
    const r = createUserSchema.safeParse({ name: "موظف", email: "A@B.CO", password: STRONG });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("a@b.co");
      expect(r.data.role).toBe("CASHIER");
      expect(r.data.isActive).toBe(true);
    }
  });

  it("rejects a weak password (needs 8+, upper, lower, digit)", () => {
    expect(createUserSchema.safeParse({ name: "x2", email: "a@b.co", password: "weak" }).success).toBe(
      false,
    );
    expect(
      createUserSchema.safeParse({ name: "موظف", email: "a@b.co", password: "alllower1" }).success,
    ).toBe(false);
  });

  it("rejects an invalid role", () => {
    expect(
      createUserSchema.safeParse({ name: "موظف", email: "a@b.co", password: STRONG, role: "KING" })
        .success,
    ).toBe(false);
  });
});

describe("users.validator — update / role / profile", () => {
  it("updateUserSchema + updateProfileSchema reject empty patches", () => {
    expect(updateUserSchema.safeParse({}).success).toBe(false);
    expect(updateProfileSchema.safeParse({}).success).toBe(false);
  });
  it("assignRoleSchema validates role enum", () => {
    expect(assignRoleSchema.safeParse({ role: "MANAGER" }).success).toBe(true);
    expect(assignRoleSchema.safeParse({ role: "SUPERUSER" }).success).toBe(false);
  });
  it("adminResetPasswordSchema enforces the strong password rule", () => {
    expect(adminResetPasswordSchema.safeParse({ newPassword: STRONG }).success).toBe(true);
    expect(adminResetPasswordSchema.safeParse({ newPassword: "weak" }).success).toBe(false);
  });
});

describe("auth.validator", () => {
  it("loginSchema requires email + non-empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "bad", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });

  it("changePasswordSchema rejects same new password (refine)", () => {
    expect(
      changePasswordSchema.safeParse({ currentPassword: "Admin123", newPassword: "Admin123" }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({ currentPassword: "Old12345", newPassword: STRONG }).success,
    ).toBe(true);
  });

  it("resetPasswordSchema requires a 32+ char token", () => {
    expect(resetPasswordSchema.safeParse({ token: "short", newPassword: STRONG }).success).toBe(false);
    expect(
      resetPasswordSchema.safeParse({ token: "a".repeat(40), newPassword: STRONG }).success,
    ).toBe(true);
  });
});
