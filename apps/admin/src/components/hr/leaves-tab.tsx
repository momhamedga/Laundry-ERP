"use client";

import { CalendarDays, Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateLeaveMutation,
  useLeaveBalancesQuery,
  useLeavesQuery,
  useReviewLeaveMutation,
} from "@/hooks/use-hr";
import { usePermissions } from "@/hooks/use-permissions";
import type { LeaveType } from "@/types/hr";
import { LEAVE_STATUS_BADGE, LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS } from "./hr-format";
import { EmployeeSelect } from "./employee-select";

export function LeavesTab() {
  const { can } = usePermissions();
  const canManage = can("leave:manage");
  const canApprove = can("leave:approve");
  const list = useLeavesQuery({ limit: 30 });
  const review = useReviewLeaveMutation();
  const [createOpen, setCreateOpen] = useState(false);
  const [balanceEmp, setBalanceEmp] = useState("");
  const balances = useLeaveBalancesQuery(balanceEmp || null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <EmployeeSelect value={balanceEmp} onChange={setBalanceEmp} placeholder="عرض رصيد موظف" />
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden />
            طلب إجازة
          </Button>
        )}
      </div>

      {balanceEmp && balances.data && balances.data.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {balances.data.map((b) => (
            <Card key={b.id} className="px-3 py-2">
              <div className="text-xs text-muted-foreground">
                {LEAVE_TYPE_LABELS[b.type]} {b.year}
              </div>
              <div className="text-sm font-medium tabular-nums">
                {b.remainingDays} / {b.entitledDays} يوم متبقٍ
              </div>
            </Card>
          ))}
        </div>
      )}

      {list.isLoading || !list.data ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : list.data.leaves.length === 0 ? (
        <EmptyState icon={CalendarDays} title="لا توجد طلبات إجازة" />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموظف</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>من</TableHead>
                  <TableHead>إلى</TableHead>
                  <TableHead>الأيام</TableHead>
                  <TableHead>الحالة</TableHead>
                  {canApprove && <TableHead className="text-end">مراجعة</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.leaves.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.employeeName}</TableCell>
                    <TableCell>{LEAVE_TYPE_LABELS[l.type]}</TableCell>
                    <TableCell className="tabular-nums">{l.startDate}</TableCell>
                    <TableCell className="tabular-nums">{l.endDate}</TableCell>
                    <TableCell className="tabular-nums">{l.days}</TableCell>
                    <TableCell>
                      <Badge variant={LEAVE_STATUS_BADGE[l.status]}>{LEAVE_STATUS_LABELS[l.status]}</Badge>
                    </TableCell>
                    {canApprove && (
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {l.status === "PENDING" && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label="اعتماد"
                                disabled={review.isPending}
                                onClick={() => review.mutate({ id: l.id, input: { status: "APPROVED" } })}
                              >
                                <Check aria-hidden />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label="رفض"
                                disabled={review.isPending}
                                onClick={() => review.mutate({ id: l.id, input: { status: "REJECTED" } })}
                              >
                                <X aria-hidden />
                              </Button>
                            </>
                          )}
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

      <CreateLeaveDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreateLeaveDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const mutation = useCreateLeaveMutation();
  const [employeeProfileId, setEmployeeProfileId] = useState("");
  const [type, setType] = useState<LeaveType>("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const [prev, setPrev] = useState(false);
  if (open !== prev) {
    setPrev(open);
    if (open) {
      setEmployeeProfileId("");
      setType("ANNUAL");
      setStartDate("");
      setEndDate("");
      setReason("");
    }
  }

  const canSubmit = employeeProfileId && startDate && endDate;
  async function submit() {
    if (!canSubmit) return;
    try {
      await mutation.mutateAsync({ employeeProfileId, type, startDate, endDate, reason: reason.trim() || undefined });
      onOpenChange(false);
    } catch {
      /* toast */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>طلب إجازة</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>الموظف *</Label>
            <EmployeeSelect value={employeeProfileId} onChange={setEmployeeProfileId} className="w-full" />
          </div>
          <div className="space-y-1.5">
            <Label>النوع</Label>
            <Select value={type} onValueChange={(v) => v && setType(v as LeaveType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LEAVE_TYPE_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>من *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>إلى *</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>السبب</Label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            إلغاء
          </Button>
          <Button onClick={() => void submit()} disabled={mutation.isPending || !canSubmit}>
            {mutation.isPending && <Spinner className="text-primary-foreground" />}
            تقديم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
