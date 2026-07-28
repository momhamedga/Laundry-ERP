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
import { useAdjustMutation, useMovementMutation } from "@/hooks/use-inventory";
import type { GenericMovementType, InventoryItem } from "@/types/inventory";
import { fmtQty, MOVEMENT_LABELS } from "./inventory-format";

const MOVEMENT_TYPES: GenericMovementType[] = ["IN", "OUT", "RETURN", "LOSS", "OPENING", "CLOSING"];

interface MovementDialogProps {
  item: InventoryItem | null;
  mode: "movement" | "adjust";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MovementDialog({ item, mode, open, onOpenChange }: MovementDialogProps) {
  const movementMutation = useMovementMutation();
  const adjustMutation = useAdjustMutation();

  const [type, setType] = useState<GenericMovementType>("IN");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [reason, setReason] = useState("");

  // إعادة تهيئة الحقول عند فتح الحوار - نمط "الضبط أثناء العرض" الموصى به من React
  // بدل setState داخل useEffect (يتفادى renders متسلسلة)
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && item) {
      setType("IN");
      setQuantity("");
      setNote("");
      setNewQuantity(String(Number(item.quantity)));
      setReason("");
    }
  }

  const isPending = movementMutation.isPending || adjustMutation.isPending;

  async function submit() {
    if (!item) return;
    try {
      if (mode === "movement") {
        const qty = Number(quantity);
        if (!qty || qty <= 0) return;
        await movementMutation.mutateAsync({ id: item.id, input: { type, quantity: qty, note: note || null } });
      } else {
        const nq = Number(newQuantity);
        if (Number.isNaN(nq) || nq < 0 || reason.trim().length < 2) return;
        await adjustMutation.mutateAsync({ id: item.id, input: { newQuantity: nq, reason } });
      }
      onOpenChange(false);
    } catch {
      // toast عبر onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "movement" ? "حركة مخزون" : "تعديل الرصيد"}</DialogTitle>
          <DialogDescription>
            {item?.name} — الرصيد الحالي: {item ? fmtQty(item.quantity) : "—"}
          </DialogDescription>
        </DialogHeader>

        {mode === "movement" ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>نوع الحركة</Label>
              <Select value={type} onValueChange={(v) => setType(v as GenericMovementType)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOVEMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{MOVEMENT_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qty">الكمية</Label>
              <Input id="qty" type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">ملاحظة</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nq">الرصيد الجديد</Label>
              <Input id="nq" type="number" step="any" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reason">السبب *</Label>
              <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>إلغاء</Button>
          <Button onClick={() => void submit()} disabled={isPending}>
            {isPending && <Spinner className="text-primary-foreground" />}
            تأكيد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
