import type { Prisma, PrismaClient, ServiceCategory } from "@prisma/client";

type CategoryWithServicesCount = ServiceCategory & { _count: { services: number } };

const WITH_COUNT = { _count: { select: { services: true } } } as const;

/**
 * Repository Pattern - كل وصول لقاعدة البيانات الخاص بتصنيفات الخدمات
 */
export class CategoryRepository {
  constructor(private readonly db: PrismaClient) {}

  // ==================== Queries ====================

  /** قائمة + العدد الكلي في transaction واحدة */
  findManyWithCount(
    where: Prisma.ServiceCategoryWhereInput,
    orderBy: Prisma.ServiceCategoryOrderByWithRelationInput,
    skip: number,
    take: number,
  ): Promise<[CategoryWithServicesCount[], number]> {
    return this.db.$transaction([
      this.db.serviceCategory.findMany({
        where,
        orderBy,
        skip,
        take,
        include: WITH_COUNT,
      }),
      this.db.serviceCategory.count({ where }),
    ]);
  }

  findById(id: string): Promise<CategoryWithServicesCount | null> {
    return this.db.serviceCategory.findUnique({
      where: { id },
      include: WITH_COUNT,
    });
  }

  findByName(name: string): Promise<ServiceCategory | null> {
    return this.db.serviceCategory.findUnique({ where: { name } });
  }

  countServices(categoryId: string): Promise<number> {
    return this.db.service.count({ where: { categoryId } });
  }

  // ==================== Mutations ====================

  create(data: Prisma.ServiceCategoryCreateInput): Promise<ServiceCategory> {
    return this.db.serviceCategory.create({ data });
  }

  update(id: string, data: Prisma.ServiceCategoryUpdateInput): Promise<ServiceCategory> {
    return this.db.serviceCategory.update({ where: { id }, data });
  }

  /** حذف فعلي - يُستدعى فقط بعد التأكد من خلو التصنيف من الخدمات */
  hardDelete(id: string): Promise<ServiceCategory> {
    return this.db.serviceCategory.delete({ where: { id } });
  }
}
