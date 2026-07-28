import { z } from "zod";
import type { ChannelSettings, DigestMode } from "@/types/notification";

/** تحقق مطابق لـ apps/api/src/modules/notifications/notification.validator.ts (updateChannelSettingsSchema) */
const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DIGEST_MODES = ["INSTANT", "HOURLY", "DAILY", "WEEKLY"] as const;

export const channelSettingsFormSchema = z
  .object({
    globalInApp: z.boolean(),
    globalEmail: z.boolean(),
    globalSms: z.boolean(),
    globalWhatsapp: z.boolean(),
    globalPush: z.boolean(),
    quietHoursEnabled: z.boolean(),
    // فارغ = غير محدَّد بعد - يُحوَّل null عند الإرسال
    quietHoursStart: z.string().refine((v) => v === "" || HHMM_REGEX.test(v), "الصيغة HH:mm"),
    quietHoursEnd: z.string().refine((v) => v === "" || HHMM_REGEX.test(v), "الصيغة HH:mm"),
    quietHoursTimezone: z.string().trim().min(1, "المنطقة الزمنية مطلوبة"),
    digestMode: z.enum(DIGEST_MODES),
  })
  .refine((d) => !d.quietHoursEnabled || (d.quietHoursStart !== "" && d.quietHoursEnd !== ""), {
    message: "وقتا البداية والنهاية مطلوبان عند تفعيل ساعات الهدوء",
    path: ["quietHoursEnabled"],
  });

export type ChannelSettingsFormValues = z.infer<typeof channelSettingsFormSchema>;

export const CHANNEL_SETTINGS_FORM_DEFAULTS: ChannelSettingsFormValues = {
  globalInApp: true,
  globalEmail: true,
  globalSms: true,
  globalWhatsapp: true,
  globalPush: true,
  quietHoursEnabled: false,
  quietHoursStart: "",
  quietHoursEnd: "",
  quietHoursTimezone: "Africa/Cairo",
  digestMode: "INSTANT",
};

export function mapChannelSettingsToFormValues(
  settings: ChannelSettings,
): ChannelSettingsFormValues {
  return {
    globalInApp: settings.globalInApp,
    globalEmail: settings.globalEmail,
    globalSms: settings.globalSms,
    globalWhatsapp: settings.globalWhatsapp,
    globalPush: settings.globalPush,
    quietHoursEnabled: settings.quietHoursEnabled,
    quietHoursStart: settings.quietHoursStart ?? "",
    quietHoursEnd: settings.quietHoursEnd ?? "",
    quietHoursTimezone: settings.quietHoursTimezone,
    digestMode: settings.digestMode as DigestMode,
  };
}

export function toUpdateChannelSettingsInput(
  values: ChannelSettingsFormValues,
): Partial<ChannelSettings> {
  return {
    globalInApp: values.globalInApp,
    globalEmail: values.globalEmail,
    globalSms: values.globalSms,
    globalWhatsapp: values.globalWhatsapp,
    globalPush: values.globalPush,
    quietHoursEnabled: values.quietHoursEnabled,
    quietHoursStart: values.quietHoursStart === "" ? null : values.quietHoursStart,
    quietHoursEnd: values.quietHoursEnd === "" ? null : values.quietHoursEnd,
    quietHoursTimezone: values.quietHoursTimezone,
    digestMode: values.digestMode,
  };
}
