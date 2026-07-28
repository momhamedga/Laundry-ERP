"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/use-permissions";
import { AlertsTab } from "./alerts-tab";
import { InventoryReportsTab } from "./inventory-reports-tab";
import { ItemsTab } from "./items-tab";
import { MovementsTab } from "./movements-tab";
import { StockCountTab } from "./stock-count-tab";

export function InventoryView() {
  const { can } = usePermissions();
  const canManage = can("inventory:manage");

  return (
    <div className="space-y-6">
      <PageHeader title="المخزون" description="الأصناف والحركات والتنبيهات والجرد وتقارير المخزون" />

      <Tabs defaultValue="items">
        <TabsList className="w-full flex-wrap sm:w-fit">
          <TabsTrigger value="items">الأصناف</TabsTrigger>
          <TabsTrigger value="alerts">التنبيهات</TabsTrigger>
          <TabsTrigger value="history">الحركات</TabsTrigger>
          {canManage && <TabsTrigger value="count">الجرد</TabsTrigger>}
          <TabsTrigger value="reports">التقارير</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4">
          <ItemsTab />
        </TabsContent>
        <TabsContent value="alerts" className="mt-4">
          <AlertsTab />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <MovementsTab />
        </TabsContent>
        {canManage && (
          <TabsContent value="count" className="mt-4">
            <StockCountTab />
          </TabsContent>
        )}
        <TabsContent value="reports" className="mt-4">
          <InventoryReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
