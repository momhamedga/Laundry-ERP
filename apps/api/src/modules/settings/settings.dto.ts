import type { z } from "zod";
import type { updateSettingsSchema } from "./settings.validator.js";

/** DTO مشتق من مخطط Zod - مصدر حقيقة واحد */
export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
