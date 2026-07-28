import { z } from "zod";

/** فلترة اختيارية بالفرع */
export const dashboardQuerySchema = z.object({
  branchId: z.string().trim().min(1).optional(),
});
