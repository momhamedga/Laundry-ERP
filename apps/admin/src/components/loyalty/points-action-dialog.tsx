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
import { useAdjustMutation, useBonusMutation } from "@/hooks/use-loyalty";
import type { LoyaltyAccountRow } from "@/types/loyalty";

interface PointsActionDialogProps {
  account: LoyaltyAccountRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PointsActionDialog({ account, open, onOpenChange }: PointsActionDialogProps) {
  const adjustMutation = useAdjustMutation();
  const bonusMutation = useBonusMutation();
  const [mode, setMode] = useState<"adjust" | "bonus">("adjust");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [bonusType, setBonusType] = useState("BONUS");

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) { setMode("adjust"); setPoints(""); setReason(""); setBonusType("BONUS"); }
  }

  const isPending = adjustMutation.isPending || bonusMutation.isPending;

  async function submit() {
    if (!account) return;
    try {
      if (mode === "adjust") {
        const p = Number(points);
        if (!p || reason.trim().length < 2) return;
        await adjustMutation.mutateAsync({ customerId: account.customerId, points: p, reason });
      } else {
        const p = Number(points);
        await bonusMutation.mutateAsync({ customerId: account.customerId, type: bonusType, points: p > 0 ? p : undefined });
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
          <DialogTitle>عملية نقاط</DialogTitle>
          <DialogDescription>{account?.customer.name} — الرصيد {account?.currentPoints ?? 0}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>العملية</Label>
            <Select value={mode} onValueChange={(v) => v && setMode(v as "adjust" | "bonus")}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="adjust">تسوية يدوية (+/-)</SelectItem>
                <SelectItem value="bonus">مكافأة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "bonus" && (
            <div className="space-y-1.5">
              <Label>نوع المكافأة</Label>
              <Select value={bonusType} onValueChange={(v) => v && setBonusType(v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WELCOME">ترحيب</SelectItem>
                  <SelectItem value="BIRTHDAY">ميلاد</SelectItem>
                  <SelectItem value="REFERRAL">إحالة</SelectItem>
                  <SelectItem value="BONUS">مكافأة عامة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="pts">النقاط {mode === "adjust" ? "(سالب للخصم)" : "(اترك فارغاً لقيمة الإعداد)"}</Label>
            <Input id="pts" type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
          </div>
          {mode === "adjust" && (
            <div className="space-y-1.5">
              <Label htmlFor="rsn">السبب *</Label>
              <Input id="rsn" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          )}
        </div>
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
