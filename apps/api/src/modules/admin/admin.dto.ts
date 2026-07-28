import type { z } from "zod";
import type {
  forceLogoutSchema,
  listLoginHistoryQuerySchema,
} from "./admin.validator.js";

export type ListLoginHistoryQueryDto = z.infer<typeof listLoginHistoryQuerySchema>;
export type ForceLogoutDto = z.infer<typeof forceLogoutSchema>;
