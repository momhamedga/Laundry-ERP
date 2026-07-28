"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrentDayTab } from "./current-day-tab";
import { HistoryTab } from "./history-tab";

export function DayClosingView() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="إغلاق اليوم المحاسبي"
        description="فتح وإغلاق وردية العمل، متابعة الصندوق والإيرادات لحظياً، وسجل الإغلاق اليومي"
      />
      <Tabs defaultValue="current">
        <TabsList className="w-full flex-wrap sm:w-fit">
          <TabsTrigger value="current">اليوم الحالي</TabsTrigger>
          <TabsTrigger value="history">السجل والتقارير</TabsTrigger>
        </TabsList>
        <TabsContent value="current" className="mt-4">
          <CurrentDayTab />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
