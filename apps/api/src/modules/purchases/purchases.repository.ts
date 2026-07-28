import type { AuditAction, Prisma, PrismaClient, Purchase } from "@prisma/client";
import { applyStockMovement } from "../inventory/index.js";
import {
  PURCHASE_NUMBER_MAX_RETRIES,
} from "./purchases.constants.js";
import type { ListPurchasesQuery } from "./purchases.dto.js";
import type {
  ListPurchasesResult,
  PurchaseDetail,
} from "./purchases.types.js";
import {
  buildPaginationMeta,
  buildPurchaseWhere,
  formatPurchaseNumber,
  parseSequence,
  purchaseNumberPrefixForYear,
  toSkipTake,
} from "./purchases.utils.js";

const DETAIL_INCLUDE = {
  supplier: { select: { id: true, name: true } },
  items: { include: { item: { select: { id: true, name: true, sku: true, unit: true } } } },
} as const;

export interface PurchaseLineData {
  itemId: string;
  quantity: number;
  unitCost: number;
  total: number;
}

export interface CreatePurchaseData {
  supplierId: string;
  createdById: string;
  taxRate: number;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  items: PurchaseLineData[];
}

export class PurchasesRepository {
  constructor(private readonly db: PrismaClient) {}

  async list(query: ListPurchasesQuery): Promise<ListPurchasesResult> {
    const where = buildPurchaseWhere(query);
    const { skip, take } = toSkipTake(query.page, query.limit);
    const [purchases, total] = await this.db.$transaction([
      this.db.purchase.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip,
        take,
        include: { supplier: { select: { id: true, name: true } }, _count: { select: { items: true } } },
      }),
      this.db.purchase.count({ where }),
    ]);
    return {
      purchases,
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  findDetail(id: string): Promise<PurchaseDetail | null> {
    return this.db.purchase.findUnique({ where: { id }, include: DETAIL_INCLUDE });
  }

  findBasic(id: string): Promise<Purchase | null> {
    return this.db.purchase.findUnique({ where: { id } });
  }

  /** إنشاء أمر شراء + بنوده مع توليد رقم فريد داخل معاملة (إعادة محاولة عند التصادم) */
  async createWithItems(data: CreatePurchaseData): Promise<PurchaseDetail> {
    const year = new Date().getFullYear();
    const prefix = purchaseNumberPrefixForYear(year);

    for (let attempt = 1; attempt <= PURCHASE_NUMBER_MAX_RETRIES; attempt++) {
      try {
        return await this.db.$transaction(async (tx) => {
          const last = await tx.purchase.findFirst({
            where: { purchaseNumber: { startsWith: prefix } },
            orderBy: { purchaseNumber: "desc" },
            select: { purchaseNumber: true },
          });
          const sequence = last ? parseSequence(last.purchaseNumber, prefix) + 1 : 1;

          const created = await tx.purchase.create({
            data: {
              purchaseNumber: formatPurchaseNumber(year, sequence),
              supplierId: data.supplierId,
              createdById: data.createdById,
              status: "DRAFT",
              taxRate: data.taxRate,
              subtotal: data.subtotal,
              tax: data.tax,
              total: data.total,
              notes: data.notes,
              items: {
                create: data.items.map((i) => ({
                  itemId: i.itemId,
                  quantity: i.quantity,
                  unitCost: i.unitCost,
                  total: i.total,
                })),
              },
            },
            include: DETAIL_INCLUDE,
          });
          return created;
        });
      } catch (err) {
        if (
          attempt < PURCHASE_NUMBER_MAX_RETRIES &&
          err instanceof Error &&
          err.message.includes("purchaseNumber")
        ) {
          continue;
        }
        throw err;
      }
    }
    throw new Error("Failed to generate a unique purchase number");
  }

  /** تحديث أمر DRAFT: استبدال البنود بالكامل + إعادة حساب الإجماليات (معاملة) */
  updateDraft(
    id: string,
    header: { supplierId?: string; taxRate: number; subtotal: number; tax: number; total: number; notes?: string | null },
    items: PurchaseLineData[],
  ): Promise<PurchaseDetail> {
    return this.db.$transaction(async (tx) => {
      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
      return tx.purchase.update({
        where: { id },
        data: {
          ...(header.supplierId ? { supplierId: header.supplierId } : {}),
          taxRate: header.taxRate,
          subtotal: header.subtotal,
          tax: header.tax,
          total: header.total,
          ...(header.notes !== undefined ? { notes: header.notes } : {}),
          items: {
            create: items.map((i) => ({
              itemId: i.itemId,
              quantity: i.quantity,
              unitCost: i.unitCost,
              total: i.total,
            })),
          },
        },
        include: DETAIL_INCLUDE,
      });
    });
  }

  deleteDraft(id: string): Promise<Purchase> {
    return this.db.purchase.delete({ where: { id } });
  }

  updateStatus(id: string, data: Prisma.PurchaseUpdateInput): Promise<Purchase> {
    return this.db.purchase.update({ where: { id }, data });
  }

  /**
   * استلام أمر شراء (معاملة ذرّية): لكل بند حركة IN + تحديث تكلفة الصنف (آخر تكلفة)
   * + تعيين الحالة RECEIVED. يعيد معرّفات الأصناف المتأثرة لإعادة تقييم التنبيهات.
   */
  async receive(id: string, actorId: string): Promise<{ purchase: PurchaseDetail; itemIds: string[] }> {
    const purchase = await this.db.$transaction(async (tx) => {
      const p = await tx.purchase.findUniqueOrThrow({ where: { id }, include: DETAIL_INCLUDE });
      for (const line of p.items) {
        await applyStockMovement(tx, {
          itemId: line.itemId,
          type: "IN",
          quantity: Number(line.quantity),
          unitCost: Number(line.unitCost),
          reference: p.purchaseNumber,
          note: "استلام أمر شراء",
          actorId,
        });
        await tx.inventoryItem.update({
          where: { id: line.itemId },
          data: { costPrice: line.unitCost },
        });
      }
      return tx.purchase.update({
        where: { id },
        data: { status: "RECEIVED", receivedAt: new Date() },
        include: DETAIL_INCLUDE,
      });
    });
    return { purchase, itemIds: purchase.items.map((i) => i.itemId) };
  }

  countBySupplier(supplierId: string): Promise<number> {
    return this.db.purchase.count({ where: { supplierId } });
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
