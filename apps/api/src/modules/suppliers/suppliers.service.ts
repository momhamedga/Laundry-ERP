import type { Prisma, Supplier } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import type { RequestContext } from "../auth/auth.types.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type {
  CreateSupplierDto,
  ListSuppliersQuery,
  UpdateSupplierDto,
} from "./suppliers.dto.js";
import type { SuppliersRepository } from "./suppliers.repository.js";
import type { ListSuppliersResult, SupplierStats } from "./suppliers.types.js";
import {
  buildPaginationMeta,
  buildSupplierOrderBy,
  buildSupplierWhere,
  toSkipTake,
} from "./suppliers.utils.js";

export class SuppliersService {
  constructor(private readonly repo: SuppliersRepository) {}

  private async getOrFail(id: string): Promise<Supplier> {
    const supplier = await this.repo.findById(id);
    if (!supplier) throw new ApiError(404, "Supplier not found");
    return supplier;
  }

  async list(query: ListSuppliersQuery): Promise<ListSuppliersResult> {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const [suppliers, total] = await this.repo.findManyWithCount(
      buildSupplierWhere(query),
      buildSupplierOrderBy(query),
      skip,
      take,
    );
    return { suppliers, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  getById(id: string): Promise<Supplier> {
    return this.getOrFail(id);
  }

  getStats(id: string): Promise<SupplierStats> {
    return this.getOrFail(id).then(() => this.repo.getStats(id));
  }

  async create(
    dto: CreateSupplierDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<Supplier> {
    const supplier = await this.repo.create({
      name: dto.name,
      contactName: dto.contactName ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      address: dto.address ?? null,
      taxNumber: dto.taxNumber ?? null,
      notes: dto.notes ?? null,
    });
    await this.audit("SUPPLIER_CREATED", actor, ctx, { supplierId: supplier.id, name: supplier.name });
    return supplier;
  }

  async update(
    id: string,
    dto: UpdateSupplierDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<Supplier> {
    await this.getOrFail(id);
    const supplier = await this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.contactName !== undefined ? { contactName: dto.contactName } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.taxNumber !== undefined ? { taxNumber: dto.taxNumber } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
    });
    await this.audit("SUPPLIER_UPDATED", actor, ctx, { supplierId: id, changes: dto });
    return supplier;
  }

  /** تعطيل (Soft Delete) - لا حذف فعلي (المشتريات مرتبطة بـ Restrict) */
  async disable(id: string, actor: AuthenticatedUser, ctx: RequestContext): Promise<void> {
    const supplier = await this.getOrFail(id);
    if (!supplier.isActive) throw new ApiError(400, "Supplier is already disabled");
    await this.repo.update(id, { isActive: false });
    await this.audit("SUPPLIER_DELETED", actor, ctx, { supplierId: id });
  }

  async restore(id: string, actor: AuthenticatedUser, ctx: RequestContext): Promise<Supplier> {
    const supplier = await this.getOrFail(id);
    if (supplier.isActive) throw new ApiError(400, "Supplier is already active");
    const updated = await this.repo.update(id, { isActive: true });
    await this.audit("SUPPLIER_UPDATED", actor, ctx, { supplierId: id, restored: true });
    return updated;
  }

  private audit(
    action: "SUPPLIER_CREATED" | "SUPPLIER_UPDATED" | "SUPPLIER_DELETED",
    actor: AuthenticatedUser,
    ctx: RequestContext,
    metadata: Prisma.InputJsonValue,
  ): Promise<unknown> {
    return this.repo.createAuditLog({
      action,
      userId: actor.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata,
    });
  }
}
