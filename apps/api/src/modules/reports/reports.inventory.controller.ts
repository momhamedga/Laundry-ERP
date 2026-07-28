import type { RequestHandler } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendPaginated } from "../../utils/response.js";
import type { ReportsRepository } from "./reports.repository.js";
import {
  inventoryReportQuerySchema,
  movementsReportQuerySchema,
  purchasesReportQuerySchema,
  stockValueReportQuerySchema,
  suppliersReportQuerySchema,
} from "./reports.inventory.validator.js";

function meta(page: number, limit: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}

/**
 * تقارير المخزون (Phase 7) - قراءة فقط، مدمجة تحت /reports مع الستة الأصلية.
 * تُعيد استخدام ReportsRepository (نفس نمط القراءة العابر للوحدات) والغلاف
 * الموحّد sendPaginated - بلا منطق تجميع مكرَّر.
 */
export class InventoryReportsController {
  constructor(private readonly repo: ReportsRepository) {}

  inventory: RequestHandler = asyncHandler(async (req, res) => {
    const q = inventoryReportQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.limit;
    const [{ rows, total }, summary] = await Promise.all([
      this.repo.inventoryReportList(q, skip, q.limit),
      this.repo.inventoryReportSummary(q),
    ]);
    const items = rows.map((r) => ({
      id: r.id,
      sku: r.sku,
      name: r.name,
      type: r.type,
      unit: r.unit,
      category: r.category,
      supplierName: r.supplier?.name ?? null,
      quantity: Number(r.quantity),
      reorderLevel: Number(r.reorderLevel),
      costPrice: Number(r.costPrice),
      stockValue: Number((Number(r.quantity) * Number(r.costPrice)).toFixed(2)),
      isActive: r.isActive,
    }));
    sendPaginated(
      res,
      { summary: { totalItems: summary.totalItems, totalQuantity: Number(summary.totalQuantity) }, items },
      meta(q.page, q.limit, total),
    );
  });

  movements: RequestHandler = asyncHandler(async (req, res) => {
    const q = movementsReportQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.limit;
    const { rows, total } = await this.repo.movementsReportList(q, skip, q.limit);
    const movements = rows.map((r) => ({
      id: r.id,
      itemName: r.item.name,
      sku: r.item.sku,
      type: r.type,
      quantity: Number(r.quantity),
      beforeQuantity: Number(r.beforeQuantity),
      afterQuantity: Number(r.afterQuantity),
      reference: r.reference,
      createdAt: r.createdAt,
    }));
    sendPaginated(res, { movements }, meta(q.page, q.limit, total));
  });

  suppliers: RequestHandler = asyncHandler(async (req, res) => {
    const q = suppliersReportQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.limit;
    const { rows, total } = await this.repo.suppliersReportList(q, skip, q.limit);
    const suppliers = rows.map((r) => ({
      id: r.id,
      name: r.name,
      contactName: r.contactName,
      phone: r.phone,
      isActive: r.isActive,
      purchasesCount: r.purchasesCount,
      totalSpent: Number(r.totalSpent),
    }));
    sendPaginated(res, { suppliers }, meta(q.page, q.limit, total));
  });

  purchases: RequestHandler = asyncHandler(async (req, res) => {
    const q = purchasesReportQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.limit;
    const [{ rows, total }, summary] = await Promise.all([
      this.repo.purchasesReportList(q, skip, q.limit),
      this.repo.purchasesReportSummary(q),
    ]);
    const purchases = rows.map((r) => ({
      id: r.id,
      purchaseNumber: r.purchaseNumber,
      supplierName: r.supplier.name,
      status: r.status,
      itemsCount: r._count.items,
      subtotal: Number(r.subtotal),
      tax: Number(r.tax),
      total: Number(r.total),
      createdAt: r.createdAt,
    }));
    sendPaginated(
      res,
      {
        summary: {
          totalPurchases: summary.totalPurchases,
          totalAmount: Number(summary.totalAmount),
          totalTax: Number(summary.totalTax),
        },
        purchases,
      },
      meta(q.page, q.limit, total),
    );
  });

  stockValue: RequestHandler = asyncHandler(async (req, res) => {
    const q = stockValueReportQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.limit;
    const [{ rows, total }, summary] = await Promise.all([
      this.repo.stockValueReportList(q, skip, q.limit),
      this.repo.stockValueReportSummary(q),
    ]);
    const items = rows.map((r) => ({
      id: r.id,
      sku: r.sku,
      name: r.name,
      type: r.type,
      quantity: Number(r.quantity),
      costPrice: Number(r.costPrice),
      stockValue: Number((Number(r.quantity) * Number(r.costPrice)).toFixed(2)),
    }));
    sendPaginated(
      res,
      { summary: { totalValue: summary.totalValue, totalQuantity: summary.totalQuantity }, items },
      meta(q.page, q.limit, total),
    );
  });
}
