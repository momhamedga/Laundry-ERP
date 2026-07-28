"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { PageHeader } from "@/components/layout/page-header";
import { useSettingsQuery, useUpdateSettingsMutation } from "@/hooks/use-settings";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import {
  mapSettingsToFormValues,
  SETTINGS_FORM_DEFAULTS,
  settingsFormSchema,
  toUpdateSettingsInput,
  type SettingsFormValues,
} from "@/lib/validations/settings";
import { SettingsActions } from "./settings-actions";
import { SettingsErrorState } from "./settings-error-state";
import { SettingsSkeleton } from "./settings-skeleton";
import { SettingsTabs } from "./settings-tabs";

/** جسم صفحة الإعدادات - GET/PUT /settings فقط */
export function SettingsView() {
  const { data: settings, isLoading, isError, error, refetch } = useSettingsQuery();
  const mutation = useUpdateSettingsMutation();
  const { can } = usePermissions();
  const canManage = can("settings:manage");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: SETTINGS_FORM_DEFAULTS,
    values: settings ? mapSettingsToFormValues(settings) : undefined,
  });

  if (isLoading) return <SettingsSkeleton />;
  if (isError) {
    return <SettingsErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />;
  }
  if (!settings) return null;

  async function onSubmit(values: SettingsFormValues) {
    try {
      const payload = toUpdateSettingsInput(values, dirtyFields);
      const updated = await mutation.mutateAsync(payload);
      reset(mapSettingsToFormValues(updated)); // يُعيد isDirty لـfalse فوراً بالقيم المُطبَّعة من الخادم (مثلاً UPPERCASE للعملة)
    } catch {
      // toast الخطأ يظهر بالفعل عبر onError الخاص بالـ mutation
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <PageHeader
        title="الإعدادات"
        description="إعدادات النظام العامة - الشركة، المظهر، الإشعارات، والأمان"
        actions={
          canManage ? (
            <SettingsActions isDirty={isDirty} isPending={mutation.isPending} onSave={handleSubmit(onSubmit)} />
          ) : undefined
        }
      />

      {!canManage && (
        <p role="note" className="rounded-lg border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
          لا تملك صلاحية تعديل الإعدادات - كل الحقول للعرض فقط.
        </p>
      )}

      <SettingsTabs
        register={register}
        errors={errors}
        watch={watch}
        setValue={setValue}
        system={settings.system}
        readOnly={!canManage}
      />
    </form>
  );
}
