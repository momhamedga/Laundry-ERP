import type { z } from "zod";
import type {
  cancelPaymentSchema,
  createPaymentSchema,
  listPaymentsQuerySchema,
  refundPaymentSchema,
  updatePaymentSchema,
} from "./payments.validator.js";

/**
 * DTOs مشتقة من مخططات Zod - مصدر حقيقة واحد
 */
export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentDto = z.infer<typeof updatePaymentSchema>;
export type RefundPaymentDto = z.infer<typeof refundPaymentSchema>;
export type CancelPaymentDto = z.infer<typeof cancelPaymentSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
