"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useBackupSettingsQuery, useUpdateBackupSettingsMutation } from "@/hooks/use-backup";
import { usePermissions } from "@/hooks/use-permissions";
import {
  backupSettingsFormSchema,
  mapSettingsToForm,
  toUpdateInput,
  type BackupSettingsFormValues,
} from "@/lib/validations/backup";

const DEFAULTS: BackupSettingsFormValues = {
  provider: "LOCAL",
  compressionEnabled: false,
  encryptionEnabled: false,
  retentionDays: 30,
  keepLastN: 10,
  scheduleEnabled: false,
  scheduleFrequency: "DAILY",
  scheduleTime: "02:00",
  scheduleTimezone: "Africa/Cairo",
};

export function BackupSettingsCard() {
  const { can } = usePermissions();
  const canManage = can("backup:manage");
  const { data, isLoading } = useBackupSettingsQuery();
  const mutation = useUpdateBackupSettingsMutation();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<BackupSettingsFormValues>({
    resolver: zodResolver(backupSettingsFormSchema),
    defaultValues: DEFAULTS,
    values: data ? mapSettingsToForm(data) : undefined,
  });

  const scheduleEnabled = useWatch({ control, name: "scheduleEnabled" });
  const compressionEnabled = useWatch({ control, name: "compressionEnabled" });
  const encryptionEnabled = useWatch({ control, name: "encryptionEnabled" });
  const provider = useWatch({ control, name: "provider" });
  const scheduleFrequency = useWatch({ control, name: "scheduleFrequency" });

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  async function onSubmit(values: BackupSettingsFormValues) {
    try {
      const updated = await mutation.mutateAsync(toUpdateInput(values));
      reset(mapSettingsToForm(updated));
    } catch {
      // toast عبر onError
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>إعدادات النسخ الاحتياطي</CardTitle>
          <CardDescription>الوجهة، الاحتفاظ، الجدولة، الضغط والتشفير</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Storage */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>وجهة التخزين</Label>
              <Select
                value={provider}
                onValueChange={(v) =>
                  setValue("provider", v as BackupSettingsFormValues["provider"], { shouldDirty: true })
                }
                disabled={!canManage}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOCAL">محلي (Local)</SelectItem>
                  <SelectItem value="S3">Amazon S3</SelectItem>
                  <SelectItem value="R2">Cloudflare R2</SelectItem>
                  <SelectItem value="BACKBLAZE">Backblaze</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                المزوّدات السحابية Scaffold - تتراجع تلقائياً للتخزين المحلي بلا credentials
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label>ضغط الملف (gzip)</Label>
                  <p className="text-xs text-muted-foreground">يقلّل حجم النسخة كثيراً</p>
                </div>
                <Switch
                  checked={compressionEnabled}
                  onCheckedChange={(v) => setValue("compressionEnabled", v, { shouldDirty: true })}
                  disabled={!canManage}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label>التشفير</Label>
                  <p className="text-xs text-muted-foreground">
                    مُخزَّن كإعداد - التطبيق الفعلي مؤجَّل (يتطلب BACKUP_ENCRYPTION_KEY)
                  </p>
                </div>
                <Switch
                  checked={encryptionEnabled}
                  onCheckedChange={(v) => setValue("encryptionEnabled", v, { shouldDirty: true })}
                  disabled={!canManage}
                />
              </div>
            </div>
          </div>

          {/* Retention */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="retentionDays">مدة الاحتفاظ (أيام)</Label>
              <Input
                id="retentionDays"
                type="number"
                min={1}
                max={3650}
                disabled={!canManage}
                aria-invalid={!!errors.retentionDays}
                {...register("retentionDays", { valueAsNumber: true })}
              />
              {errors.retentionDays && (
                <p className="text-xs text-destructive">{errors.retentionDays.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="keepLastN">الإبقاء على آخر (عدد)</Label>
              <Input
                id="keepLastN"
                type="number"
                min={1}
                max={1000}
                disabled={!canManage}
                aria-invalid={!!errors.keepLastN}
                {...register("keepLastN", { valueAsNumber: true })}
              />
              {errors.keepLastN && (
                <p className="text-xs text-destructive">{errors.keepLastN.message}</p>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label>الجدولة التلقائية</Label>
                <p className="text-xs text-muted-foreground">Scheduler داخلي - بلا Redis/Queue</p>
              </div>
              <Switch
                checked={scheduleEnabled}
                onCheckedChange={(v) => setValue("scheduleEnabled", v, { shouldDirty: true })}
                disabled={!canManage}
              />
            </div>
            {scheduleEnabled && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>التكرار</Label>
                  <Select
                    value={scheduleFrequency}
                    onValueChange={(v) =>
                      setValue("scheduleFrequency", v as BackupSettingsFormValues["scheduleFrequency"], {
                        shouldDirty: true,
                      })
                    }
                    disabled={!canManage}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">يومياً</SelectItem>
                      <SelectItem value="WEEKLY">أسبوعياً</SelectItem>
                      <SelectItem value="MONTHLY">شهرياً</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="scheduleTime">الوقت (HH:mm)</Label>
                  <Input
                    id="scheduleTime"
                    type="time"
                    dir="ltr"
                    disabled={!canManage}
                    aria-invalid={!!errors.scheduleTime}
                    {...register("scheduleTime")}
                  />
                  {errors.scheduleTime && (
                    <p className="text-xs text-destructive">{errors.scheduleTime.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="scheduleTimezone">المنطقة الزمنية</Label>
                  <Input
                    id="scheduleTimezone"
                    dir="ltr"
                    disabled={!canManage}
                    {...register("scheduleTimezone")}
                  />
                </div>
              </div>
            )}
          </div>

          {canManage && (
            <div className="flex justify-end">
              <Button type="submit" disabled={!isDirty || mutation.isPending}>
                {mutation.isPending && <Spinner className="text-primary-foreground" />}
                حفظ الإعدادات
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
