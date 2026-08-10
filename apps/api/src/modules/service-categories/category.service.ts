import type { ServiceCategory } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import type {
  CreateCategoryDto,
  ListCategoriesQuery,
  UpdateCategoryDto,
} from "./category.dto.js";
import type { CategoryRepository } from "./category.repository.js";
import type { CategoryWithCount, ListCategoriesResult } from "./category.types.js";
import {
  buildCategoryOrderBy,
  buildCategoryWhere,
  buildPaginationMeta,
  toCategoryWithCount,
  toSkipTake,
} from "./category.utils.js";

export class CategoryService {
  constructor(private readonly repo: CategoryRepository) {}

  // ==================== Guards ====================

  private async getCategoryOrFail(id: string): Promise<CategoryWithCount> {
    const category = await this.repo.findById(id);
    if (!category) throw new ApiError(404, "التصنيف غير موجود.");
    return toCategoryWithCount(category);
  }

  private async ensureNameAvailable(name: string, excludeId?: string): Promise<void> {
    const existing = await this.repo.findByName(name);
    if (existing && existing.id !== excludeId) {
      throw new ApiError(409, "اسم التصنيف مستخدم بالفعل.");
    }
  }

  // ==================== List / Get ====================

  async list(query: ListCategoriesQuery): Promise<ListCategoriesResult> {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const [categories, total] = await this.repo.findManyWithCount(
      buildCategoryWhere(query),
      buildCategoryOrderBy(query),
      skip,
      take,
    );

    return {
      categories: categories.map(toCategoryWithCount),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async getById(id: string): Promise<CategoryWithCount> {
    return this.getCategoryOrFail(id);
  }

  // ==================== Create / Update ====================

  async create(dto: CreateCategoryDto): Promise<ServiceCategory> {
    await this.ensureNameAvailable(dto.name);
    return this.repo.create({ name: dto.name, sortOrder: dto.sortOrder });
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<ServiceCategory> {
    await this.getCategoryOrFail(id);
    if (dto.name !== undefined) {
      await this.ensureNameAvailable(dto.name, id);
    }

    return this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    });
  }

  // ==================== Enable / Disable ====================

  /**
   * Business Rule: تعطيل التصنيف يجعل خدماته غير متاحة للطلبات
   * الجديدة فقط - لا يغير حالة الخدمات نفسها، والتحقق يتم وقت إنشاء
   * الطلب (الخدمة متاحة = service.isActive && category.isActive)
   */
  async changeStatus(id: string, isActive: boolean): Promise<ServiceCategory> {
    const category = await this.getCategoryOrFail(id);
    if (category.isActive === isActive) {
      throw new ApiError(400, `التصنيف ${isActive ? "نشط" : "موقوف"} بالفعل.`);
    }
    return this.repo.update(id, { isActive });
  }

  // ==================== Delete ====================

  /**
   * Business Rule: لا يمكن حذف تصنيف يحتوي على خدمات
   * التصنيف الفارغ يُحذف فعلياً - التعطيل هو الآلية الناعمة للإخفاء
   */
  async delete(id: string): Promise<void> {
    await this.getCategoryOrFail(id);

    const servicesCount = await this.repo.countServices(id);
    if (servicesCount > 0) {
      throw new ApiError(
        409,
        `لا يمكن حذف تصنيف يضمّ ${servicesCount} خدمة. أوقفه بدلاً من حذفه.`,
      );
    }
    await this.repo.hardDelete(id);
  }
}
