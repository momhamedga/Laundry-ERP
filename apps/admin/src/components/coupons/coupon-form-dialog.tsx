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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useCreateCouponMutation } from "@/hooks/use-coupons";
import type { CouponType } from "@/types/loyalty";
import { COUPON_TYPE_LABELS } from "@/components/loyalty/loyalty-format";

interface CouponFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CouponFormDialog({ open, onOpenChange }: CouponFormDialogProps) {
  const mutation = useCreateCouponMutation();
  const [code, setCode] = useState("");
  const [type, setType] = useState<CouponType>("PERCENTAGE");
  const [value, setValue] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [usagePerCustomer, setUsagePerCustomer] = useState("");

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) { setCode(""); setType("PERCENTAGE"); setValue(""); setMaxDiscount(""); setMinOrder(""); setUsageLimit(""); setUsagePerCustomer(""); }
  }

  async function submit() {
    if (code.trim().length < 2) return;
    try {
      await mutation.mutateAsync({
        code: code.trim().toUpperCase(),
        type,
        value: Number(value) || 0,
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        minOrder: minOrder ? Number(minOrder) : 0,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        usagePerCustomer: usagePerCustomer ? Number(usagePerCustomer) : null,
      });
      onOpenChange(false);
    } catch { /* toast */ }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>كوبون جديد</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="code">الكود</Label><Input id="code" dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>النوع</Label>
            <Select value={type} onValueChange={(v) => v && setType(v as CouponType)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(COUPON_TYPE_LABELS) as CouponType[]).map((t) => <SelectItem key={t} value={t}>{COUPON_TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="val">القيمة {type === "PERCENTAGE" ? "(%)" : "(مبلغ)"}</Label><Input id="val" type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="max">أقصى خصم</Label><Input id="max" type="number" step="any" placeholder="بلا حد" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="min">أدنى طلب</Label><Input id="min" type="number" step="any" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="ul">حد الاستخدام الكلي</Label><Input id="ul" type="number" placeholder="بلا حد" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="upc">لكل عميل</Label><Input id="upc" type="number" placeholder="بلا حد" value={usagePerCustomer} onChange={(e) => setUsagePerCustomer(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>إلغاء</Button>
          <Button onClick={() => void submit()} disabled={mutation.isPending}>
            {mutation.isPending && <Spinner className="text-primary-foreground" />}
            إنشاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
