import { describe, expect, it } from "vitest";
import { signAccessToken, verifyAccessToken } from "../../src/lib/jwt";

const SUB = "cme0000000000000000000000";

describe("JWT access tokens", () => {
  it("round-trips sub + role", () => {
    const token = signAccessToken({ sub: SUB, role: "MANAGER" });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe(SUB);
    expect(payload.role).toBe("MANAGER");
    expect(payload.imp).toBeUndefined();
  });

  it("carries the impersonatedBy claim only when impersonating (Phase 9.6c)", () => {
    const token = signAccessToken({ sub: SUB, role: "CASHIER", impersonatedBy: "admin-id-123" });
    const payload = verifyAccessToken(token);
    expect(payload.imp).toBe("admin-id-123");
  });

  it("rejects a malformed token", () => {
    expect(() => verifyAccessToken("not.a.jwt")).toThrow();
  });

  it("rejects a tampered token", () => {
    const token = signAccessToken({ sub: SUB, role: "ADMIN" });
    const tampered = `${token.slice(0, -3)}xyz`;
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});
