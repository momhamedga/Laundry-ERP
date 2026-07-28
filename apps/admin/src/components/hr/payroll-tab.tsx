"use client";

import { CheckCircle2, Eye, Wallet } from "lucide-react";
import { useState } from "react";
import { ExportDropdown } from "@/components/reports/export-dropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  useApprovePayrollMutation,
  useGeneratePayrollMutation,
  usePayrollRunQuery,
  usePayrollRunsQuery,
} from "@/hooks/use-hr";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency } from "@/lib/format";
import { PAYROLL_STATUS_BADGE, PAYROLL_STATUS_LABELS } from "./hr-format";

export function PayrollTab() {
  const { can } = usePermissions();
  const canManage = can("payroll:manage");
  const canApprove = can("payroll:approve");
  const runs = usePayrollRunsQuery({ limit: 20 });
  const generate = useGeneratePayrollMutation();
  const approve = useApprovePayrollMutation();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);

  async function doGenerate() {
    if (!start || !end) return;
    try {
      await generate.mutateAsync({ periodStart: start, periodEnd: end });
      setStart("");
      setEnd("");
    } catch {
      /* toast */
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportDropdown type="payroll" filters={{}} />
      </div>
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">توليد دورة رواتب</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>بداية الفترة</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>نهاية الفترة</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <Button disabled={!start || !end || generate.isPending} onClick={() => void doGenerate()}>
              {generate.isPending && <Spinner className="text-primary-foreground" />}
              توليد
            </Button>
          </CardContent>
        </Card>
      )}

      {runs.isLoading || !runs.data ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : runs.data.runs.length === 0 ? (
        <EmptyState icon={Wallet} title="لا توجد دورات رواتب" />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الفترة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الموظفون</TableHead>
                  <TableHead className="text-end">الإجمالي</TableHead>
                  <TableHead className="text-end">الخصومات</TableHead>
                  <TableHead className="text-end">الصافي</TableHead>
                  <TableHead className="text-end">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.data.runs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.label}</TableCell>
                    <TableCell>
                      <Badge variant={PAYROLL_STATUS_BADGE[r.status]}>{PAYROLL_STATUS_LABELS[r.status]}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{r.payslipCount}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatCurrency(r.totalGross)}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatCurrency(r.totalDeductions)}</TableCell>
                    <TableCell className="text-end font-medium tabular-nums">{formatCurrency(r.totalNet)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" aria-label="تفاصيل" onClick={() => setViewId(r.id)}>
                          <Eye aria-hidden />
                        </Button>
                        {canApprove && r.status === "DRAFT" && (
                          <Button size="icon" variant="ghost" aria-label="اعتماد" disabled={approve.isPending} onClick={() => approve.mutate(r.id)}>
                            <CheckCircle2 aria-hidden />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <PayslipsDialog runId={viewId} onOpenChange={(o) => !o && setViewId(null)} />
    </div>
  );
}

function PayslipsDialog({ runId, onOpenChange }: { runId: string | null; onOpenChange: (o: boolean) => void }) {
  const query = usePayrollRunQuery(runId);
  return (
    <Dialog open={!!runId} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>قسائم الرواتب {query.data?.run.label ? `— ${query.data.run.label}` : ""}</DialogTitle>
        </DialogHeader>
        {!query.data ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموظف</TableHead>
                  <TableHead className="text-end">الأساسي</TableHead>
                  <TableHead className="text-end">بدلات</TableHead>
                  <TableHead className="text-end">إضافي</TableHead>
                  <TableHead className="text-end">خصومات</TableHead>
                  <TableHead className="text-end">الصافي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.payslips.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.employeeName}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatCurrency(p.baseSalary)}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatCurrency(p.allowances + p.bonuses)}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatCurrency(p.overtimePay)}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatCurrency(p.deductions)}</TableCell>
                    <TableCell className="text-end font-medium tabular-nums">{formatCurrency(p.netSalary)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
