import type { z } from "zod";
import type {
  cashMovementSchema,
  closeDaySchema,
  listDayClosingsQuerySchema,
  openDaySchema,
  reopenDaySchema,
} from "./day-closing.validator.js";

export type OpenDayDto = z.infer<typeof openDaySchema>;
export type CloseDayDto = z.infer<typeof closeDaySchema>;
export type ReopenDayDto = z.infer<typeof reopenDaySchema>;
export type CashMovementDto = z.infer<typeof cashMovementSchema>;
export type ListDayClosingsQueryDto = z.infer<typeof listDayClosingsQuerySchema>;
