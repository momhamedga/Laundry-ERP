"use client";

import { LogOut, MonitorSmartphone, ShieldAlert, ShieldCheck, UserX } from "lucide-react";
import { useState } from "react";
import { MetricCard } from "@/components/cards/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useSecurityCenterQuery } from "@/hooks/use-admin";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { actionTone, auditActionLabel } from "./admin-format";
import { ForceLogoutDialog } from "./force-logout-dialog";

export function SecurityCenterTab() {
  const { can } = usePermissions();
  const query = useSecurityCenterQuery();
  const [forceOpen, setForceOpen] = useState(false);

  if (query.isError) {
    return (
      <ErrorState
        title="تعذر تحميل مركز الأمان"
        description={getErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (query.isLoading || !query.data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[74px] rounded-xl" />
        ))}
      </div>
    );
  }

  const s = query.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="مستخدمون نشطون" value={String(s.users.active)} icon={ShieldCheck} tone="success" />
        <MetricCard title="حسابات مقفلة" value={String(s.users.locked)} icon={UserX} tone={s.users.locked ? "destructive" : "default"} />
        <MetricCard title="جلسات نشطة" value={String(s.sessions.active)} icon={MonitorSmartphone} />
        <MetricCard
          title="محاولات فاشلة (24س)"
          value={String(s.logins.failedLast24h)}
          icon={ShieldAlert}
          tone={s.logins.failedLast24h ? "warning" : "default"}
        />
      </div>

      {can("security:manage") && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setForceOpen(true)}>
            <LogOut aria-hidden />
            إخراج قسري
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>أحدث الأحداث الأمنية</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الحدث</TableHead>
                <TableHead>المستخدم</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>الوقت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.recentEvents.map((e) => (
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
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(e.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ForceLogoutDialog open={forceOpen} onOpenChange={setForceOpen} />
    </div>
  );
}
