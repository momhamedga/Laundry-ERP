import { OrderStatus, PaymentMethod, PaymentTxStatus } from "@prisma/client";
import { z } from "zod";
import {
  BRANCHES_REPORT_SORTABLE_FIELDS,
  CUSTOMERS_REPORT_SORTABLE_FIELDS,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_TOP_CUSTOMERS_LIMIT,
  EMPLOYEES_REPORT_SORTABLE_FIELDS,
  MAX_PAGE_SIZE,
  MAX_TOP_CUSTOMERS_LIMIT,
  ORDERS_REPORT_SORTABLE_FIELDS,
  PAYMENTS_REPORT_SORTABLE_FIELDS,
  SERVICES_REPORT_SORTABLE_FIELDS,
  SORT_ORDERS,
} from "./reports.constants.js";

/**
 * from/to بلا نطاق افتراضي ثابت (لا "اليوم"/"هذا الشهر" كلوحة التحكم) -
 * غيابهما يعني بلا حد زمني (كل الفترة). يُتحقَّق أن from <= to إن وُجدا معاً.
 */
const dateRangeShape = {
  from: z.coerce.date("Invalid from date").optional(),
  to: z.coerce.date("Invalid to date").optional(),
};

function refineDateRange<T extends { from?: Date; to?: Date }>(d: T): boolean {
  if (d.from === undefined || d.to === undefined) return true;
  return d.from.getTime() <= d.to.getTime();
}

const paginationShape = {
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
};

// ==================== 1) Orders Report ====================

export const ordersReportQuerySchema = z
  .object({
    ...dateRangeShape,
    branchId: z.string().trim().min(1).optional(),
    customerId: z.cuid("Invalid customer id").optional(),
    status: z.enum(OrderStatus).optional(),
    ...paginationShape,
    sortBy: z.enum(ORDERS_REPORT_SORTABLE_FIELDS).default("receivedAt"),
    sortOrder: z.enum(SORT_ORDERS).default("desc"),
  })
  .refine(refineDateRange, { message: "from must be before or equal to to", path: ["to"] });

// ==================== 2) Payments Report ====================

export const paymentsReportQuerySchema = z
  .object({
    ...dateRangeShape,
    branchId: z.string().trim().min(1).optional(),
    method: z.enum(PaymentMethod).optional(),
    status: z.enum(PaymentTxStatus).optional(),
    ...paginationShape,
    sortBy: z.enum(PAYMENTS_REPORT_SORTABLE_FIELDS).default("createdAt"),
    sortOrder: z.enum(SORT_ORDERS).default("desc"),
  })
  .refine(refineDateRange, { message: "from must be before or equal to to", path: ["to"] });

// ==================== 3) Customers Report ====================

export const customersReportQuerySchema = z
  .object({
    ...dateRangeShape,
    branchId: z.string().trim().min(1).optional(),
    topLimit: z.coerce.number().int().min(1).max(MAX_TOP_CUSTOMERS_LIMIT).default(DEFAULT_TOP_CUSTOMERS_LIMIT),
    ...paginationShape,
    sortBy: z.enum(CUSTOMERS_REPORT_SORTABLE_FIELDS).default("createdAt"),
    sortOrder: z.enum(SORT_ORDERS).default("desc"),
  })
  .refine(refineDateRange, { message: "from must be before or equal to to", path: ["to"] });

// ==================== 4) Services Report ====================

export const servicesReportQuerySchema = z
  .object({
    ...dateRangeShape,
    branchId: z.string().trim().min(1).optional(),
    ...paginationShape,
    sortBy: z.enum(SERVICES_REPORT_SORTABLE_FIELDS).default("timesUsed"),
    sortOrder: z.enum(SORT_ORDERS).default("desc"),
  })
  .refine(refineDateRange, { message: "from must be before or equal to to", path: ["to"] });

// ==================== 5) Branches Report ====================

export const branchesReportQuerySchema = z
  .object({
    ...dateRangeShape,
    ...paginationShape,
    sortBy: z.enum(BRANCHES_REPORT_SORTABLE_FIELDS).default("revenue"),
    sortOrder: z.enum(SORT_ORDERS).default("desc"),
  })
  .refine(refineDateRange, { message: "from must be before or equal to to", path: ["to"] });

// ==================== 6) Employees Report ====================

export const employeesReportQuerySchema = z
  .object({
    ...dateRangeShape,
    branchId: z.string().trim().min(1).optional(),
    ...paginationShape,
    sortBy: z.enum(EMPLOYEES_REPORT_SORTABLE_FIELDS).default("ordersCreatedCount"),
    sortOrder: z.enum(SORT_ORDERS).default("desc"),
  })
  .refine(refineDateRange, { message: "from must be before or equal to to", path: ["to"] });
