"use client";

import { History } from "lucide-react";
import { ExportDropdown } from "@/components/reports/export-dropdown";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLoginHistoryQuery } from "@/hooks/use-admin";
import { getErrorMessage } from "@/lib/axios";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { actionTone, auditActionLabel } from "./admin-format";

export function LoginHistoryTab() {
  const query = useLoginHistoryQuery({ limit: 50 });

  const exportBar = (
    <div className="flex flex-wrap justify-end gap-2">
      <ExportDropdown type="security" filters={{}} />
      <ExportDropdown type="audit" filters={{}} />
    </div>
  );

  if (query.isError) {
    return (
      <div className="space-y-4">
        {exportBar}
        <ErrorState
          title="تعذر تحميل سجل الدخول"
          description={getErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  if (query.isLoading || !query.data) {
    return (
      <div className="space-y-4">
        {exportBar}
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (query.data.entries.length === 0) {
    return (
      <div className="space-y-4">
        {exportBar}
        <EmptyState icon={History} title="لا يوجد سجل دخول" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {exportBar}
      <Card>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الحدث</TableHead>
              <TableHead>المستخدم / البريد</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>الجهاز</TableHead>
              <TableHead>الوقت</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell
                  className={cn("font-medium", actionTone(e.action) === "danger" && "text-destructive")}
                >
                  {auditActionLabel(e.action)}
                </TableCell>
                <TableCell>
                  <div>{e.userName ?? "—"}</div>
                  <div className="text-xs text-muted-foreground" dir="ltr">
                    {e.email ?? ""}
                  </div>
                </TableCell>
                <TableCell dir="ltr" className="text-xs">
                  {e.ipAddress ?? "—"}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={e.userAgent ?? ""}>
                  {e.userAgent ?? "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDateTime(e.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      </Card>
    </div>
  );
}
