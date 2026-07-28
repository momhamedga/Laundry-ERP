import type { Prisma, SystemSettings } from "@prisma/client";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../../config/env.js";
import { APPLICATION_NAME } from "./settings.constants.js";
import type { UpdateSettingsDto } from "./settings.dto.js";
import type { SettingsResponse, SystemInfo } from "./settings.types.js";

/** يقرأ package.json الحقيقي (apps/api) - يعمل من src/ (tsx) وdist/ (build) على حد سواء */
function readApplicationVersion(): string {
  try {
    const dir = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(dir, "../../../package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const APPLICATION_VERSION = readApplicationVersion();

function buildSystemInfo(): SystemInfo {
  return {
    applicationName: APPLICATION_NAME,
    applicationVersion: APPLICATION_VERSION,
    environment: env.NODE_ENV,
    buildDate: null,
  };
}

export function toSettingsResponse(row: SystemSettings): SettingsResponse {
  return {
    general: {
      companyName: row.companyName,
      companyEmail: row.companyEmail,
      companyPhone: row.companyPhone,
      companyAddress: row.companyAddress,
      companyLogoUrl: row.companyLogoUrl,
      defaultCurrency: row.defaultCurrency,
      defaultTimezone: row.defaultTimezone,
      defaultLanguage: row.defaultLanguage,
    },
    appearance: {
      defaultTheme: row.defaultTheme,
      rtlEnabled: row.rtlEnabled,
      dateFormat: row.dateFormat,
      timeFormat: row.timeFormat,
    },
    notifications: {
      emailNotificationsEnabled: row.emailNotificationsEnabled,
      smsNotificationsEnabled: row.smsNotificationsEnabled,
      inAppNotificationsEnabled: row.inAppNotificationsEnabled,
    },
    security: {
      passwordExpirationDays: row.passwordExpirationDays,
    },
    system: buildSystemInfo(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** يحوّل DTO المتداخل (مُتحقَّق منه) إلى Prisma Update مُسطَّح - يتجاهل "system" (قراءة فقط، لا حقل له بالخادم أصلاً) */
export function buildSettingsUpdateData(
  dto: UpdateSettingsDto,
): Prisma.SystemSettingsUpdateInput {
  return {
    ...(dto.general ?? {}),
    ...(dto.appearance ?? {}),
    ...(dto.notifications ?? {}),
    ...(dto.security ?? {}),
  };
}
