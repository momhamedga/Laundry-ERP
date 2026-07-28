import type { AuditAction, Prisma, PrismaClient, Supplier } from "@prisma/client";
import type { SupplierStats } from "./suppliers.types.js";

/** Repository Pattern - كل وصول لقاعدة البيانات الخاص بالموردين */
export class SuppliersRepository {
  constructor(private readonly db: PrismaClient) {}

  findManyWithCount(
    where: Prisma.SupplierWhereInput,
    orderBy: Prisma.SupplierOrderByWithRelationInput,
    skip: number,
    take: number,
  ): Promise<[Supplier[], number]> {
    return this.db.$transaction([
      this.db.supplier.findMany({ where, orderBy, skip, take }),
      this.db.supplier.count({ where }),
    ]);
  }

  findById(id: string): Promise<Supplier | null> {
    return this.db.supplier.findUnique({ where: { id } });
  }

  create(data: Prisma.SupplierCreateInput): Promise<Supplier> {
    return this.db.supplier.create({ data });
  }

  update(id: string, data: Prisma.SupplierUpdateInput): Promise<Supplier> {
    return this.db.supplier.update({ where: { id }, data });
  }

  /** إحصائيات المورّد محسوبة من القاعدة مباشرة - لا قيم مخزَّنة */
  async getStats(supplierId: string): Promise<SupplierStats> {
    const [totalPurchases, receivedPurchases, financials, itemsSupplied, lastPurchase] =
      await this.db.$transaction([
        this.db.purchase.count({ where: { supplierId } }),
        this.db.purchase.count({ where: { supplierId, status: "RECEIVED" } }),
        this.db.purchase.aggregate({
          where: { supplierId, status: "RECEIVED" },
          _sum: { total: true },
        }),
        this.db.inventoryItem.count({ where: { supplierId } }),
        this.db.purchase.findFirst({
          where: { supplierId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
      ]);

    return {
      totalPurchases,
      receivedPurchases,
      totalSpent: financials._sum.total ? Number(financials._sum.total) : 0,
      itemsSupplied,
      lastPurchaseAt: lastPurchase?.createdAt ?? null,
    };
  }

  createAuditLog(entry: {
    action: AuditAction;
    userId: string;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: Prisma.InputJsonValue;
  }): Promise<unknown> {
    return this.db.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        metadata: entry.metadata,
      },
    });
  }
}
