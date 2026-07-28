"use client";

import { BadgeCheck, Building2, Pencil, Plus, Search, Settings2, Users } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/cards/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEmployeeStatsQuery, useEmployeesQuery } from "@/hooks/use-employees";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import { formatDate } from "@/lib/format";
import type { EmployeeView } from "@/types/employee";
import {
  CONTRACT_TYPE_LABELS,
  EMPLOYMENT_STATUS_BADGE,
  EMPLOYMENT_STATUS_LABELS,
} from "./employee-format";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { EmployeeStatusDialog } from "./employee-status-dialog";

export function EmployeesView() {
  const { can } = usePermissions();
  const canManage = can("employees:manage");
  const [search, setSearch] = useState("");
  const stats = useEmployeeStatsQuery();
  const list = useEmployeesQuery({ limit: 50, ...(search.trim() ? { search: search.trim() } : {}) });

  const [formTarget, setFormTarget] = useState<EmployeeView | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<EmployeeView | null>(null);

  function openCreate() {
    setFormTarget(null);
    setFormOpen(true);
  }
  function openEdit(e: EmployeeView) {
    setFormTarget(e);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الموظفون"
        description="ملفات بيانات الموظفين الوظيفية والشخصية وحالة التوظيف"
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus aria-hidden />
              ملف موظف
            </Button>
          ) : undefined
        }
      />

      {/* إحصائيات */}
      {stats.data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="إجمالي الموظفين" value={stats.data.total.toLocaleString("ar-EG")} icon={Users} />
          <MetricCard
            title="نشطون"
            value={stats.data.byStatus.ACTIVE.toLocaleString("ar-EG")}
            icon={BadgeCheck}
            tone="success"
          />
          <MetricCard
            title="منتهو الخدمة"
            value={stats.data.byStatus.TERMINATED.toLocaleString("ar-EG")}
            icon={Users}
            tone="warning"
          />
          <MetricCard title="الأقسام" value={stats.data.departments.toLocaleString("ar-EG")} icon={Building2} />
        </div>
      )}

      {/* بحث */}
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          className="ps-9"
          placeholder="ابحث بالاسم أو المسمى أو القسم…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {list.isError ? (
        <ErrorState
          title="تعذر تحميل الموظفين"
          description={getErrorMessage(list.error)}
          onRetry={() => void list.refetch()}
        />
      ) : list.isLoading || !list.data ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : list.data.employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="لا يوجد موظفون"
          description="أنشئ ملف موظف واربطه بمستخدم قائم في النظام."
          action={
            canManage ? (
              <Button onClick={openCreate}>
                <Plus aria-hidden />
                ملف موظف
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموظف</TableHead>
                  <TableHead>المسمى / القسم</TableHead>
                  <TableHead>نوع العقد</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التعيين</TableHead>
                  {canManage && <TableHead className="text-end">إجراءات</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.employees.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="font-medium">{e.user.name}</div>
                      <div className="text-xs text-muted-foreground" dir="ltr">
                        {e.employeeCode ? `${e.employeeCode} · ` : ""}
                        {e.user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{e.jobTitle ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{e.department ?? "—"}</div>
                    </TableCell>
                    <TableCell>{CONTRACT_TYPE_LABELS[e.employmentType]}</TableCell>
                    <TableCell>
                      <Badge variant={EMPLOYMENT_STATUS_BADGE[e.status]}>
                        {EMPLOYMENT_STATUS_LABELS[e.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(e.hireDate)}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label="تعديل" onClick={() => openEdit(e)}>
                            <Pencil aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="تغيير الحالة"
                            onClick={() => setStatusTarget(e)}
                          >
                            <Settings2 aria-hidden />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <EmployeeFormDialog employee={formTarget} open={formOpen} onOpenChange={setFormOpen} />
      <EmployeeStatusDialog
        employee={statusTarget}
        open={!!statusTarget}
        onOpenChange={(o) => !o && setStatusTarget(null)}
      />
    </div>
  );
}
