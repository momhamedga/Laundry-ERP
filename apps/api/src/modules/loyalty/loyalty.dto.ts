import type { z } from "zod";
import type {
  adjustSchema,
  bonusSchema,
  createCampaignSchema,
  historyQuerySchema,
  listAccountsQuerySchema,
  listCampaignsQuerySchema,
  redeemQuerySchema,
  redeemSchema,
  updateCampaignSchema,
  updateSettingsSchema,
} from "./loyalty.validator.js";

export type AdjustDto = z.infer<typeof adjustSchema>;
export type RedeemDto = z.infer<typeof redeemSchema>;
export type RedeemQuery = z.infer<typeof redeemQuerySchema>;
export type BonusDto = z.infer<typeof bonusSchema>;
export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
export type CreateCampaignDto = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignDto = z.infer<typeof updateCampaignSchema>;
export type ListAccountsQuery = z.infer<typeof listAccountsQuerySchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;
