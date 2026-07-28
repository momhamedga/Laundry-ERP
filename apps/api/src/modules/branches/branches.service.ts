import type { Branch } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import type {
  CreateBranchDto,
  ListBranchesQuery,
  UpdateBranchDto,
} from "./branches.dto.js";
import type { BranchesRepository } from "./branches.repository.js";
import type { BranchWithCounts, ListBranchesResult } from "./branches.types.js";
import {
  buildBranchOrderBy,
  buildBranchWhere,
  buildPaginationMeta,
  toBranchWithCounts,
  toSkipTake,
} from "./branches.utils.js";

export class BranchesService {
  constructor(private readonly repo: BranchesRepository) {}

  // ==================== Guards ====================

  private async getBranchOrFail(id: string): Promise<BranchWithCounts> {
    const branch = await this.repo.findById(id);
    if (!branch) throw new ApiError(404, "Branch not found");
    return toBranchWithCounts(branch);
  }

  private async ensureNameAvailable(name: string, excludeId?: string): Promise<void> {
    const existing = await this.repo.findByName(name);
    if (existing && existing.id !== excludeId) {
      throw new ApiError(409, "Branch name is already in use");
    }
  }

  // ==================== List / Get ====================

  async list(query: ListBranchesQuery): Promise<ListBranchesResult> {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const [branches, total] = await this.repo.findManyWithCount(
      buildBranchWhere(query),
      buildBranchOrderBy(query),
      skip,
      take,
    );

    return {
      branches: branches.map(toBranchWithCounts),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async getById(id: string): Promise<BranchWithCounts> {
    return this.getBranchOrFail(id);
  }

  // ==================== Create / Update ====================

  async create(dto: CreateBranchDto): Promise<Branch> {
    await this.ensureNameAvailable(dto.name);
    return this.repo.create({
      name: dto.name,
      address: dto.address ?? null,
      phone: dto.phone ?? null,
    });
  }

  async update(id: string, dto: UpdateBranchDto): Promise<Branch> {
    await this.getBranchOrFail(id);
    if (dto.name !== undefined) {
      await this.ensureNameAvailable(dto.name, id);
    }

    return this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
    });
  }

  // ==================== Status / Delete ====================

  async changeStatus(id: string, isActive: boolean): Promise<Branch> {
    const branch = await this.getBranchOrFail(id);
    if (branch.isActive === isActive) {
      throw new ApiError(400, `Branch is already ${isActive ? "active" : "inactive"}`);
    }
    return this.repo.update(id, { isActive });
  }

  /**
   * حذف الفرع الفارغ فقط - وجود موظفين أو طلبات يمنع الحذف
   * (التعطيل هو البديل للفروع المستخدمة)
   */
  async delete(id: string): Promise<void> {
    const branch = await this.getBranchOrFail(id);

    if (branch.usersCount > 0 || branch.ordersCount > 0) {
      throw new ApiError(
        409,
        `Cannot delete branch with ${branch.usersCount} user(s) and ${branch.ordersCount} order(s). Disable it instead`,
      );
    }
    await this.repo.hardDelete(id);
  }
}
