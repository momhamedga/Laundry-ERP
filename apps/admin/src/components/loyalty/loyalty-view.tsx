"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/use-permissions";
import { AccountsTab } from "./accounts-tab";
import { CampaignsTab } from "./campaigns-tab";
import { LoyaltyReportsTab } from "./loyalty-reports-tab";
import { LoyaltySettingsTab } from "./loyalty-settings-tab";
import { PointsHistoryTab } from "./points-history-tab";

export function LoyaltyView() {
  const { can } = usePermissions();
  const canManage = can("loyalty:manage");

  return (
    <div className="space-y-6">
      <PageHeader title="الولاء والنقاط" description="حسابات النقاط والحركات والحملات وإعدادات الاحتساب" />
      <Tabs defaultValue="accounts">
        <TabsList className="w-full flex-wrap sm:w-fit">
          <TabsTrigger value="accounts">الحسابات</TabsTrigger>
          <TabsTrigger value="history">سجل النقاط</TabsTrigger>
          <TabsTrigger value="campaigns">الحملات</TabsTrigger>
          {canManage && <TabsTrigger value="settings">الإعدادات</TabsTrigger>}
          <TabsTrigger value="reports">التقارير</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts" className="mt-4"><AccountsTab /></TabsContent>
        <TabsContent value="history" className="mt-4"><PointsHistoryTab /></TabsContent>
        <TabsContent value="campaigns" className="mt-4"><CampaignsTab /></TabsContent>
        {canManage && <TabsContent value="settings" className="mt-4"><LoyaltySettingsTab /></TabsContent>}
        <TabsContent value="reports" className="mt-4"><LoyaltyReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
