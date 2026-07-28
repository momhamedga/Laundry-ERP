import { OrderStatus, PaymentStatus } from "@prisma/client";
import { z } from "zod";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_ITEM_QUANTITY,
  MAX_NOTES_LENGTH,
  MAX_ORDER_ITEMS,
  MAX_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  ORDER_NUMBER_REGEX,
  ORDER_SORTABLE_FIELDS,
  SORT_ORDERS,
} from "./orders.constants.js";

const notesSchema = z.string().trim().max(MAX_NOTES_LENGTH, "Notes too long");
const moneySchema = z
  .number()
  .nonnegative("Amount cannot be negative")
  .multipleOf(0.01, "Amount supports at most 2 decimal places");

// ==================== Params ====================

export const orderIdParamSchema = z.object({
  id: z.cuid("Invalid order id"),
});

export const orderNumberParamSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(ORDER_NUMBER_REGEX, "Invalid order number format (ORD-YYYY-000001)"),
});

// ==================== Items ====================

/**
 * العميل يرسل الكمية والخصم فقط - السعر يُقرأ من الخدمة بالخادم
 * (Business Rule: الإجماليات لا تقبل قيماً يدوية من الـ Client)
 */
export const orderItemSchema = z.object({
  serviceId: z.cuid("Invalid service id"),
  quantity: z
    .number()
    .positive("Quantity must be greater than zero")
    .max(MAX_ITEM_QUANTITY)
    .multipleOf(0.01, "Quantity supports at most 2 decimal places"),
  discount: moneySchema.default(0),
  notes: notesSchema.nullish(),
});

// ==================== Body ====================

export const createOrderSchema = z
  .object({
    customerId: z.cuid("Invalid customer id"),
    /** معرف الفرع - وجوده وصلاحيته يُتحققان من القاعدة (قد لا يكون cuid) */
    branchId: z.string().trim().min(1, "Invalid branch id").optional(),
    /** Business Rule: تاريخ الاستلام والتسليم المتوقع إلزاميان */
    receivedAt: z.coerce.date("Invalid receivedAt date"),
    dueDate: z.coerce.date("Invalid dueDate date"),
    /** خصم على مستوى الطلب */
    discount: moneySchema.default(0),
    notes: notesSchema.nullish(),
    /** Business Rule: عنصر واحد على الأقل */
    items: z.array(orderItemSchema).min(1, "Order must have at least one item").max(MAX_ORDER_ITEMS),
  })
  .refine((d) => d.dueDate.getTime() > d.receivedAt.getTime(), {
    message: "dueDate must be after receivedAt",
    path: ["dueDate"],
  });

export const updateOrderSchema = z
  .object({
    dueDate: z.coerce.date("Invalid dueDate date"),
    discount: moneySchema,
    notes: notesSchema.nullable(),
    /** استبدال كامل للعناصر عند الإرسال */
    items: z.array(orderItemSchema).min(1, "Order must have at least one item").max(MAX_ORDER_ITEMS),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });

export const changeStatusSchema = z
  .object({
    status: z.enum(OrderStatus),
    notes: notesSchema.nullish(),
  })
  .refine((d) => d.status !== "CANCELLED", {
    message: "Use the cancel endpoint to cancel an order",
    path: ["status"],
  });

export const cancelOrderSchema = z.object({
  notes: notesSchema.nullish(),
});

// ==================== Query ====================

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  /** بحث برقم الطلب أو اسم/هاتف العميل */
  search: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
  status: z.enum(OrderStatus).optional(),
  paymentStatus: z.enum(PaymentStatus).optional(),
  customerId: z.cuid().optional(),
  branchId: z.string().trim().min(1).optional(),
  receivedFrom: z.coerce.date().optional(),
  receivedTo: z.coerce.date().optional(),
  sortBy: z.enum(ORDER_SORTABLE_FIELDS).default("receivedAt"),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
});
