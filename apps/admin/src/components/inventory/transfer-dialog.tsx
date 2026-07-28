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
import { useItemsQuery, useTransferMutation } from "@/hooks/use-inventory";
import { fmtQty } from "./inventory-format";

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferDialog({ open, onOpenChange }: TransferDialogProps) {
  const { data } = useItemsQuery({ limit: 100, isActive: true });
  const mutation = useTransferMutation();
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [quantity, setQuantity] = useState("");

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setFromId("");
      setToId("");
      setQuantity("");
    }
  }

  const items = data?.items ?? [];

  async function submit() {
    const qty = Number(quantity);
    if (!fromId || !toId || fromId === toId || !qty || qty <= 0) return;
    try {
      await mutation.mutateAsync({ fromItemId: fromId, toItemId: toId, quantity: qty });
      onOpenChange(false);
    } catch {
      // toast عبر onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تحويل مخزون</DialogTitle>
          <DialogDescription>نقل كمية من صنف إلى آخر (إخراج + إدخال بمعاملة واحدة)</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>من صنف</Label>
            <Select value={fromId} onValueChange={(v) => setFromId(v ?? "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="اختر" /></SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name} ({fmtQty(i.quantity)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>إلى صنف</Label>
            <Select value={toId} onValueChange={(v) => setToId(v ?? "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="اختر" /></SelectTrigger>
              <SelectContent>
                {items.filter((i) => i.id !== fromId).map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name} ({fmtQty(i.quantity)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tq">الكمية</Label>
            <Input id="tq" type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>إلغاء</Button>
          <Button onClick={() => void submit()} disabled={mutation.isPending || !fromId || !toId || fromId === toId}>
            {mutation.isPending && <Spinner className="text-primary-foreground" />}
            تحويل
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
