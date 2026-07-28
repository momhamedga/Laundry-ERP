import { describe, expect, it } from "vitest";
import {
  actionTone,
  auditActionLabel,
  ROLE_LABELS,
} from "@/components/admin/admin-format";
import {
  CONTRACT_TYPE_LABELS,
  EMPLOYMENT_STATUS_BADGE,
  EMPLOYMENT_STATUS_LABELS,
} from "@/components/employees/employee-format";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";

const BADGE_VARIANTS = new Set(["default", "secondary", "outline", "destructive", "ghost", "link"]);

describe("admin-format", () => {
  it("auditActionLabel maps known actions and falls back to raw", () => {
    expect(auditActionLabel("LOGIN_SUCCESS")).toBe("تسجيل دخول ناجح");
    expect(auditActionLabel("UNKNOWN_ACTION")).toBe("UNKNOWN_ACTION");
  });

  it("actionTone flags security-sensitive actions as danger", () => {
    expect(actionTone("LOGIN_FAILED")).toBe("danger");
    expect(actionTone("ACCOUNT_LOCKED")).toBe("danger");
    expect(actionTone("LOGIN_SUCCESS")).toBe("normal");
  });

  it("labels every role", () => {
    for (const r of ["ADMIN", "MANAGER", "CASHIER", "WORKER", "DELIVERY"] as const) {
      expect(ROLE_LABELS[r]).toBeTruthy();
    }
  });
});

describe("employee-format", () => {
  it("labels every employment status with a valid badge variant", () => {
    for (const s of ["ACTIVE", "SUSPENDED", "TERMINATED", "ARCHIVED"] as const) {
      expect(EMPLOYMENT_STATUS_LABELS[s]).toBeTruthy();
      expect(BADGE_VARIANTS.has(EMPLOYMENT_STATUS_BADGE[s])).toBe(true);
    }
  });

  it("labels every contract type", () => {
    for (const t of ["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY"] as const) {
      expect(CONTRACT_TYPE_LABELS[t]).toBeTruthy();
    }
  });
});

describe("lib/utils — cn", () => {
  it("merges class names and dedupes tailwind conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe("text-sm font-bold");
  });
});

describe("lib/format — formatRelativeTime", () => {
  it("renders a relative string for a recent time", () => {
    const out = formatRelativeTime(new Date(Date.now() - 30 * 1000));
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(0);
  });
  it("falls back to an absolute date beyond a week", () => {
    const out = formatRelativeTime(new Date(Date.now() - 30 * 86_400_000));
    expect(out).not.toBe("—");
  });
});
