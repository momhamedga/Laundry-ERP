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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useReopenDayMutation } from "@/hooks/use-day-closing";

interface Props {
  dayId: string | null;
  businessDate: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReopenDayDialog({ dayId, businessDate, open, onOpenChange }: Props) {
  const mutation = useReopenDayMutation();
  const [reason, setReason] = useState("");

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setReason("");
  }

  const canSubmit = reason.trim().length >= 3;

  async function submit() {
    if (!dayId || !canSubmit) return;
    try {
      await mutation.mutateAsync({ id: dayId, reason: reason.trim() });
      onOpenChange(false);
    } catch {
      // toast عبر onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إعادة فتح اليوم</DialogTitle>
          <DialogDescription>
            {businessDate ? `يوم ${businessDate} — ` : ""}
            إعادة الفتح تفكّ قفل الفترة وتتيح تعديل العمليات. متاحة لمدير النظام فقط، والسبب إلزامي للتوثيق.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="reopen-reason">سبب إعادة الفتح *</Label>
          <Textarea
            id="reopen-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            إلغاء
          </Button>
          <Button onClick={() => void submit()} disabled={mutation.isPending || !canSubmit}>
            {mutation.isPending && <Spinner className="text-primary-foreground" />}
            إعادة الفتح
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
