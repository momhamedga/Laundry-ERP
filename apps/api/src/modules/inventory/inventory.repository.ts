import type {
  AuditAction,
  InventoryAlert,
  InventoryAlertType,
  InventoryItem,
  InventoryTransactionType,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import { INCREASING_TYPES } from "./inventory.constants.js";
import type {
  AlertWithItem,
  ListAlertsResult,
  ListMovementsResult,
} from "./inventory.types.js";
import type { ListAlertsQuery, ListMovementsQuery } from "./inventory.dto.js";
import { buildMovementWhere, buildPaginationMeta, toSkipTake } from "./inventory.utils.js";

const MOVEMENT_ITEM_SELECT = {
  item: { select: { id: true, name: true, sku: true, unit: true } },
} as const;

/**
 * حركة مخزون ذرّية - تُستدعى داخل معاملة (Transaction) من عدة وحدات (المخزون
 * والمشتريات) بلا تكرار منطق before/after. الاتجاه يُستنتج من النوع أو يُفرض
 * صراحة (TRANSFER يحتاج الاتجاهين). يمنع الرصيد السالب.
 */
export interface MovementParams {
  itemId: string;
  type: InventoryTransactionType;
  quantity: number;
  unitCost?: number | null;
  reference?: string | null;
  note?: string | null;
  actorId: string | null;
  directionOverride?: "increase" | "decrease";
}

export async function applyStockMovement(
  tx: Prisma.TransactionClient,
  p: MovementParams,
): Promise<{ before: number; after: number }> {
  const item = await tx.inventoryItem.findUnique({
    where: { id: p.itemId },
    select: { quantity: true },
  });
  if (!item) throw new ApiError(404, "الصنف غير موجود في المخزون.");

  const before = Number(item.quantity);
  const increasing = p.directionOverride
    ? p.directionOverride === "increase"
    : INCREASING_TYPES.has(p.type);
  const after = increasing ? before + p.quantity : before - p.quantity;
  if (after < 0) throw new ApiError(400, "الرصيد غير كافٍ لتنفيذ هذه الحركة.");

  await tx.inventoryItem.update({ where: { id: p.itemId }, data: { quantity: after } });
  await tx.inventoryTransaction.create({
    data: {
      itemId: p.itemId,
      type: p.type,
      quantity: p.quantity,
      beforeQuantity: before,
      afterQuantity: after,
      unitCost: p.unitCost ?? null,
      reference: p.reference ?? null,
      note: p.note ?? null,
      actorId: p.actorId,
    },
  });
  return { before, after };
}

export class InventoryRepository {
  constructor(private readonly db: PrismaClient) {}

  get client(): PrismaClient {
    return this.db;
  }

  // ==================== Items ====================

  findItems(
    where: Prisma.InventoryItemWhereInput,
    orderBy: Prisma.InventoryItemOrderByWithRelationInput,
    skip: number,
    take: number,
  ): Promise<[InventoryItem[], number]> {
    return this.db.$transaction([
      this.db.inventoryItem.findMany({ where, orderBy, skip, take }),
      this.db.inventoryItem.count({ where }),
    ]);
  }

  findItemById(id: string): Promise<InventoryItem | null> {
    return this.db.inventoryItem.findUnique({ where: { id } });
  }

  findItemBySku(sku: string): Promise<InventoryItem | null> {
    return this.db.inventoryItem.findUnique({ where: { sku } });
  }

  updateItem(id: string, data: Prisma.InventoryItemUpdateInput): Promise<InventoryItem> {
    return this.db.inventoryItem.update({ where: { id }, data });
  }

  /** إنشاء صنف + حركة افتتاحية (OPENING) إن كان الرصيد الأولي > 0 - معاملة واحدة */
  createItemWithOpening(
    data: Prisma.InventoryItemUncheckedCreateInput,
    opening: number,
    actorId: string | null,
  ): Promise<InventoryItem> {
    return this.db.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({ data: { ...data, quantity: 0 } });
      if (opening > 0) {
        await applyStockMovement(tx, {
          itemId: item.id,
          type: "OPENING",
          quantity: opening,
          actorId,
          note: "رصيد افتتاحي",
        });
        return tx.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
      }
      return item;
    });
  }

  // ==================== Movements ====================

  async listMovements(query: ListMovementsQuery): Promise<ListMovementsResult> {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where = buildMovementWhere(query);
    const [movements, total] = await this.db.$transaction([
      this.db.inventoryTransaction.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip,
        take,
        include: MOVEMENT_ITEM_SELECT,
      }),
      this.db.inventoryTransaction.count({ where }),
    ]);
    return { movements, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  // ==================== Adjust / Transfer / Count (transactional) ====================

  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.db.$transaction(fn, { timeout: 60_000 });
  }

  // ==================== Alerts ====================

  findOpenAlert(itemId: string): Promise<InventoryAlert | null> {
    return this.db.inventoryAlert.findFirst({ where: { itemId, status: "OPEN" } });
  }

  createAlert(
    itemId: string,
    type: InventoryAlertType,
    quantity: number,
    threshold: number,
  ): Promise<InventoryAlert> {
    return this.db.inventoryAlert.create({
      data: { itemId, type, quantity, threshold, status: "OPEN" },
    });
  }

  resolveAlert(id: string): Promise<InventoryAlert> {
    return this.db.inventoryAlert.update({
      where: { id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
  }

  findAlertById(id: string): Promise<InventoryAlert | null> {
    return this.db.inventoryAlert.findUnique({ where: { id } });
  }

  async listAlerts(query: ListAlertsQuery): Promise<ListAlertsResult> {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.InventoryAlertWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    const [alerts, total] = await this.db.$transaction([
      this.db.inventoryAlert.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: { item: { select: { id: true, name: true, sku: true } } },
      }),
      this.db.inventoryAlert.count({ where }),
    ]);
    return { alerts: alerts as AlertWithItem[], meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  // ==================== Stats ====================

  async getStats(): Promise<{
    totalItems: number;
    activeItems: number;
    outOfStockCount: number;
    openAlerts: number;
    lowStockCount: number;
    totalStockValue: number;
  }> {
    const [totalItems, activeItems, outOfStockCount, openAlerts, lowStockRows] =
      await this.db.$transaction([
        this.db.inventoryItem.count(),
        this.db.inventoryItem.count({ where: { isActive: true } }),
        this.db.inventoryItem.count({ where: { isActive: true, quantity: { lte: 0 } } }),
        this.db.inventoryAlert.count({ where: { status: "OPEN" } }),
        // نقص المخزون: quantity <= reorderLevel (مقارنة عمودين) عبر raw
        this.db.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*)::bigint AS count FROM "inventory_items"
          WHERE "isActive" = true AND "quantity" <= "reorderLevel" AND "reorderLevel" > 0`,
      ]);

    // قيمة المخزون: SUM(quantity * costPrice) عبر raw لتفادي جلب كل الصفوف
    const valueRows = await this.db.$queryRaw<{ value: string | null }[]>`
      SELECT COALESCE(SUM("quantity" * "costPrice"), 0)::text AS value
      FROM "inventory_items" WHERE "isActive" = true`;

    return {
      totalItems,
      activeItems,
      outOfStockCount,
      openAlerts,
      lowStockCount: Number(lowStockRows[0]?.count ?? 0),
      totalStockValue: Number(valueRows[0]?.value ?? 0),
    };
  }

  /** معرّفات الأصناف منخفضة المخزون - لفلتر lowStock بالقائمة */
  async findLowStockItemIds(): Promise<string[]> {
    const rows = await this.db.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "inventory_items"
      WHERE "isActive" = true AND "quantity" <= "reorderLevel" AND "reorderLevel" > 0`;
    return rows.map((r) => r.id);
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
