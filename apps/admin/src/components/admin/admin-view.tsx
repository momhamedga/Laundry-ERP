"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/use-permissions";
import { LoginHistoryTab } from "./login-history-tab";
import { PermissionsMatrixTab } from "./permissions-matrix-tab";
import { SecurityCenterTab } from "./security-center-tab";
import { UserPermissionsTab } from "./user-permissions-tab";

export function AdminView() {
  const { can } = usePermissions();
  return (
    <div className="space-y-6">
      <PageHeader
        title="الإدارة والأمان"
        description="مركز الأمان، سجل الدخول، الجلسات، مصفوفة الصلاحيات، وصلاحيات المستخدمين والدخول كمستخدم"
      />
      <Tabs defaultValue="security">
        <TabsList className="w-full flex-wrap sm:w-fit">
          <TabsTrigger value="security">مركز الأمان</TabsTrigger>
          <TabsTrigger value="history">سجل الدخول</TabsTrigger>
          <TabsTrigger value="matrix">مصفوفة الأدوار</TabsTrigger>
          {can("security:view") && <TabsTrigger value="user-perms">صلاحيات المستخدمين</TabsTrigger>}
        </TabsList>
        <TabsContent value="security" className="mt-4">
          <SecurityCenterTab />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <LoginHistoryTab />
        </TabsContent>
        <TabsContent value="matrix" className="mt-4">
          <PermissionsMatrixTab />
        </TabsContent>
        {can("security:view") && (
          <TabsContent value="user-perms" className="mt-4">
            <UserPermissionsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
