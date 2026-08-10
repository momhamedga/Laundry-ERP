import { MembershipLevel } from "@prisma/client";
import { z } from "zod";

export const levelParamSchema = z.object({ level: z.enum(MembershipLevel) });

export const updateTierSchema = z
  .object({
    minLifetimePoints: z.coerce.number().int().min(0),
    discountPercent: z.coerce.number().min(0).max(100),
    extraPointsPercent: z.coerce.number().min(0).max(100),
    priority: z.boolean(),
    freeService: z.boolean(),
    benefits: z.string().trim().max(500).nullable(),
    isActive: z.boolean(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "لا توجد حقول للتعديل." });

export const manualLevelSchema = z.object({
  customerId: z.cuid("Invalid customer id"),
  level: z.enum(MembershipLevel),
});
