import type {
  AuditAction,
  BarcodeType,
  InventoryItem,
  LabelSize,
  LabelTemplate,
  Prisma,
  PrismaClient,
  ScanAction,
} from "@prisma/client";
import type {
  ListPrintHistoryResult,
  ListScanHistoryResult,
  ListTemplatesResult,
} from "./barcode.types.js";
import type {
  ListTemplatesQuery,
  PrintHistoryQuery,
  ScanHistoryQuery,
} from "./barcode.dto.js";
import { buildPaginationMeta, toSkipTake } from "./barcode.utils.js";

export class BarcodeRepository {
  constructor(private readonly db: PrismaClient) {}

  // ==================== Items ====================

  findItem(id: string): Promise<InventoryItem | null> {
    return this.db.inventoryItem.findUnique({ where: { id } });
  }

  findItemsByIds(ids: string[]): Promise<InventoryItem[]> {
    return this.db.inventoryItem.findMany({ where: { id: { in: ids } } });
  }

  /** بحث المسح: يطابق barcode أو sku أو qrCode (exact) - لحلّ الكود الممسوح لصنف */
  findItemByCode(code: string): Promise<InventoryItem | null> {
    return this.db.inventoryItem.findFirst({
      where: { OR: [{ barcode: code }, { sku: code }, { qrCode: code }] },
    });
  }

  findItemByBarcode(barcode: string): Promise<InventoryItem | null> {
    return this.db.inventoryItem.findUnique({ where: { barcode } });
  }

  findItemBySku(sku: string): Promise<InventoryItem | null> {
    return this.db.inventoryItem.findUnique({ where: { sku } });
  }

  updateItem(id: string, data: Prisma.InventoryItemUpdateInput): Promise<InventoryItem> {
    return this.db.inventoryItem.update({ where: { id }, data });
  }

  // ==================== Print ====================

  createPrintLog(entry: {
    itemId: string | null;
    size: LabelSize;
    quantity: number;
    templateId: string | null;
    templateName: string | null;
    createdById: string | null;
  }): Promise<unknown> {
    return this.db.labelPrintLog.create({ data: entry });
  }

  /** تحديث عدّاد الطباعة لعدة أصناف دفعة واحدة (بلا N+1 على الكتابة الحرجة) */
  async incrementPrintCounts(entries: { itemId: string; quantity: number }[]): Promise<void> {
    const now = new Date();
    await this.db.$transaction(
      entries.map((e) =>
        this.db.inventoryItem.update({
          where: { id: e.itemId },
          data: { printCount: { increment: e.quantity }, lastPrintedAt: now },
        }),
      ),
    );
  }

  async listPrintHistory(query: PrintHistoryQuery): Promise<ListPrintHistoryResult> {
    const where: Prisma.LabelPrintLogWhereInput = {};
    if (query.itemId) where.itemId = query.itemId;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }
    const { skip, take } = toSkipTake(query.page, query.limit);
    const [logs, total] = await this.db.$transaction([
      this.db.labelPrintLog.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip,
        take,
        include: { item: { select: { id: true, name: true, sku: true } } },
      }),
      this.db.labelPrintLog.count({ where }),
    ]);
    return { logs, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  // ==================== Scan ====================

  createScanLog(entry: {
    code: string;
    action: ScanAction;
    success: boolean;
    itemId: string | null;
    createdById: string | null;
  }): Promise<unknown> {
    return this.db.barcodeScanLog.create({ data: entry });
  }

  async listScanHistory(query: ScanHistoryQuery): Promise<ListScanHistoryResult> {
    const where: Prisma.BarcodeScanLogWhereInput = {};
    if (query.success !== undefined) where.success = query.success;
    if (query.action) where.action = query.action;
    const { skip, take } = toSkipTake(query.page, query.limit);
    const [scans, total] = await this.db.$transaction([
      this.db.barcodeScanLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: { item: { select: { id: true, name: true, sku: true } } },
      }),
      this.db.barcodeScanLog.count({ where }),
    ]);
    return { scans, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  // ==================== Templates ====================

  findTemplateById(id: string): Promise<LabelTemplate | null> {
    return this.db.labelTemplate.findUnique({ where: { id } });
  }

  createTemplate(data: Prisma.LabelTemplateUncheckedCreateInput): Promise<LabelTemplate> {
    return this.db.labelTemplate.create({ data });
  }

  updateTemplate(id: string, data: Prisma.LabelTemplateUpdateInput): Promise<LabelTemplate> {
    return this.db.labelTemplate.update({ where: { id }, data });
  }

  deleteTemplate(id: string): Promise<LabelTemplate> {
    return this.db.labelTemplate.delete({ where: { id } });
  }

  /** يلغي علم الافتراضي عن كل القوالب (لضمان قالب افتراضي واحد) */
  clearDefaultTemplates(): Promise<Prisma.BatchPayload> {
    return this.db.labelTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  async listTemplates(query: ListTemplatesQuery): Promise<ListTemplatesResult> {
    const where: Prisma.LabelTemplateWhereInput = {};
    if (query.search) where.name = { contains: query.search, mode: "insensitive" };
    const { skip, take } = toSkipTake(query.page, query.limit);
    const [templates, total] = await this.db.$transaction([
      this.db.labelTemplate.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      this.db.labelTemplate.count({ where }),
    ]);
    return { templates, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  countTemplateUsage(templateId: string): Promise<number> {
    return this.db.inventoryItem.count({ where: { labelTemplateId: templateId } });
  }

  // ==================== Stats ====================

  async getStats(): Promise<{
    totalItems: number;
    withBarcode: number;
    totalPrints: number;
    totalScans: number;
    invalidScans: number;
  }> {
    const [totalItems, withBarcode, totalPrints, totalScans, invalidScans] =
      await this.db.$transaction([
        this.db.inventoryItem.count(),
        this.db.inventoryItem.count({ where: { barcode: { not: null } } }),
        this.db.labelPrintLog.count(),
        this.db.barcodeScanLog.count(),
        this.db.barcodeScanLog.count({ where: { success: false } }),
      ]);
    return { totalItems, withBarcode, totalPrints, totalScans, invalidScans };
  }

  /** كل الأصناف التي لها باركود - لحساب Invalid Barcode بطبقة الخدمة (تحقّق المجموع) */
  findItemsWithBarcode(): Promise<{ id: string; barcode: string | null; barcodeType: BarcodeType | null }[]> {
    return this.db.inventoryItem.findMany({
      where: { barcode: { not: null } },
      select: { id: true, barcode: true, barcodeType: true },
    });
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
