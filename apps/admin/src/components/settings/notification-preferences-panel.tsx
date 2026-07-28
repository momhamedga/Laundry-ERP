"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useChannelSettingsQuery,
  useUpdateChannelSettingsMutation,
} from "@/hooks/use-notifications";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import {
  CHANNEL_SETTINGS_FORM_DEFAULTS,
  channelSettingsFormSchema,
  mapChannelSettingsToFormValues,
  toUpdateChannelSettingsInput,
  type ChannelSettingsFormValues,
} from "@/lib/validations/notification-channel-settings";
import { NotificationDigestCard } from "./notification-digest-card";
import { NotificationGlobalChannelsCard } from "./notification-global-channels-card";
import { NotificationLogCard } from "./notification-log-card";
import { NotificationQueueCard } from "./notification-queue-card";
import { NotificationQuietHoursCard } from "./notification-quiet-hours-card";
import { NotificationStatisticsCard } from "./notification-statistics-card";
import { NotificationTestAndProvidersCard } from "./notification-test-and-providers-card";
import { NotificationTypePreferencesCard } from "./notification-type-preferences-card";

/**
 * لوحة تفضيلات الإشعارات الشخصية (Phase 4D) - تُضاف داخل تبويب "الإشعارات"
 * الحالي بصفحة الإعدادات، أسفل NotificationsSettingsCard القائم (تفضيل نظام
 * عام يديره ADMIN فقط) - هذه اللوحة ذاتية لكل مستخدم عن إشعاراته الخاصة،
 * مفهوم مختلف تماماً ولا تُلغي أو تُعدِّل الموجود
 */
export function NotificationPreferencesPanel() {
  const { can } = usePermissions();
  const canUpdate = can("notifications:update");

  const { data: settings, isLoading, isError, error, refetch } = useChannelSettingsQuery();
  const mutation = useUpdateChannelSettingsMutation();

  const {
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ChannelSettingsFormValues>({
    resolver: zodResolver(channelSettingsFormSchema),
    defaultValues: CHANNEL_SETTINGS_FORM_DEFAULTS,
    values: settings ? mapChannelSettingsToFormValues(settings) : undefined,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError || !settings) {
    return (
      <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
    );
  }

  async function onSubmit(values: ChannelSettingsFormValues) {
    try {
      const updated = await mutation.mutateAsync(toUpdateChannelSettingsInput(values));
      reset(mapChannelSettingsToFormValues(updated));
    } catch {
      // toast الخطأ يظهر عبر onError الخاص بالـ mutation
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {!canUpdate && (
          <p role="note" className="rounded-lg border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
            لا تملك صلاحية تعديل تفضيلات الإشعارات - كل الحقول للعرض فقط.
          </p>
        )}

        <NotificationGlobalChannelsCard watch={watch} setValue={setValue} readOnly={!canUpdate} />
        <NotificationQuietHoursCard
          watch={watch}
          setValue={setValue}
          errors={errors}
          readOnly={!canUpdate}
        />
        <NotificationDigestCard watch={watch} setValue={setValue} readOnly={!canUpdate} />

        {canUpdate && (
          <div className="flex justify-end">
            <Button type="submit" disabled={!isDirty || mutation.isPending}>
              {mutation.isPending ? "جارٍ الحفظ..." : "حفظ إعدادات القنوات"}
            </Button>
          </div>
        )}
      </form>

      <NotificationTypePreferencesCard channelSettings={settings} readOnly={!canUpdate} />
      <NotificationTestAndProvidersCard />
      <NotificationQueueCard />
      <NotificationStatisticsCard />
      <NotificationLogCard />
    </div>
  );
}
