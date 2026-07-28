"use client";

import { Database, Download, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataPagination } from "@/components/tables/data-pagination";
import {
  useBackupHistoryQuery,
  useDownloadStoredBackupMutation,
  useRetryBackupMutation,
} from "@/hooks/use-backup";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import { formatDateTime } from "@/lib/format";
import type { BackupHistoryParams, BackupRecord } from "@/types/backup";
import { formatBytes, formatDuration } from "./backup-format";
import { BackupStatusBadge } from "./backup-status-badge";
import { DeleteBackupDialog } from "./delete-backup-dialog";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const PROVIDER_LABEL: Record<string, string> = {
  LOCAL: "محلي",
  S3: "S3",
  R2: "R2",
  BACKBLAZE: "Backblaze",
};
const TRIGGER_LABEL: Record<string, string> = { MANUAL: "يدوي", SCHEDULED: "مجدول" };

export function BackupHistoryTable() {
  const { can } = usePermissions();
  const [params, setParams] = useState<BackupHistoryParams>({ page: 1, limit: 20 });
  const [toDelete, setToDelete] = useState<BackupRecord | null>(null);

  const { data, isLoading, isError, error, refetch } = useBackupHistoryQuery(params);
  const downloadMutation = useDownloadStoredBackupMutation();
  const retryMutation = useRetryBackupMutation();

  const canManage = can("backup:manage");
  const canCreate = can("backup:create");

  if (isLoading && !data) {
    return (
      <div className="rounded-xl border">
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border">
        <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
      </div>
    );
  }

  const backups = data?.backups ?? [];

  return (
    <div className="rounded-xl border">
      {backups.length === 0 ? (
        <EmptyState
          icon={Database}
          title="لا توجد نسخ احتياطية بعد"
          description="أنشئ أول نسخة احتياطية للبدء"
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الملف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المصدر</TableHead>
                  <TableHead>المزوّد</TableHead>
                  <TableHead className="text-end">الحجم</TableHead>
                  <TableHead className="text-end">المدة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead className="text-end">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="max-w-[220px]">
                      <span dir="ltr" className="block truncate text-xs" title={b.filename}>
                        {b.filename}
                      </span>
                      {b.error && (
                        <span className="block truncate text-xs text-destructive" title={b.error}>
                          {b.error}
                        </span>
                      )}
                      {b.retryCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          محاولات: {b.retryCount}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <BackupStatusBadge status={b.status} />
                    </TableCell>
                    <TableCell className="text-sm">{TRIGGER_LABEL[b.trigger] ?? b.trigger}</TableCell>
                    <TableCell className="text-sm">
                      {PROVIDER_LABEL[b.provider] ?? b.provider}
                      {b.compressed && <span className="text-muted-foreground"> · مضغوطة</span>}
                    </TableCell>
                    <TableCell className="text-end text-sm">{formatBytes(b.sizeBytes)}</TableCell>
                    <TableCell className="text-end text-sm">{formatDuration(b.durationMs)}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(b.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {b.status === "COMPLETED" && b.storagePath && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="تنزيل"
                            disabled={downloadMutation.isPending}
                            onClick={() =>
                              downloadMutation.mutate({ id: b.id, filename: b.filename })
                            }
                          >
                            <Download aria-hidden />
                          </Button>
                        )}
                        {b.status === "FAILED" && canCreate && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="إعادة المحاولة"
                            disabled={retryMutation.isPending}
                            onClick={() => retryMutation.mutate(b.id)}
                          >
                            {retryMutation.isPending && retryMutation.variables === b.id ? (
                              <Spinner className="size-3.5" />
                            ) : (
                              <RotateCcw aria-hidden />
                            )}
                          </Button>
                        )}
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            title="حذف"
                            onClick={() => setToDelete(b)}
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data && (
            <DataPagination
              meta={data.meta}
              onPageChange={(page) => setParams((p) => ({ ...p, page }))}
              onLimitChange={(limit) => setParams((p) => ({ ...p, limit, page: 1 }))}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
          )}
        </>
      )}

      <DeleteBackupDialog
        backup={toDelete}
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
      />
    </div>
  );
}
