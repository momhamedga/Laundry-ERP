"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useUpdateTierMutation } from "@/hooks/use-membership";
import type { MembershipTier } from "@/types/loyalty";
import { LEVEL_LABELS } from "@/components/loyalty/loyalty-format";

interface TierEditDialogProps {
  tier: MembershipTier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TierEditDialog({ tier, open, onOpenChange }: TierEditDialogProps) {
  const mutation = useUpdateTierMutation();
  const [minPts, setMinPts] = useState("");
  const [discount, setDiscount] = useState("");
  const [extra, setExtra] = useState("");
  const [priority, setPriority] = useState(false);
  const [freeService, setFreeService] = useState(false);

  const [prevId, setPrevId] = useState<string | null>(null);
  if (open && tier && tier.id !== prevId) {
    setPrevId(tier.id);
    setMinPts(String(tier.minLifetimePoints));
    setDiscount(tier.discountPercent);
    setExtra(tier.extraPointsPercent);
    setPriority(tier.priority);
    setFreeService(tier.freeService);
  }
  if (!open && prevId !== null) setPrevId(null);

  async function submit() {
    if (!tier) return;
    try {
      await mutation.mutateAsync({
        level: tier.level,
        input: {
          minLifetimePoints: Number(minPts),
          discountPercent: Number(discount),
          extraPointsPercent: Number(extra),
          priority,
          freeService,
        },
      });
      onOpenChange(false);
    } catch { /* toast */ }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>تعديل مستوى {tier ? LEVEL_LABELS[tier.level] : ""}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5"><Label htmlFor="mp">عتبة نقاط العمر</Label><Input id="mp" type="number" value={minPts} onChange={(e) => setMinPts(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="dc">خصم %</Label><Input id="dc" type="number" step="any" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="ex">نقاط إضافية %</Label><Input id="ex" type="number" step="any" value={extra} onChange={(e) => setExtra(e.target.value)} /></div>
          </div>
          <div className="flex items-center justify-between"><Label>أولوية</Label><Switch checked={priority} onCheckedChange={setPriority} /></div>
          <div className="flex items-center justify-between"><Label>خدمة مجانية</Label><Switch checked={freeService} onCheckedChange={setFreeService} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>إلغاء</Button>
          <Button onClick={() => void submit()} disabled={mutation.isPending}>
            {mutation.isPending && <Spinner className="text-primary-foreground" />}
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
