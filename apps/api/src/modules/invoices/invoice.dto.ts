import type { z } from "zod";
import type {
  createInvoicePaymentSchema,
  createInvoiceSchema,
  emailInvoiceSchema,
  listInvoicePaymentsQuerySchema,
  listInvoicesQuerySchema,
  updateInvoiceSchema,
} from "./invoice.validator.js";

/**
 * DTOs مشتقة من مخططات Zod - مصدر حقيقة واحد
 */
export type CreateInvoiceDto = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceDto = z.infer<typeof updateInvoiceSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
export type EmailInvoiceDto = z.infer<typeof emailInvoiceSchema>;
export type CreateInvoicePaymentDto = z.infer<typeof createInvoicePaymentSchema>;
export type ListInvoicePaymentsQuery = z.infer<typeof listInvoicePaymentsQuerySchema>;
