import type { RequestHandler } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendPaginated, sendSuccess } from "../../utils/response.js";
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
 * تقارير الولاء/الكوبونات/العضوية (Phase 9) - قراءة فقط، مدمجة تحت /reports.
 * تُعيد استخدام ReportsRepository (نمط القراءة العابر للوحدات).
 */
export class LoyaltyReportsController {
  constructor(private readonly repo: ReportsRepository) {}

  topCustomers: RequestHandler = asyncHandler(async (req, res) => {
    const q = pageSchema.parse(req.query);
    const { rows, total } = await this.repo.topCustomersLoyaltyReport((q.page - 1) * q.limit, q.limit);
    const customers = rows.map((r) => ({
      customerId: r.customerId,
      name: r.customer.name,
      phone: r.customer.phone,
      level: r.membershipLevel,
      currentPoints: r.currentPoints,
      lifetimePoints: r.lifetimePoints,
    }));
    sendPaginated(res, { customers }, meta(q.page, q.limit, total));
  });

  pointsBalance: RequestHandler = asyncHandler(async (req, res) => {
    const q = pageSchema.parse(req.query);
    const { rows, total } = await this.repo.pointsBalanceReport((q.page - 1) * q.limit, q.limit);
    const accounts = rows.map((r) => ({
      customerId: r.customerId,
      name: r.customer.name,
      currentPoints: r.currentPoints,
      lifetimePoints: r.lifetimePoints,
      redeemedPoints: r.redeemedPoints,
      expiredPoints: r.expiredPoints,
      level: r.membershipLevel,
    }));
    sendPaginated(res, { accounts }, meta(q.page, q.limit, total));
  });

  pointsHistory: RequestHandler = asyncHandler(async (req, res) => {
    const q = pageSchema.parse(req.query);
    const { rows, total } = await this.repo.pointsHistoryReport((q.page - 1) * q.limit, q.limit);
    const transactions = this.mapTx(rows);
    sendPaginated(res, { transactions }, meta(q.page, q.limit, total));
  });

  expiredPoints: RequestHandler = asyncHandler(async (req, res) => {
    const q = pageSchema.parse(req.query);
    const { rows, total } = await this.repo.pointsHistoryReport((q.page - 1) * q.limit, q.limit, "EXPIRE");
    sendPaginated(res, { transactions: this.mapTx(rows) }, meta(q.page, q.limit, total));
  });

  referral: RequestHandler = asyncHandler(async (req, res) => {
    const q = pageSchema.parse(req.query);
    const { rows, total } = await this.repo.pointsHistoryReport((q.page - 1) * q.limit, q.limit, "REFERRAL");
    sendPaginated(res, { transactions: this.mapTx(rows) }, meta(q.page, q.limit, total));
  });

  couponUsage: RequestHandler = asyncHandler(async (req, res) => {
    const q = pageSchema.parse(req.query);
    const { rows, total } = await this.repo.couponUsageReport((q.page - 1) * q.limit, q.limit);
    const redemptions = rows.map((r) => ({
      id: r.id,
      code: r.coupon.code,
      type: r.coupon.type,
      customerName: r.customer?.name ?? "—",
      discountAmount: Number(r.discountAmount),
      createdAt: r.createdAt,
    }));
    sendPaginated(res, { redemptions }, meta(q.page, q.limit, total));
  });

  couponPerformance: RequestHandler = asyncHandler(async (req, res) => {
    const q = pageSchema.parse(req.query);
    const { rows, total } = await this.repo.couponPerformanceReport((q.page - 1) * q.limit, q.limit);
    const coupons = rows.map((r) => ({
      id: r.id,
      code: r.code,
      type: r.type,
      usedCount: r.usedCount,
      redemptions: r.redemptions,
      totalDiscount: Number(r.totalDiscount),
      isActive: r.isActive,
    }));
    sendPaginated(res, { coupons }, meta(q.page, q.limit, total));
  });

  membershipDistribution: RequestHandler = asyncHandler(async (_req, res) => {
    const distribution = await this.repo.membershipDistributionReport();
    sendSuccess(res, {
      distribution: distribution.map((d) => ({
        level: d.level,
        count: d.count,
        totalLifetimePoints: d.totalLifetimePoints,
      })),
    });
  });

  private mapTx(rows: { id: string; type: string; points: number; balanceAfter: number; reference: string | null; createdAt: Date; customer: { name: string } }[]) {
    return rows.map((r) => ({
      id: r.id,
      customerName: r.customer.name,
      type: r.type,
      points: r.points,
      balanceAfter: r.balanceAfter,
      reference: r.reference,
      createdAt: r.createdAt,
    }));
  }
}
