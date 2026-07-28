"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/use-permissions";
import { AttendanceTab } from "./attendance-tab";
import { DocumentsTab } from "./documents-tab";
import { LeavesTab } from "./leaves-tab";
import { PayrollTab } from "./payroll-tab";

export function HrView() {
  const { can } = usePermissions();
  return (
    <div className="space-y-6">
      <PageHeader
        title="الموارد البشرية"
        description="الحضور والانصراف، الإجازات وأرصدتها، الرواتب والقسائم، ومستندات الموظفين"
      />
      <Tabs defaultValue="attendance">
        <TabsList className="w-full flex-wrap sm:w-fit">
          <TabsTrigger value="attendance">الحضور</TabsTrigger>
          <TabsTrigger value="leaves">الإجازات</TabsTrigger>
          {can("payroll:view") && <TabsTrigger value="payroll">الرواتب</TabsTrigger>}
          <TabsTrigger value="documents">المستندات</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance" className="mt-4">
          <AttendanceTab />
        </TabsContent>
        <TabsContent value="leaves" className="mt-4">
          <LeavesTab />
        </TabsContent>
        {can("payroll:view") && (
          <TabsContent value="payroll" className="mt-4">
            <PayrollTab />
          </TabsContent>
        )}
        <TabsContent value="documents" className="mt-4">
          <DocumentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
