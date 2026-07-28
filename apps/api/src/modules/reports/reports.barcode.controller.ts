import type { RequestHandler } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendPaginated } from "../../utils/response.js";
import { isValidBarcodeValue } from "../barcode/barcode.codec.js";
import type { ReportsRepository } from "./reports.repository.js";

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function meta(page: number, limit: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}

/**
 * تقارير الباركود (Phase 8) - قراءة فقط، مدمجة تحت /reports (نفس reports:view).
 * تُعيد استخدام ReportsRepository؛ Invalid Barcode يستعمل codec التحقّق نفسه (بلا تكرار منطق).
 */
export class BarcodeReportsController {
  constructor(private readonly repo: ReportsRepository) {}

  mostScanned: RequestHandler = asyncHandler(async (req, res) => {
    const q = pageSchema.parse(req.query);
    const { rows, total } = await this.repo.mostScannedReport((q.page - 1) * q.limit, q.limit);
    sendPaginated(res, { items: rows }, meta(q.page, q.limit, total));
  });

  printHistory: RequestHandler = asyncHandler(async (req, res) => {
    const q = pageSchema.parse(req.query);
    const { rows, total } = await this.repo.printHistoryReport((q.page - 1) * q.limit, q.limit);
    const logs = rows.map((r) => ({
      id: r.id,
      itemName: r.item?.name ?? "—",
      sku: r.item?.sku ?? "—",
      size: r.size,
      quantity: r.quantity,
      templateName: r.templateName,
      createdAt: r.createdAt,
    }));
    sendPaginated(res, { logs }, meta(q.page, q.limit, total));
  });

  missing: RequestHandler = asyncHandler(async (req, res) => {
    const q = pageSchema.parse(req.query);
    const { rows, total } = await this.repo.missingBarcodeReport((q.page - 1) * q.limit, q.limit);
    const items = rows.map((r) => ({ id: r.id, sku: r.sku, name: r.name, type: r.type, quantity: Number(r.quantity) }));
    sendPaginated(res, { items }, meta(q.page, q.limit, total));
  });

  unused: RequestHandler = asyncHandler(async (req, res) => {
    const q = pageSchema.parse(req.query);
    const { rows, total } = await this.repo.unusedBarcodeReport((q.page - 1) * q.limit, q.limit);
    const items = rows.map((r) => ({
      id: r.id,
      sku: r.sku,
      name: r.name,
      barcode: r.barcode,
      barcodeType: r.barcodeType,
    }));
    sendPaginated(res, { items }, meta(q.page, q.limit, total));
  });

  invalid: RequestHandler = asyncHandler(async (req, res) => {
    const q = pageSchema.parse(req.query);
    const all = await this.repo.itemsWithBarcode();
    const invalid = all.filter(
      (i) => !i.barcodeType || !i.barcode || !isValidBarcodeValue(i.barcodeType, i.barcode),
    );
    const total = invalid.length;
    const slice = invalid.slice((q.page - 1) * q.limit, (q.page - 1) * q.limit + q.limit);
    const items = slice.map((r) => ({
      id: r.id,
      sku: r.sku,
      name: r.name,
      barcode: r.barcode,
      barcodeType: r.barcodeType,
    }));
    sendPaginated(res, { items }, meta(q.page, q.limit, total));
  });
}
