import type { AuditAction, Prisma, Purchase } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import type { RequestContext } from "../auth/auth.types.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type { InventoryService } from "../inventory/index.js";
import { notificationBus } from "../notifications/index.js";
import type { CreatePurchaseDto, ListPurchasesQuery, UpdatePurchaseDto } from "./purchases.dto.js";
import type { PurchasesRepository } from "./purchases.repository.js";
import type { ListPurchasesResult, PurchaseDetail } from "./purchases.types.js";
import { computeTotals } from "./purchases.utils.js";

export class PurchasesService {
  constructor(
    private readonly repo: PurchasesRepository,
    /** لإعادة تقييم تنبيهات الأصناف بعد الاستلام - إعادة استخدام محرك التنبيهات بلا تكرار */
    private readonly inventory: InventoryService,
  ) {}

  private async getOrFail(id: string): Promise<Purchase> {
    const purchase = await this.repo.findBasic(id);
    if (!purchase) throw new ApiError(404, "أمر الشراء غير موجود.");
    return purchase;
  }

  private async getDetailOrFail(id: string): Promise<PurchaseDetail> {
    const detail = await this.repo.findDetail(id);
    if (!detail) throw new ApiError(404, "أمر الشراء غير موجود.");
    return detail;
  }

  list(query: ListPurchasesQuery): Promise<ListPurchasesResult> {
    return this.repo.list(query);
  }

  getById(id: string): Promise<PurchaseDetail> {
    return this.getDetailOrFail(id);
  }

  async create(
    dto: CreatePurchaseDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<PurchaseDetail> {
    const totals = computeTotals(dto.items, dto.taxRate);
    const purchase = await this.repo.createWithItems({
      supplierId: dto.supplierId,
      createdById: actor.id,
      taxRate: dto.taxRate,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      notes: dto.notes ?? null,
      items: dto.items.map((i) => ({
        itemId: i.itemId,
        quantity: i.quantity,
        unitCost: i.unitCost,
        total: Number((i.quantity * i.unitCost).toFixed(2)),
      })),
    });
    await this.audit("PURCHASE_CREATED", actor, ctx, {
      purchaseId: purchase.id,
      purchaseNumber: purchase.purchaseNumber,
      total: totals.total,
    });
    return purchase;
  }

  async update(
    id: string,
    dto: UpdatePurchaseDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<PurchaseDetail> {
    const purchase = await this.getOrFail(id);
    if (purchase.status !== "DRAFT") {
      throw new ApiError(409, "لا يمكن تعديل أمر شراء إلا وهو في حالة مسودة.");
    }
    // إن لم تُرسَل البنود/الضريبة، نُبقي القيم الحالية
    const items = dto.items ?? (await this.getDetailOrFail(id)).items.map((i) => ({
      itemId: i.itemId,
      quantity: Number(i.quantity),
      unitCost: Number(i.unitCost),
    }));
    const taxRate = dto.taxRate ?? Number(purchase.taxRate);
    const totals = computeTotals(items, taxRate);

    const updated = await this.repo.updateDraft(
      id,
      {
        ...(dto.supplierId ? { supplierId: dto.supplierId } : {}),
        taxRate,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      items.map((i) => ({
        itemId: i.itemId,
        quantity: i.quantity,
        unitCost: i.unitCost,
        total: Number((i.quantity * i.unitCost).toFixed(2)),
      })),
    );
    await this.audit("PURCHASE_UPDATED", actor, ctx, { purchaseId: id, changes: dto });
    return updated;
  }

  async remove(id: string, actor: AuthenticatedUser, ctx: RequestContext): Promise<void> {
    const purchase = await this.getOrFail(id);
    if (purchase.status !== "DRAFT") {
      throw new ApiError(409, "لا يمكن حذف أمر شراء إلا وهو في حالة مسودة.");
    }
    await this.repo.deleteDraft(id);
    await this.audit("PURCHASE_DELETED", actor, ctx, { purchaseId: id, purchaseNumber: purchase.purchaseNumber });
  }

  /** استلام: يزيد المخزون (حركات IN) + PURCHASE_RECEIVED + إعادة تقييم التنبيهات */
  async receive(id: string, actor: AuthenticatedUser, ctx: RequestContext): Promise<PurchaseDetail> {
    const purchase = await this.getOrFail(id);
    if (purchase.status === "RECEIVED") throw new ApiError(409, "أمر الشراء مستلَم بالفعل.");
    if (purchase.status === "CANCELLED") throw new ApiError(409, "لا يمكن استلام أمر شراء ملغي.");

    const { purchase: received, itemIds } = await this.repo.receive(id, actor.id);

    await this.audit("PURCHASE_RECEIVED", actor, ctx, {
      purchaseId: id,
      purchaseNumber: received.purchaseNumber,
      total: Number(received.total),
    });
    this.emit({
      type: "PURCHASE_RECEIVED",
      data: {
        purchaseId: id,
        purchaseNumber: received.purchaseNumber,
        supplierName: received.supplier.name,
        total: Number(received.total),
      },
    });
    // زيادة المخزون تُغلِق تنبيهات النقص المفتوحة إن تجاوز الرصيد الحدّ
    for (const itemId of itemIds) await this.inventory.refreshAlerts(itemId);
    return received;
  }

  async cancel(id: string, actor: AuthenticatedUser, ctx: RequestContext): Promise<Purchase> {
    const purchase = await this.getOrFail(id);
    if (purchase.status === "RECEIVED") {
      throw new ApiError(409, "لا يمكن إلغاء أمر شراء تم استلامه.");
    }
    if (purchase.status === "CANCELLED") throw new ApiError(409, "أمر الشراء ملغي بالفعل.");

    const cancelled = await this.repo.updateStatus(id, { status: "CANCELLED" });
    const detail = await this.getDetailOrFail(id);
    await this.audit("PURCHASE_CANCELLED", actor, ctx, {
      purchaseId: id,
      purchaseNumber: purchase.purchaseNumber,
    });
    this.emit({
      type: "PURCHASE_CANCELLED",
      data: {
        purchaseId: id,
        purchaseNumber: detail.purchaseNumber,
        supplierName: detail.supplier.name,
      },
    });
    return cancelled;
  }

  private emit(event: Parameters<typeof notificationBus.emitNotification>[0]): void {
    try {
      notificationBus.emitNotification(event);
    } catch {
      // fire-and-forget
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
