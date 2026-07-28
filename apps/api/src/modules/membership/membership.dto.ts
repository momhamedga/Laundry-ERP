import type { z } from "zod";
import type { manualLevelSchema, updateTierSchema } from "./membership.validator.js";

export type UpdateTierDto = z.infer<typeof updateTierSchema>;
export type ManualLevelDto = z.infer<typeof manualLevelSchema>;
