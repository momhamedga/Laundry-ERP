import type { z } from "zod";
import type {
  cancelOrderSchema,
  changeStatusSchema,
  createOrderSchema,
  listOrdersQuerySchema,
  orderItemSchema,
  updateOrderSchema,
} from "./orders.validator.js";

/**
 * DTOs مشتقة من مخططات Zod - مصدر حقيقة واحد
 */
export type OrderItemDto = z.infer<typeof orderItemSchema>;
export type CreateOrderDto = z.infer<typeof createOrderSchema>;
export type UpdateOrderDto = z.infer<typeof updateOrderSchema>;
export type ChangeStatusDto = z.infer<typeof changeStatusSchema>;
export type CancelOrderDto = z.infer<typeof cancelOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
