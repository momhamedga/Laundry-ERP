import { describe, expect, it, vi } from "vitest";
import { CustomersService } from "../../src/modules/customers/customers.service";
import type { CustomersRepository } from "../../src/modules/customers/customers.repository";

const CUSTOMER = { id: "c1", name: "أحمد", phone: "0123456789", isActive: true };

function buildRepo(over: Partial<CustomersRepository> = {}) {
  return {
    findById: vi.fn(async () => CUSTOMER),
    findByPhone: vi.fn(async () => null),
    create: vi.fn(async (d: unknown) => ({ id: "c1", ...(d as object) })),
    update: vi.fn(async (_id: string, d: unknown) => ({ ...CUSTOMER, ...(d as object) })),
    findManyWithCount: vi.fn(async () => [[], 0]),
    ...over,
  } as unknown as CustomersRepository;
}

describe("CustomersService.create — unique phone rule", () => {
  it("creates when the phone is free", async () => {
    const repo = buildRepo();
    await new CustomersService(repo).create({ name: "أحمد", phone: "0123456789" } as never);
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it("rejects a phone already registered", async () => {
    const repo = buildRepo({ findByPhone: vi.fn(async () => ({ id: "other" })) as never });
    await expect(
      new CustomersService(repo).create({ name: "أحمد", phone: "0123456789" } as never),
    ).rejects.toThrow();
  });
});

describe("CustomersService.getById / getByPhone", () => {
  it("throws 404 when not found by id", async () => {
    const svc = new CustomersService(buildRepo({ findById: vi.fn(async () => null) as never }));
    await expect(svc.getById("x")).rejects.toThrow();
  });
  it("throws 404 when not found by phone", async () => {
    const svc = new CustomersService(buildRepo({ findByPhone: vi.fn(async () => null) as never }));
    await expect(svc.getByPhone("000")).rejects.toThrow();
  });
});

describe("CustomersService.update — phone conflict", () => {
  it("rejects updating to a phone owned by another customer", async () => {
    const repo = buildRepo({ findByPhone: vi.fn(async () => ({ id: "other" })) as never });
    await expect(
      new CustomersService(repo).update("c1", { phone: "0123456789" } as never),
    ).rejects.toThrow();
  });

  it("allows keeping the same phone (same id)", async () => {
    const repo = buildRepo({ findByPhone: vi.fn(async () => ({ id: "c1" })) as never });
    await new CustomersService(repo).update("c1", { phone: "0123456789", name: "جديد" } as never);
    expect(repo.update).toHaveBeenCalledOnce();
  });
});

describe("CustomersService.softDelete / restore / merge", () => {
  it("softDelete throws if already inactive, else deactivates", async () => {
    const inactive = new CustomersService(
      buildRepo({ findById: vi.fn(async () => ({ ...CUSTOMER, isActive: false })) as never }),
    );
    await expect(inactive.softDelete("c1")).rejects.toThrow();

    const repo = buildRepo();
    await new CustomersService(repo).softDelete("c1");
    expect(repo.update).toHaveBeenCalledWith("c1", { isActive: false });
  });

  it("restore throws if already active", async () => {
    await expect(new CustomersService(buildRepo()).restore("c1")).rejects.toThrow();
  });

  it("merge is explicitly not implemented (501)", () => {
    expect(() => new CustomersService(buildRepo()).merge()).toThrow();
  });
});
