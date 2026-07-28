import type { z } from "zod";
import type {
  adjustSchema,
  createItemSchema,
  createMovementSchema,
  listAlertsQuerySchema,
  listItemsQuerySchema,
  listMovementsQuerySchema,
  stockCountSchema,
  transferSchema,
  updateItemSchema,
} from "./inventory.validator.js";

export type CreateItemDto = z.infer<typeof createItemSchema>;
export type UpdateItemDto = z.infer<typeof updateItemSchema>;
export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;
export type CreateMovementDto = z.infer<typeof createMovementSchema>;
export type AdjustDto = z.infer<typeof adjustSchema>;
export type TransferDto = z.infer<typeof transferSchema>;
export type StockCountDto = z.infer<typeof stockCountSchema>;
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;
export type ListAlertsQuery = z.infer<typeof listAlertsQuerySchema>;
