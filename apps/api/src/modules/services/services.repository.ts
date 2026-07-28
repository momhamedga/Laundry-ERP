import type { Prisma, PrismaClient, Service, ServiceCategory } from "@prisma/client";
import type { ServiceCategorySummary } from "./services.types.js";

type ServiceWithCategoryRow = Service & { category: ServiceCategorySummary };

const CATEGORY_SUMMARY = {
  category: { select: { id: true, name: true, isActive: true } },
} as const;

/**
 * Repository Pattern - كل وصول لقاعدة البيانات الخاص بالخدمات
 */
export class ServicesRepository {
  constructor(private readonly db: PrismaClient) {}

  // ==================== Queries ====================

  /** قائمة + العدد الكلي في transaction واحدة */
  findManyWithCount(
    where: Prisma.ServiceWhereInput,
    orderBy: Prisma.ServiceOrderByWithRelationInput,
    skip: number,
    take: number,
  ): Promise<[ServiceWithCategoryRow[], number]> {
    return this.db.$transaction([
      this.db.service.findMany({
        where,
        orderBy,
        skip,
        take,
        include: CATEGORY_SUMMARY,
      }),
      this.db.service.count({ where }),
    ]);
  }

  findById(id: string): Promise<ServiceWithCategoryRow | null> {
    return this.db.service.findUnique({ where: { id }, include: CATEGORY_SUMMARY });
  }

  /** Business Rule: فريد على (categoryId, name) - مدعوم بفهرس فريد بالقاعدة */
  findByNameInCategory(categoryId: string, name: string): Promise<Service | null> {
    return this.db.service.findUnique({
      where: { categoryId_name: { categoryId, name } },
    });
  }

  findCategoryById(id: string): Promise<ServiceCategory | null> {
    return this.db.serviceCategory.findUnique({ where: { id } });
  }

  /** عدد بنود الطلبات المرتبطة بالخدمة */
  countOrderItems(serviceId: string): Promise<number> {
    return this.db.orderItem.count({ where: { serviceId } });
  }

  // ==================== Mutations ====================

  create(data: Prisma.ServiceCreateInput): Promise<ServiceWithCategoryRow> {
    return this.db.service.create({ data, include: CATEGORY_SUMMARY });
  }

  update(id: string, data: Prisma.ServiceUpdateInput): Promise<ServiceWithCategoryRow> {
    return this.db.service.update({ where: { id }, data, include: CATEGORY_SUMMARY });
  }
}
