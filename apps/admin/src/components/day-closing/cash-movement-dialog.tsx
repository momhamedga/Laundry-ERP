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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useCashMovementMutation } from "@/hooks/use-day-closing";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CashMovementDialog({ open, onOpenChange }: Props) {
  const mutation = useCashMovementMutation();
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setType("IN");
      setAmount("");
      setNote("");
    }
  }

  const canSubmit = amount !== "" && Number(amount) > 0;

  async function submit() {
    if (!canSubmit) return;
    try {
      await mutation.mutateAsync({ type, amount: Number(amount), note: note.trim() || undefined });
      onOpenChange(false);
    } catch {
      // toast عبر onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>حركة نقدية</DialogTitle>
          <DialogDescription>سجّل إيداعاً أو سحباً نقدياً على صندوق الوردية الحالية.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>النوع</Label>
            <Select value={type} onValueChange={(v) => v && setType(v as "IN" | "OUT")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN">إيداع (+)</SelectItem>
                <SelectItem value="OUT">سحب / مصروف (−)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cash-amount">المبلغ *</Label>
            <Input
              id="cash-amount"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cash-note">ملاحظة (اختياري)</Label>
            <Input id="cash-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            إلغاء
          </Button>
          <Button onClick={() => void submit()} disabled={mutation.isPending || !canSubmit}>
            {mutation.isPending && <Spinner className="text-primary-foreground" />}
            تسجيل
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
