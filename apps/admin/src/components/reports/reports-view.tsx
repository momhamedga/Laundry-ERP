"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReportTab } from "@/types/report";
import { BranchesReportView } from "./branches-report-view";
import { CustomersReportView } from "./customers-report-view";
import { EmployeesReportView } from "./employees-report-view";
import { OrdersReportView } from "./orders-report-view";
import { PaymentsReportView } from "./payments-report-view";
import { ServicesReportView } from "./services-report-view";

const TABS: { value: ReportTab; label: string }[] = [
  { value: "orders", label: "الطلبات" },
  { value: "payments", label: "المدفوعات" },
  { value: "customers", label: "العملاء" },
  { value: "services", label: "الخدمات" },
  { value: "branches", label: "الفروع" },
  { value: "employees", label: "الموظفون" },
];

/**
 * صفحة التقارير - 6 تبويبات، كل تبويب يستدعي Endpoint حقيقي مستقل خاص به.
 * حالة التبويب النشط محلية (بلا رابط URL) عمداً - صفحة استكشاف تقارير وليست
 * قائمة يُحتاج لحفظ رابطها كإشارة مرجعية (خلافاً لصفحات Orders/Payments)
 */
export function ReportsView() {
  const [tab, setTab] = useState<ReportTab>("orders");

  return (
    <div className="space-y-6">
      <PageHeader
        title="التقارير"
        description="Export غير مدعوم حالياً بواسطة الخادم"
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as ReportTab)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="orders">
          <OrdersReportView />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsReportView />
        </TabsContent>
        <TabsContent value="customers">
          <CustomersReportView />
        </TabsContent>
        <TabsContent value="services">
          <ServicesReportView />
        </TabsContent>
        <TabsContent value="branches">
          <BranchesReportView />
        </TabsContent>
        <TabsContent value="employees">
          <EmployeesReportView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
