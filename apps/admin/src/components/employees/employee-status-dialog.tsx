"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useChangeEmployeeStatusMutation } from "@/hooks/use-employees";
import type { EmployeeView, EmploymentStatus } from "@/types/employee";
import { EMPLOYMENT_STATUS_LABELS } from "./employee-format";

interface Props {
  employee: EmployeeView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeStatusDialog({ employee, open, onOpenChange }: Props) {
  const mutation = useChangeEmployeeStatusMutation();
  const [status, setStatus] = useState<EmploymentStatus>("ACTIVE");
  const [reason, setReason] = useState("");

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && employee) {
      setStatus(employee.status);
      setReason("");
    }
  }

  async function submit() {
    if (!employee) return;
    try {
      await mutation.mutateAsync({
        id: employee.id,
        input: { status, reason: reason.trim() || undefined },
      });
      onOpenChange(false);
    } catch {
      // toast عبر onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تغيير حالة الموظف</DialogTitle>
          <DialogDescription>{employee?.user.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>الحالة</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v as EmploymentStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EMPLOYMENT_STATUS_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status-reason">السبب (اختياري)</Label>
            <Textarea
              id="status-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            إلغاء
          </Button>
          <Button onClick={() => void submit()} disabled={mutation.isPending}>
            {mutation.isPending && <Spinner className="text-primary-foreground" />}
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
