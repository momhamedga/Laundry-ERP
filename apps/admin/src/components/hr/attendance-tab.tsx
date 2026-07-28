"use client";

import { Coffee, LogIn, LogOut, Play } from "lucide-react";
import { useState } from "react";
import { ExportDropdown } from "@/components/reports/export-dropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useApproveAttendanceMutation,
  useAttendanceQuery,
  useBreakMutation,
  useClockInMutation,
  useClockOutMutation,
} from "@/hooks/use-hr";
import { usePermissions } from "@/hooks/use-permissions";
import { formatDateTime } from "@/lib/format";
import { ATTENDANCE_STATUS_BADGE, ATTENDANCE_STATUS_LABELS, minutesToHhMm } from "./hr-format";
import { EmployeeSelect } from "./employee-select";

export function AttendanceTab() {
  const { can } = usePermissions();
  const canManage = can("attendance:manage");
  const [employeeId, setEmployeeId] = useState("");
  const list = useAttendanceQuery({ limit: 30 });

  const clockIn = useClockInMutation();
  const clockOut = useClockOutMutation();
  const brk = useBreakMutation();
  const approve = useApproveAttendanceMutation();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportDropdown type="attendance" filters={{}} />
      </div>
      {canManage && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2">
            <EmployeeSelect value={employeeId} onChange={setEmployeeId} />
            <Button
              size="sm"
              disabled={!employeeId || clockIn.isPending}
              onClick={() => clockIn.mutate({ employeeProfileId: employeeId })}
            >
              <LogIn aria-hidden />
              حضور
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!employeeId || brk.isPending}
              onClick={() => brk.mutate({ employeeProfileId: employeeId, action: "start" })}
            >
              <Coffee aria-hidden />
              استراحة
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!employeeId || brk.isPending}
              onClick={() => brk.mutate({ employeeProfileId: employeeId, action: "resume" })}
            >
              <Play aria-hidden />
              استئناف
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!employeeId || clockOut.isPending}
              onClick={() => clockOut.mutate(employeeId)}
            >
              <LogOut aria-hidden />
              انصراف
            </Button>
          </CardContent>
        </Card>
      )}

      {list.isLoading || !list.data ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : list.data.records.length === 0 ? (
        <EmptyState icon={LogIn} title="لا توجد سجلات حضور" />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموظف</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحضور</TableHead>
                  <TableHead>الانصراف</TableHead>
                  <TableHead>ساعات العمل</TableHead>
                  <TableHead>التأخير</TableHead>
                  <TableHead>الإضافي</TableHead>
                  <TableHead>الحالة</TableHead>
                  {canManage && <TableHead className="text-end">إجراءات</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.employeeName}</TableCell>
                    <TableCell className="tabular-nums">{r.workDate}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.clockInAt)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.clockOutAt)}</TableCell>
                    <TableCell className="tabular-nums">{minutesToHhMm(r.workedMinutes)}</TableCell>
                    <TableCell className="tabular-nums">{r.lateMinutes ? minutesToHhMm(r.lateMinutes) : "—"}</TableCell>
                    <TableCell className="tabular-nums">{r.overtimeMinutes ? minutesToHhMm(r.overtimeMinutes) : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={ATTENDANCE_STATUS_BADGE[r.status]}>{ATTENDANCE_STATUS_LABELS[r.status]}</Badge>
                      {r.isManual && !r.approvedAt && (
                        <Badge variant="outline" className="ms-1">يدوي</Badge>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-end">
                        {r.isManual && !r.approvedAt && (
                          <Button size="sm" variant="ghost" disabled={approve.isPending} onClick={() => approve.mutate(r.id)}>
                            اعتماد
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
