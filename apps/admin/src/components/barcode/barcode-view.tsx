"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/use-permissions";
import { usePrintQueueStore } from "@/store/print-queue-store";
import { BarcodeCenterTab } from "./barcode-center-tab";
import { BarcodeReportsTab } from "./barcode-reports-tab";
import { LabelTemplatesTab } from "./label-templates-tab";
import { PrintHistoryTab } from "./print-history-tab";
import { PrintQueueTab } from "./print-queue-tab";
import { ScannerTab } from "./scanner-tab";

export function BarcodeView() {
  const { can } = usePermissions();
  const canPrint = can("barcode:print");
  const canManage = can("barcode:manage");
  const queueCount = usePrintQueueStore((s) => s.items.length);

  return (
    <div className="space-y-6">
      <PageHeader title="الباركود و QR" description="توليد وطباعة ومسح الباركود والملصقات وتقاريرها" />

      <Tabs defaultValue="center">
        <TabsList className="w-full flex-wrap sm:w-fit">
          <TabsTrigger value="center">المركز</TabsTrigger>
          <TabsTrigger value="scanner">الماسح</TabsTrigger>
          {canPrint && <TabsTrigger value="queue">الطابور{queueCount > 0 ? ` (${queueCount})` : ""}</TabsTrigger>}
          {canManage && <TabsTrigger value="templates">القوالب</TabsTrigger>}
          <TabsTrigger value="print-history">سجل الطباعة</TabsTrigger>
          <TabsTrigger value="reports">التقارير</TabsTrigger>
        </TabsList>

        <TabsContent value="center" className="mt-4">
          <BarcodeCenterTab />
        </TabsContent>
        <TabsContent value="scanner" className="mt-4">
          <ScannerTab />
        </TabsContent>
        {canPrint && (
          <TabsContent value="queue" className="mt-4">
            <PrintQueueTab />
          </TabsContent>
        )}
        {canManage && (
          <TabsContent value="templates" className="mt-4">
            <LabelTemplatesTab />
          </TabsContent>
        )}
        <TabsContent value="print-history" className="mt-4">
          <PrintHistoryTab />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <BarcodeReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
