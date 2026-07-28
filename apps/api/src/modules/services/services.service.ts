import { ApiError } from "../../middlewares/error.middleware.js";
import type {
  CreateServiceDto,
  ListServicesQuery,
  UpdateServiceDto,
} from "./services.dto.js";
import type { ServicesRepository } from "./services.repository.js";
import type { ListServicesResult, ServiceWithCategory } from "./services.types.js";
import {
  buildPaginationMeta,
  buildServiceOrderBy,
  buildServiceWhere,
  toServiceWithCategory,
  toSkipTake,
} from "./services.utils.js";

export class ServicesService {
  constructor(private readonly repo: ServicesRepository) {}

  // ==================== Guards ====================

  private async getServiceOrFail(id: string): Promise<ServiceWithCategory> {
    const service = await this.repo.findById(id);
    if (!service) throw new ApiError(404, "Service not found");
    return toServiceWithCategory(service);
  }

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const category = await this.repo.findCategoryById(categoryId);
    if (!category) throw new ApiError(404, "Category not found");
  }

  /** Business Rule: لا تكرار لاسم الخدمة داخل نفس التصنيف (مسموح عبر تصنيفات مختلفة) */
  private async ensureNameAvailableInCategory(
    categoryId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.repo.findByNameInCategory(categoryId, name);
    if (existing && existing.id !== excludeId) {
      throw new ApiError(409, "A service with this name already exists in this category");
    }
  }

  // ==================== List / Get ====================

  async list(query: ListServicesQuery): Promise<ListServicesResult> {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new ApiError(400, "minPrice cannot be greater than maxPrice");
    }

    const { skip, take } = toSkipTake(query.page, query.limit);
    const [services, total] = await this.repo.findManyWithCount(
      buildServiceWhere(query),
      buildServiceOrderBy(query),
      skip,
      take,
    );

    return {
      services: services.map(toServiceWithCategory),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async getById(id: string): Promise<ServiceWithCategory> {
    return this.getServiceOrFail(id);
  }

  // ==================== Create / Update ====================

  async create(dto: CreateServiceDto): Promise<ServiceWithCategory> {
    await this.ensureCategoryExists(dto.categoryId);
    await this.ensureNameAvailableInCategory(dto.categoryId, dto.name);

    const service = await this.repo.create({
      name: dto.name,
      description: dto.description ?? null,
      price: dto.price,
      unit: dto.unit,
      estimatedHours: dto.estimatedHours ?? null,
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
      category: { connect: { id: dto.categoryId } },
    });

    return toServiceWithCategory(service);
  }

  async update(id: string, dto: UpdateServiceDto): Promise<ServiceWithCategory> {
    const current = await this.getServiceOrFail(id);

    // الاسم فريد داخل التصنيف - تحقق بالقيم النهائية بعد التعديل
    const targetCategoryId = dto.categoryId ?? current.categoryId;
    const targetName = dto.name ?? current.name;

    if (dto.categoryId !== undefined) {
      await this.ensureCategoryExists(dto.categoryId);
    }
    if (dto.name !== undefined || dto.categoryId !== undefined) {
      await this.ensureNameAvailableInCategory(targetCategoryId, targetName, id);
    }

    const service = await this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.price !== undefined ? { price: dto.price } : {}),
      ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
      ...(dto.estimatedHours !== undefined
        ? { estimatedHours: dto.estimatedHours }
        : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      ...(dto.categoryId !== undefined
        ? { category: { connect: { id: dto.categoryId } } }
        : {}),
    });

    return toServiceWithCategory(service);
  }

  // ==================== Status / Soft Delete / Restore ====================

  async changeStatus(id: string, isActive: boolean): Promise<ServiceWithCategory> {
    const service = await this.getServiceOrFail(id);
    if (service.isActive === isActive) {
      throw new ApiError(400, `Service is already ${isActive ? "active" : "inactive"}`);
    }
    return toServiceWithCategory(await this.repo.update(id, { isActive }));
  }

  /**
   * Business Rule: لا حذف فعلي أبداً - الخدمة المستخدمة في طلبات
   * مرتبطة بـ Restrict، لذا الحذف = تعطيل (Soft Delete عبر isActive)
   */
  async softDelete(id: string): Promise<void> {
    const service = await this.getServiceOrFail(id);
    if (!service.isActive) {
      throw new ApiError(400, "Service is already deleted (inactive)");
    }
    await this.repo.update(id, { isActive: false });
  }

  async restore(id: string): Promise<ServiceWithCategory> {
    const service = await this.getServiceOrFail(id);
    if (service.isActive) {
      throw new ApiError(400, "Service is already active");
    }
    return toServiceWithCategory(await this.repo.update(id, { isActive: true }));
  }

  // ==================== Image (Structure Only) ====================

  /**
   * TODO(cloudinary): رفع صورة الخدمة إلى Cloudinary وحفظ imageUrl
   */
  uploadImage(): never {
    throw new ApiError(501, "Service image upload will be available when Cloudinary is configured");
  }
}
