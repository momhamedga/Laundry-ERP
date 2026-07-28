import type { z } from "zod";
import type {
  bulkActionSchema,
  cleanupQuerySchema,
  listNotificationsQuerySchema,
  updateChannelSettingsSchema,
  updatePreferencesSchema,
} from "./notification.validator.js";

export type ListNotificationsQueryDto = z.infer<typeof listNotificationsQuerySchema>;
export type BulkActionDto = z.infer<typeof bulkActionSchema>;
export type UpdatePreferencesDto = z.infer<typeof updatePreferencesSchema>;
export type UpdateChannelSettingsDto = z.infer<typeof updateChannelSettingsSchema>;
export type CleanupQueryDto = z.infer<typeof cleanupQuerySchema>;
