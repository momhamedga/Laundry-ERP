import { describe, expect, it } from "vitest";
import {
  buildCustomerWhere,
  buildPaginationMeta,
  decimalToNumber,
  toSkipTake,
} from "../../src/modules/customers/customers.utils";
import {
  buildBranchOrderBy,
  buildBranchWhere,
  toBranchWithCounts,
} from "../../src/modules/branches/branches.utils";

describe("pagination utils", () => {
  it("toSkipTake computes offset from page/limit", () => {
    expect(toSkipTake(1, 20)).toEqual({ skip: 0, take: 20 });
    expect(toSkipTake(3, 10)).toEqual({ skip: 20, take: 10 });
  });

  it("buildPaginationMeta derives totalPages + hasNext/hasPrev", () => {
    expect(buildPaginationMeta(1, 10, 0)).toMatchObject({ totalPages: 1, hasNext: false, hasPrev: false });
    const m = buildPaginationMeta(2, 10, 35);
    expect(m).toMatchObject({ totalPages: 4, hasNext: true, hasPrev: true });
  });

  it("decimalToNumber maps null→0 and Decimal→number", () => {
    expect(decimalToNumber(null)).toBe(0);
    expect(decimalToNumber({ toString: () => "12.5" } as never)).toBe(12.5);
  });
});

describe("customers where-builder", () => {
  it("builds an OR search + isActive + date range", () => {
    const where = buildCustomerWhere({
      search: "أحمد",
      isActive: true,
      createdFrom: new Date("2026-01-01"),
    } as never);
    expect(Array.isArray(where.OR)).toBe(true);
    expect(where.isActive).toBe(true);
    expect(where.createdAt).toBeTruthy();
  });

  it("is empty when no filters are given", () => {
    expect(buildCustomerWhere({} as never)).toEqual({});
  });
});

describe("branches utils", () => {
  it("buildBranchOrderBy maps sortBy/sortOrder", () => {
    expect(buildBranchOrderBy({ sortBy: "name", sortOrder: "asc" } as never)).toEqual({ name: "asc" });
  });
  it("buildBranchWhere adds search OR", () => {
    const w = buildBranchWhere({ search: "فرع" } as never);
    expect(Array.isArray(w.OR)).toBe(true);
  });
  it("toBranchWithCounts flattens _count", () => {
    const out = toBranchWithCounts({
      id: "b1",
      name: "الفرع",
      _count: { users: 3, orders: 7 },
    } as never);
    expect(out).toMatchObject({ usersCount: 3, ordersCount: 7 });
    expect("_count" in out).toBe(false);
  });
});
