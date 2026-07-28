import type { Branch, Prisma, PrismaClient } from "@prisma/client";

type BranchWithCountsRow = Branch & { _count: { users: number; orders: number } };

const WITH_COUNTS = { _count: { select: { users: true, orders: true } } } as const;

/**
 * Repository Pattern - كل وصول لقاعدة البيانات الخاص بالفروع
 */
export class BranchesRepository {
  constructor(private readonly db: PrismaClient) {}

  // ==================== Queries ====================

  findManyWithCount(
    where: Prisma.BranchWhereInput,
    orderBy: Prisma.BranchOrderByWithRelationInput,
    skip: number,
    take: number,
  ): Promise<[BranchWithCountsRow[], number]> {
    return this.db.$transaction([
      this.db.branch.findMany({ where, orderBy, skip, take, include: WITH_COUNTS }),
      this.db.branch.count({ where }),
    ]);
  }

  findById(id: string): Promise<BranchWithCountsRow | null> {
    return this.db.branch.findUnique({ where: { id }, include: WITH_COUNTS });
  }

  findByName(name: string): Promise<Branch | null> {
    return this.db.branch.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
  }

  // ==================== Mutations ====================

  create(data: Prisma.BranchCreateInput): Promise<Branch> {
    return this.db.branch.create({ data });
  }

  update(id: string, data: Prisma.BranchUpdateInput): Promise<Branch> {
    return this.db.branch.update({ where: { id }, data });
  }

  /** حذف فعلي - فقط بعد التأكد من عدم وجود موظفين/طلبات */
  hardDelete(id: string): Promise<Branch> {
    return this.db.branch.delete({ where: { id } });
  }
}
