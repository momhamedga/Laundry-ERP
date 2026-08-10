import { z } from "zod";
import {
  MAX_PASSWORD_EXPIRATION_DAYS,
  SUPPORTED_DATE_FORMATS,
  SUPPORTED_LANGUAGES,
  SUPPORTED_THEMES,
  SUPPORTED_TIME_FORMATS,
} from "./settings.constants.js";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, "Invalid phone number");

const generalSchema = z
  .object({
    companyName: z.string().trim().min(2, "Name too short").max(150),
    companyEmail: z.email("Invalid email").trim().toLowerCase().nullable(),
    companyPhone: phoneSchema.nullable(),
    companyAddress: z.string().trim().max(300).nullable(),
    companyLogoUrl: z.url("Invalid URL").nullable(),
    defaultCurrency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code"),
    defaultTimezone: z.string().trim().min(1).max(100),
    defaultLanguage: z.enum(SUPPORTED_LANGUAGES),
  })
  .partial();

const appearanceSchema = z
  .object({
    defaultTheme: z.enum(SUPPORTED_THEMES),
    rtlEnabled: z.boolean(),
    dateFormat: z.enum(SUPPORTED_DATE_FORMATS),
    timeFormat: z.enum(SUPPORTED_TIME_FORMATS),
  })
  .partial();

const notificationsSchema = z
  .object({
    emailNotificationsEnabled: z.boolean(),
    smsNotificationsEnabled: z.boolean(),
    inAppNotificationsEnabled: z.boolean(),
  })
  .partial();

/** Session Timeout/Password Minimum Length غير موجودين هنا عمداً - راجع settings.constants.ts */
const securitySchema = z
  .object({
    passwordExpirationDays: z.number().int().positive().max(MAX_PASSWORD_EXPIRATION_DAYS).nullable(),
  })
  .partial();

// ==================== Body ====================

/** لا حقل "system" هنا عمداً - قسم قراءة فقط محسوب من بيئة التشغيل، غير قابل للتعديل */
export const updateSettingsSchema = z
  .object({
    general: generalSchema,
    appearance: appearanceSchema,
    notifications: notificationsSchema,
    security: securitySchema,
  })
  .partial()
  .refine(
    (d) => Object.values(d).some((section) => section && Object.keys(section).length > 0),
    { message: "لا توجد حقول للتعديل." },
  );
