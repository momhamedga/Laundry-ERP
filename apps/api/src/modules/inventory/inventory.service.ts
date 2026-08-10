import type { AuditAction, InventoryItem, Prisma } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import type { RequestContext } from "../auth/auth.types.js";
import type { AuthenticatedUser } from "../auth/index.js";
import { notificationBus } from "../notifications/index.js";
import type {
  AdjustDto,
  CreateItemDto,
  CreateMovementDto,
  ListAlertsQuery,
  ListItemsQuery,
  ListMovementsQuery,
  StockCountDto,
  TransferDto,
  UpdateItemDto,
} from "./inventory.dto.js";
import { applyStockMovement, type InventoryRepository } from "./inventory.repository.js";
import type {
  InventoryStats,
  ListAlertsResult,
  ListItemsResult,
  ListMovementsResult,
  StockCountResultLine,
} from "./inventory.types.js";
import {
  buildItemOrderBy,
  buildItemWhere,
  buildPaginationMeta,
  toSkipTake,
} from "./inventory.utils.js";

export class InventoryService {
  constructor(private readonly repo: InventoryRepository) {}

  private async getItemOrFail(id: string): Promise<InventoryItem> {
    const item = await this.repo.findItemById(id);
    if (!item) throw new ApiError(404, "الصنف غير موجود في المخزون.");
    return item;
  }

  // ==================== Items ====================

  async list(query: ListItemsQuery): Promise<ListItemsResult> {
    const where = buildItemWhere(query);
    if (query.lowStock === true) {
      const ids = await this.repo.findLowStockItemIds();
      where.id = { in: ids.length > 0 ? ids : ["__none__"] };
    }
    const { skip, take } = toSkipTake(query.page, query.limit);
    const [items, total] = await this.repo.findItems(where, buildItemOrderBy(query), skip, take);
    return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  getById(id: string): Promise<InventoryItem> {
    return this.getItemOrFail(id);
  }

  getStats(): Promise<InventoryStats> {
    return this.repo.getStats();
  }

  async create(
    dto: CreateItemDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<InventoryItem> {
    const existing = await this.repo.findItemBySku(dto.sku);
    if (existing) throw new ApiError(409, "رمز الصنف (SKU) موجود بالفعل.");

    const item = await this.repo.createItemWithOpening(
      {
        sku: dto.sku,
        name: dto.name,
        type: dto.type,
        unit: dto.unit,
        category: dto.category ?? null,
        description: dto.description ?? null,
        reorderLevel: dto.reorderLevel,
        costPrice: dto.costPrice,
        sellPrice: dto.sellPrice,
        supplierId: dto.supplierId ?? null,
      },
      dto.quantity,
      actor.id,
    );

    await this.audit("INVENTORY_ITEM_CREATED", actor, ctx, {
      itemId: item.id,
      sku: item.sku,
      openingQuantity: dto.quantity,
    });
    await this.syncAlerts(item.id, actor.email);
    return item;
  }

  async update(
    id: string,
    dto: UpdateItemDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<InventoryItem> {
    await this.getItemOrFail(id);
    const item = await this.repo.updateItem(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.reorderLevel !== undefined ? { reorderLevel: dto.reorderLevel } : {}),
      ...(dto.costPrice !== undefined ? { costPrice: dto.costPrice } : {}),
      ...(dto.sellPrice !== undefined ? { sellPrice: dto.sellPrice } : {}),
      ...(dto.supplierId !== undefined
        ? dto.supplierId === null
          ? { supplier: { disconnect: true } }
          : { supplier: { connect: { id: dto.supplierId } } }
        : {}),
    });
    await this.audit("INVENTORY_ITEM_UPDATED", actor, ctx, { itemId: id, changes: dto });
    // تغيّر reorderLevel قد يقلب حالة التنبيه
    await this.syncAlerts(id, actor.email);
    return item;
  }

  async softDelete(id: string, actor: AuthenticatedUser, ctx: RequestContext): Promise<void> {
    const item = await this.getItemOrFail(id);
    if (!item.isActive) throw new ApiError(400, "الصنف موقوف بالفعل.");
    await this.repo.updateItem(id, { isActive: false });
    await this.audit("INVENTORY_ITEM_DELETED", actor, ctx, { itemId: id, sku: item.sku });
  }

  async restore(id: string, actor: AuthenticatedUser, ctx: RequestContext): Promise<InventoryItem> {
    const item = await this.getItemOrFail(id);
    if (item.isActive) throw new ApiError(400, "الصنف نشط بالفعل.");
    const updated = await this.repo.updateItem(id, { isActive: true });
    await this.audit("INVENTORY_ITEM_UPDATED", actor, ctx, { itemId: id, restored: true });
    return updated;
  }

  // ==================== Movements ====================

  async createMovement(
    id: string,
    dto: CreateMovementDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<InventoryItem> {
    await this.getItemOrFail(id);
    await this.repo.runInTransaction((tx) =>
      applyStockMovement(tx, {
        itemId: id,
        type: dto.type,
        quantity: dto.quantity,
        unitCost: dto.unitCost ?? null,
        reference: dto.reference ?? null,
        note: dto.note ?? null,
        actorId: actor.id,
      }),
    );
    await this.audit("INVENTORY_ITEM_UPDATED", actor, ctx, {
      itemId: id,
      movement: dto.type,
      quantity: dto.quantity,
    });
    await this.syncAlerts(id, actor.email);
    return this.getItemOrFail(id);
  }

  /** تعديل الرصيد لقيمة مطلقة (تصحيح/جرد فردي) */
  async adjust(
    id: string,
    dto: AdjustDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<InventoryItem> {
    const item = await this.getItemOrFail(id);
    const previous = Number(item.quantity);
    const delta = dto.newQuantity - previous;

    await this.repo.runInTransaction(async (tx) => {
      await tx.inventoryAdjustment.create({
        data: {
          itemId: id,
          previousQuantity: previous,
          newQuantity: dto.newQuantity,
          delta,
          reason: dto.reason,
          actorId: actor.id,
        },
      });
      if (delta !== 0) {
        await applyStockMovement(tx, {
          itemId: id,
          type: "ADJUSTMENT",
          quantity: Math.abs(delta),
          reference: "adjustment",
          note: dto.reason,
          actorId: actor.id,
          directionOverride: delta > 0 ? "increase" : "decrease",
        });
      }
    });

    await this.audit("INVENTORY_ADJUSTED", actor, ctx, {
      itemId: id,
      previous,
      newQuantity: dto.newQuantity,
      reason: dto.reason,
    });
    this.emit({
      type: "STOCK_ADJUSTED",
      data: {
        itemId: id,
        itemName: item.name,
        sku: item.sku,
        previousQuantity: previous,
        newQuantity: dto.newQuantity,
        actorEmail: actor.email,
      },
    });
    await this.syncAlerts(id, actor.email);
    return this.getItemOrFail(id);
  }

  /** تحويل كمية بين صنفين - OUT من المصدر + IN للوجهة في معاملة واحدة */
  async transfer(dto: TransferDto, actor: AuthenticatedUser, ctx: RequestContext): Promise<void> {
    const [from, to] = await Promise.all([
      this.getItemOrFail(dto.fromItemId),
      this.getItemOrFail(dto.toItemId),
    ]);

    await this.repo.runInTransaction(async (tx) => {
      await applyStockMovement(tx, {
        itemId: from.id,
        type: "TRANSFER",
        quantity: dto.quantity,
        reference: `transfer→${to.sku}`,
        note: dto.note ?? null,
        actorId: actor.id,
        directionOverride: "decrease",
      });
      await applyStockMovement(tx, {
        itemId: to.id,
        type: "TRANSFER",
        quantity: dto.quantity,
        reference: `transfer←${from.sku}`,
        note: dto.note ?? null,
        actorId: actor.id,
        directionOverride: "increase",
      });
    });

    await this.audit("INVENTORY_TRANSFERRED", actor, ctx, {
      fromItemId: from.id,
      toItemId: to.id,
      quantity: dto.quantity,
    });
    await this.syncAlerts(from.id, actor.email);
    await this.syncAlerts(to.id, actor.email);
  }

  /** جرد مخزون - لقطة لكل صنف + تعديل تلقائي عند الفرق */
  async stockCount(
    dto: StockCountDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<StockCountResultLine[]> {
    const results: StockCountResultLine[] = [];

    await this.repo.runInTransaction(async (tx) => {
      for (const line of dto.lines) {
        const item = await tx.inventoryItem.findUnique({
          where: { id: line.itemId },
          select: { quantity: true },
        });
        if (!item) throw new ApiError(404, `الصنف غير موجود (${line.itemId}).`);
        const systemQty = Number(item.quantity);
        const diff = line.countedQuantity - systemQty;

        await tx.inventorySnapshot.create({
          data: {
            itemId: line.itemId,
            systemQuantity: systemQty,
            countedQuantity: line.countedQuantity,
            difference: diff,
            note: dto.note ?? null,
            createdById: actor.id,
          },
        });

        if (diff !== 0) {
          await tx.inventoryAdjustment.create({
            data: {
              itemId: line.itemId,
              previousQuantity: systemQty,
              newQuantity: line.countedQuantity,
              delta: diff,
              reason: "جرد مخزون",
              actorId: actor.id,
            },
          });
          await applyStockMovement(tx, {
            itemId: line.itemId,
            type: "ADJUSTMENT",
            quantity: Math.abs(diff),
            reference: "stock-count",
            note: dto.note ?? "جرد مخزون",
            actorId: actor.id,
            directionOverride: diff > 0 ? "increase" : "decrease",
          });
        }
        results.push({
          itemId: line.itemId,
          systemQuantity: systemQty,
          countedQuantity: line.countedQuantity,
          difference: diff,
          adjusted: diff !== 0,
        });
      }
    });

    await this.audit("INVENTORY_COUNTED", actor, ctx, {
      lines: dto.lines.length,
      adjusted: results.filter((r) => r.adjusted).length,
    });
    for (const r of results.filter((x) => x.adjusted)) {
      await this.syncAlerts(r.itemId, actor.email);
    }
    return results;
  }

  // ==================== Movements / Alerts read ====================

  listMovements(query: ListMovementsQuery): Promise<ListMovementsResult> {
    return this.repo.listMovements(query);
  }

  listAlerts(query: ListAlertsQuery): Promise<ListAlertsResult> {
    return this.repo.listAlerts(query);
  }

  async resolveAlert(id: string): Promise<void> {
    const alert = await this.repo.findAlertById(id);
    if (!alert) throw new ApiError(404, "التنبيه غير موجود.");
    if (alert.status === "RESOLVED") throw new ApiError(400, "التنبيه معالَج بالفعل.");
    await this.repo.resolveAlert(id);
  }

  // ==================== Alert engine ====================

  /** واجهة عامة لإعادة تقييم تنبيهات صنف (تُستخدم من وحدة المشتريات بعد الاستلام) */
  refreshAlerts(itemId: string): Promise<void> {
    return this.syncAlerts(itemId, "system@purchase");
  }

  /**
   * يوائم تنبيهات الصنف مع رصيده الحالي (بعد أي حركة). يمنع تكرار الإشعار:
   * يُطلق LOW_STOCK/OUT_OF_STOCK فقط عند الدخول الجديد للحالة (لا تنبيه OPEN سابق
   * بنفس النوع). خروج الرصيد فوق الحدّ يُغلق التنبيه المفتوح بلا إشعار.
   */
  private async syncAlerts(itemId: string, actorEmail: string): Promise<void> {
    const item = await this.repo.findItemById(itemId);
    if (!item || !item.isActive) return;

    const quantity = Number(item.quantity);
    const reorder = Number(item.reorderLevel);
    const desired: "OUT_OF_STOCK" | "LOW_STOCK" | null =
      quantity <= 0 ? "OUT_OF_STOCK" : reorder > 0 && quantity <= reorder ? "LOW_STOCK" : null;

    const open = await this.repo.findOpenAlert(itemId);

    if (desired === null) {
      if (open) await this.repo.resolveAlert(open.id);
      return;
    }
    if (open && open.type === desired) return; // نفس الحالة - لا تكرار
    if (open) await this.repo.resolveAlert(open.id); // تغيّر النوع (LOW→OUT) - أغلق القديم

    await this.repo.createAlert(itemId, desired, quantity, reorder);
    if (desired === "OUT_OF_STOCK") {
      this.emit({
        type: "OUT_OF_STOCK",
        data: { itemId, itemName: item.name, sku: item.sku },
      });
    } else {
      this.emit({
        type: "LOW_STOCK",
        data: { itemId, itemName: item.name, sku: item.sku, quantity, reorderLevel: reorder },
      });
    }
    void actorEmail;
  }

  // ==================== Helpers ====================

  private emit(event: Parameters<typeof notificationBus.emitNotification>[0]): void {
    try {
      notificationBus.emitNotification(event);
    } catch {
      // fire-and-forget - فشل الإشعار لا يُفشِل عملية المخزون
    }
  }

  private audit(
    action: AuditAction,
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
