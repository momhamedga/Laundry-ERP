"use client";

import { DatabaseBackup, Eraser, Plus, Upload } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCleanupBackupsMutation,
  useCreateBackupMutation,
} from "@/hooks/use-backup";
import { usePermissions } from "@/hooks/use-permissions";
import { BackupHealthCards } from "./backup-health-cards";
import { BackupHistoryTable } from "./backup-history-table";
import { BackupSettingsCard } from "./backup-settings-card";
import { BackupStatisticsCards } from "./backup-statistics-cards";
import { RestoreBackupDialog } from "./restore-backup-dialog";

/** صفحة النسخ الاحتياطي الكاملة (Phase 6) - Dashboard / History / Settings */
export function BackupView() {
  const { can } = usePermissions();
  const [restoreOpen, setRestoreOpen] = useState(false);

  const createMutation = useCreateBackupMutation();
  const cleanupMutation = useCleanupBackupsMutation();

  const canCreate = can("backup:create");
  const canRestore = can("backup:restore");
  const canManage = can("backup:manage");

  return (
    <div className="space-y-6">
      <PageHeader
        title="النسخ الاحتياطي"
        description="إنشاء واستعادة وجدولة النسخ الاحتياطية - محلي وسحابي"
        actions={
          <>
            {canRestore && (
              <Button variant="outline" size="sm" onClick={() => setRestoreOpen(true)}>
                <Upload aria-hidden /> استعادة
              </Button>
            )}
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => cleanupMutation.mutate()}
                disabled={cleanupMutation.isPending}
              >
                {cleanupMutation.isPending ? <Spinner className="size-3.5" /> : <Eraser aria-hidden />}
                تنظيف
              </Button>
            )}
            {canCreate && (
              <Button
                size="sm"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Spinner className="size-3.5 text-primary-foreground" />
                ) : (
                  <Plus aria-hidden />
                )}
                نسخة جديدة
              </Button>
            )}
          </>
        }
      />

      <Tabs defaultValue="dashboard">
        <TabsList className="w-full flex-wrap sm:w-fit">
          <TabsTrigger value="dashboard">
            <DatabaseBackup aria-hidden className="size-4" /> اللوحة
          </TabsTrigger>
          <TabsTrigger value="history">السجل</TabsTrigger>
          {canManage && <TabsTrigger value="settings">الإعدادات</TabsTrigger>}
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 space-y-4">
          <BackupStatisticsCards />
          <BackupHealthCards />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <BackupHistoryTable />
        </TabsContent>

        {canManage && (
          <TabsContent value="settings" className="mt-4">
            <BackupSettingsCard />
          </TabsContent>
        )}
      </Tabs>

      <RestoreBackupDialog open={restoreOpen} onOpenChange={setRestoreOpen} />
    </div>
  );
}
