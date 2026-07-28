import type { RequestContext } from "../auth/auth.types.js";
import type { AuthenticatedUser } from "../auth/index.js";
import { notificationBus } from "../notifications/index.js";
import type { UpdateSettingsDto } from "./settings.dto.js";
import type { SettingsRepository } from "./settings.repository.js";
import type { SettingsResponse } from "./settings.types.js";
import { buildSettingsUpdateData, toSettingsResponse } from "./settings.utils.js";

export class SettingsService {
  constructor(private readonly repo: SettingsRepository) {}

  async get(): Promise<SettingsResponse> {
    const row = await this.repo.getOrCreate();
    return toSettingsResponse(row);
  }

  async update(
    dto: UpdateSettingsDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<SettingsResponse> {
    await this.repo.getOrCreate(); // يضمن وجود الصف قبل أي تحديث
    const data = buildSettingsUpdateData(dto);
    const row = await this.repo.update(data);

    await this.repo.createAuditLog({
      action: "SETTINGS_UPDATED",
      userId: actor.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { changes: dto },
    });

    notificationBus.emitNotification({
      type: "SYSTEM_SETTINGS_UPDATED",
      data: { updatedByEmail: actor.email, changedSections: Object.keys(dto) },
    });

    return toSettingsResponse(row);
  }
}
