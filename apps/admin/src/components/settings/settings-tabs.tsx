"use client";

import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SettingsFormValues } from "@/lib/validations/settings";
import type { SystemInfo } from "@/types/settings";
import { AppearanceSettingsCard } from "./appearance-settings-card";
import { GeneralSettingsCard } from "./general-settings-card";
import { NotificationPreferencesPanel } from "./notification-preferences-panel";
import { NotificationsSettingsCard } from "./notifications-settings-card";
import { SecuritySettingsCard } from "./security-settings-card";
import { SystemInformationCard } from "./system-information-card";

interface SettingsTabsProps {
  register: UseFormRegister<SettingsFormValues>;
  errors: FieldErrors<SettingsFormValues>;
  watch: UseFormWatch<SettingsFormValues>;
  setValue: UseFormSetValue<SettingsFormValues>;
  system: SystemInfo;
  readOnly: boolean;
}

export function SettingsTabs({ register, errors, watch, setValue, system, readOnly }: SettingsTabsProps) {
  return (
    <Tabs defaultValue="general">
      <TabsList className="w-full flex-wrap sm:w-fit">
        <TabsTrigger value="general">عام</TabsTrigger>
        <TabsTrigger value="appearance">المظهر</TabsTrigger>
        <TabsTrigger value="notifications">الإشعارات</TabsTrigger>
        <TabsTrigger value="security">الأمان</TabsTrigger>
        <TabsTrigger value="system">النظام</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="mt-4">
        <GeneralSettingsCard register={register} errors={errors} watch={watch} setValue={setValue} readOnly={readOnly} />
      </TabsContent>
      <TabsContent value="appearance" className="mt-4">
        <AppearanceSettingsCard watch={watch} setValue={setValue} readOnly={readOnly} />
      </TabsContent>
      <TabsContent value="notifications" className="mt-4 space-y-4">
        <NotificationsSettingsCard watch={watch} setValue={setValue} readOnly={readOnly} />
        <NotificationPreferencesPanel />
      </TabsContent>
      <TabsContent value="security" className="mt-4">
        <SecuritySettingsCard register={register} errors={errors} readOnly={readOnly} />
      </TabsContent>
      <TabsContent value="system" className="mt-4">
        <SystemInformationCard system={system} canManage={!readOnly} />
      </TabsContent>
    </Tabs>
  );
}
