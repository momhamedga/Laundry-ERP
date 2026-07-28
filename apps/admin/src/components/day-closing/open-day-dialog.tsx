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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useOpenDayMutation } from "@/hooks/use-day-closing";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OpenDayDialog({ open, onOpenChange }: Props) {
  const mutation = useOpenDayMutation();
  const [openingCash, setOpeningCash] = useState("");
  const [notes, setNotes] = useState("");

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setOpeningCash("");
      setNotes("");
    }
  }

  async function submit() {
    try {
      await mutation.mutateAsync({
        openingCash: openingCash ? Number(openingCash) : undefined,
        notes: notes.trim() || undefined,
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
          <DialogTitle>فتح يوم عمل</DialogTitle>
          <DialogDescription>
            ابدأ وردية جديدة بتحديد رصيد الصندوق الافتتاحي. لا يمكن فتح أكثر من يوم واحد معاً.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="opening-cash">الرصيد الافتتاحي للصندوق</Label>
            <Input
              id="opening-cash"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="open-notes">ملاحظات (اختياري)</Label>
            <Textarea
              id="open-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            إلغاء
          </Button>
          <Button onClick={() => void submit()} disabled={mutation.isPending}>
            {mutation.isPending && <Spinner className="text-primary-foreground" />}
            فتح اليوم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
