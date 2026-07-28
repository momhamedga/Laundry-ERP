import type { AuditAction, InventoryItem, LabelTemplate, Prisma } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import type { RequestContext } from "../auth/auth.types.js";
import type { AuthenticatedUser } from "../auth/index.js";
import { notificationBus } from "../notifications/index.js";
import { generateBarcodeValue, generateRandomSku, isValidBarcodeValue } from "./barcode.codec.js";
import type {
  BulkGenerateDto,
  CreateTemplateDto,
  GenerateDto,
  ListTemplatesQuery,
  PrintDto,
  PrintHistoryQuery,
  ScanDto,
  ScanHistoryQuery,
  UpdateBarcodeDto,
  UpdateTemplateDto,
} from "./barcode.dto.js";
import type { BarcodeRepository } from "./barcode.repository.js";
import type {
  BarcodeStats,
  ListPrintHistoryResult,
  ListScanHistoryResult,
  ListTemplatesResult,
  ScanResult,
} from "./barcode.types.js";

const MAX_UNIQUE_RETRIES = 6;

export class BarcodeService {
  constructor(private readonly repo: BarcodeRepository) {}

  private async getItemOrFail(id: string): Promise<InventoryItem> {
    const item = await this.repo.findItem(id);
    if (!item) throw new ApiError(404, "Inventory item not found");
    return item;
  }

  private isLow(item: InventoryItem): boolean {
    const q = Number(item.quantity);
    const r = Number(item.reorderLevel);
    return q <= 0 || (r > 0 && q <= r);
  }

  // ==================== Generate ====================

  async generate(
    id: string,
    dto: GenerateDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<InventoryItem> {
    const item = await this.getItemOrFail(id);

    let value: string;
    if (dto.mode === "manual") {
      if (!dto.value) throw new ApiError(400, "Manual mode requires a value");
      if (!isValidBarcodeValue(dto.type, dto.value)) {
        throw new ApiError(400, `Invalid ${dto.type} value`);
      }
      const clash = await this.repo.findItemByBarcode(dto.value);
      if (clash && clash.id !== id) throw new ApiError(409, "Barcode already used by another item");
      value = dto.value;
    } else {
      value = await this.generateUniqueValue(dto.type, item.sku, id);
    }

    const updated = await this.repo.updateItem(id, {
      barcode: value,
      barcodeType: dto.type,
      qrCode: dto.withQr ? item.sku : dto.type === "QR" ? value : null,
    });

    await this.audit("BARCODE_GENERATED", actor, ctx, {
      itemId: id,
      sku: item.sku,
      type: dto.type,
      mode: dto.mode,
    });
    this.emit({
      type: "BARCODE_GENERATED",
      data: { itemId: id, itemName: item.name, sku: item.sku, barcodeType: dto.type },
    });
    return updated;
  }

  /** إعادة التوليد = توليد تلقائي جديد يستبدل القائم */
  regenerate(id: string, type: GenerateDto["type"], actor: AuthenticatedUser, ctx: RequestContext) {
    return this.generate(id, { type, mode: "auto", withQr: true }, actor, ctx);
  }

  async bulkGenerate(
    dto: BulkGenerateDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<{ generated: number; skipped: number }> {
    const items = await this.repo.findItemsByIds(dto.itemIds);
    let generated = 0;
    let skipped = 0;

    for (const item of items) {
      if (dto.skipExisting && item.barcode) {
        skipped++;
        continue;
      }
      const value = await this.generateUniqueValue(dto.type, item.sku, item.id);
      await this.repo.updateItem(item.id, {
        barcode: value,
        barcodeType: dto.type,
        qrCode: dto.withQr ? item.sku : dto.type === "QR" ? value : null,
      });
      generated++;
    }

    await this.audit("BARCODE_GENERATED", actor, ctx, {
      bulk: true,
      type: dto.type,
      requested: dto.itemIds.length,
      generated,
      skipped,
    });
    if (generated > 0) {
      this.emit({
        type: "BARCODE_GENERATED",
        data: { itemId: "", itemName: `${generated} صنف`, sku: "bulk", barcodeType: dto.type },
      });
    }
    return { generated, skipped };
  }

  async updateBarcode(
    id: string,
    dto: UpdateBarcodeDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<InventoryItem> {
    const item = await this.getItemOrFail(id);
    const type = dto.type ?? item.barcodeType;
    const value = dto.value ?? item.barcode;
    if (!type || !value) throw new ApiError(400, "Both type and value are required");
    if (!isValidBarcodeValue(type, value)) throw new ApiError(400, `Invalid ${type} value`);
    if (dto.value) {
      const clash = await this.repo.findItemByBarcode(dto.value);
      if (clash && clash.id !== id) throw new ApiError(409, "Barcode already used by another item");
    }
    const updated = await this.repo.updateItem(id, { barcode: value, barcodeType: type });
    await this.audit("BARCODE_UPDATED", actor, ctx, { itemId: id, sku: item.sku, type });
    return updated;
  }

  async deleteBarcode(id: string, actor: AuthenticatedUser, ctx: RequestContext): Promise<void> {
    const item = await this.getItemOrFail(id);
    if (!item.barcode) throw new ApiError(400, "Item has no barcode");
    await this.repo.updateItem(id, { barcode: null, barcodeType: null, qrCode: null });
    await this.audit("BARCODE_DELETED", actor, ctx, { itemId: id, sku: item.sku });
  }

  randomSku(): { sku: string } {
    return { sku: generateRandomSku() };
  }

  // ==================== Print ====================

  async print(dto: PrintDto, actor: AuthenticatedUser, ctx: RequestContext): Promise<{ printed: number; labels: number }> {
    const ids = dto.items.map((i) => i.itemId);
    const items = await this.repo.findItemsByIds(ids);
    const found = new Set(items.map((i) => i.id));
    const valid = dto.items.filter((i) => found.has(i.itemId));
    if (valid.length === 0) throw new ApiError(400, "No valid items to print");

    let templateName: string | null = null;
    if (dto.templateId) {
      const tpl = await this.repo.findTemplateById(dto.templateId);
      if (!tpl) throw new ApiError(404, "Template not found");
      templateName = tpl.name;
    }

    for (const line of valid) {
      await this.repo.createPrintLog({
        itemId: line.itemId,
        size: dto.size,
        quantity: line.quantity,
        templateId: dto.templateId ?? null,
        templateName,
        createdById: actor.id,
      });
    }
    await this.repo.incrementPrintCounts(valid.map((v) => ({ itemId: v.itemId, quantity: v.quantity })));

    const labels = valid.reduce((s, v) => s + v.quantity, 0);
    await this.audit("LABEL_PRINTED", actor, ctx, {
      items: valid.length,
      labels,
      size: dto.size,
      templateId: dto.templateId ?? null,
    });
    this.emit({
      type: "LABEL_PRINTED",
      data: { itemCount: valid.length, labelCount: labels, actorEmail: actor.email },
    });
    return { printed: valid.length, labels };
  }

  listPrintHistory(query: PrintHistoryQuery): Promise<ListPrintHistoryResult> {
    return this.repo.listPrintHistory(query);
  }

  // ==================== Scan ====================

  /** يحلّ الكود لصنف بلا تسجيل (خفيف - لواجهة الماسح) */
  async lookup(code: string): Promise<ScanResult> {
    const item = await this.repo.findItemByCode(code);
    return { found: item !== null, item, lowStock: item ? this.isLow(item) : false };
  }

  /** يسجّل عملية مسح + يُطلق الإشعارات المناسبة */
  async scan(dto: ScanDto, actor: AuthenticatedUser, ctx: RequestContext): Promise<ScanResult> {
    const item = await this.repo.findItemByCode(dto.code);
    const success = item !== null;

    await this.repo.createScanLog({
      code: dto.code,
      action: dto.action,
      success,
      itemId: item?.id ?? null,
      createdById: actor.id,
    });
    await this.audit("BARCODE_SCANNED", actor, ctx, {
      code: dto.code,
      action: dto.action,
      success,
      itemId: item?.id ?? null,
    });

    if (!success) {
      this.emit({ type: "INVALID_SCAN", data: { code: dto.code, actorEmail: actor.email } });
      return { found: false, item: null, lowStock: false };
    }

    const lowStock = this.isLow(item);
    if (lowStock) {
      this.emit({
        type: "LOW_STOCK_SCANNED",
        data: { itemId: item.id, itemName: item.name, sku: item.sku, quantity: Number(item.quantity) },
      });
    }
    return { found: true, item, lowStock };
  }

  listScanHistory(query: ScanHistoryQuery): Promise<ListScanHistoryResult> {
    return this.repo.listScanHistory(query);
  }

  // ==================== Templates ====================

  async createTemplate(dto: CreateTemplateDto, actor: AuthenticatedUser, ctx: RequestContext): Promise<LabelTemplate> {
    if (dto.isDefault) await this.repo.clearDefaultTemplates();
    const tpl = await this.repo.createTemplate({ ...dto, createdById: actor.id });
    await this.audit("LABEL_TEMPLATE_CREATED", actor, ctx, { templateId: tpl.id, name: tpl.name });
    return tpl;
  }

  async updateTemplate(
    id: string,
    dto: UpdateTemplateDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<LabelTemplate> {
    const existing = await this.repo.findTemplateById(id);
    if (!existing) throw new ApiError(404, "Template not found");
    if (dto.isDefault) await this.repo.clearDefaultTemplates();
    const tpl = await this.repo.updateTemplate(id, dto);
    await this.audit("LABEL_TEMPLATE_UPDATED", actor, ctx, { templateId: id, changes: dto });
    return tpl;
  }

  async deleteTemplate(id: string, actor: AuthenticatedUser, ctx: RequestContext): Promise<void> {
    const existing = await this.repo.findTemplateById(id);
    if (!existing) throw new ApiError(404, "Template not found");
    const usage = await this.repo.countTemplateUsage(id);
    if (usage > 0) throw new ApiError(409, `Template is used by ${usage} item(s)`);
    await this.repo.deleteTemplate(id);
    await this.audit("LABEL_TEMPLATE_DELETED", actor, ctx, { templateId: id, name: existing.name });
  }

  getTemplate(id: string): Promise<LabelTemplate> {
    return this.repo.findTemplateById(id).then((t) => {
      if (!t) throw new ApiError(404, "Template not found");
      return t;
    });
  }

  listTemplates(query: ListTemplatesQuery): Promise<ListTemplatesResult> {
    return this.repo.listTemplates(query);
  }

  // ==================== Stats ====================

  async getStats(): Promise<BarcodeStats> {
    const [base, withBarcodeItems] = await Promise.all([
      this.repo.getStats(),
      this.repo.findItemsWithBarcode(),
    ]);
    const invalidBarcode = withBarcodeItems.filter(
      (i) => !i.barcodeType || !i.barcode || !isValidBarcodeValue(i.barcodeType, i.barcode),
    ).length;
    return {
      totalItems: base.totalItems,
      withBarcode: base.withBarcode,
      missingBarcode: base.totalItems - base.withBarcode,
      invalidBarcode,
      totalPrints: base.totalPrints,
      totalScans: base.totalScans,
      invalidScans: base.invalidScans,
    };
  }

  // ==================== Helpers ====================

  private async generateUniqueValue(
    type: GenerateDto["type"],
    seed: string,
    itemId: string,
  ): Promise<string> {
    for (let i = 0; i < MAX_UNIQUE_RETRIES; i++) {
      const value = generateBarcodeValue(type, i === 0 ? seed : undefined);
      const clash = await this.repo.findItemByBarcode(value);
      if (!clash || clash.id === itemId) return value;
    }
    throw new ApiError(500, "Failed to generate a unique barcode value");
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
