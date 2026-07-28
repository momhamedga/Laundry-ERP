"use client";

import { Plus, Trash2 } from "lucide-react";
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
import { useItemsQuery } from "@/hooks/use-inventory";
import { useCreatePurchaseMutation } from "@/hooks/use-purchases";
import { useSuppliersQuery } from "@/hooks/use-suppliers";
import { formatCurrency } from "@/lib/format";

interface Line {
  itemId: string;
  quantity: string;
  unitCost: string;
}

interface PurchaseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PurchaseFormDialog({ open, onOpenChange }: PurchaseFormDialogProps) {
  const { data: suppliersData } = useSuppliersQuery({ limit: 100, isActive: true });
  const { data: itemsData } = useItemsQuery({ limit: 100, isActive: true });
  const mutation = useCreatePurchaseMutation();

  const [supplierId, setSupplierId] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ itemId: "", quantity: "", unitCost: "" }]);

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSupplierId("");
      setTaxRate("0");
      setNotes("");
      setLines([{ itemId: "", quantity: "", unitCost: "" }]);
    }
  }

  const validLines = lines.filter((l) => l.itemId && Number(l.quantity) > 0 && Number(l.unitCost) >= 0);
  const subtotal = validLines.reduce((s, l) => s + Number(l.quantity) * Number(l.unitCost), 0);
  const tax = (subtotal * Number(taxRate || 0)) / 100;
  const total = subtotal + tax;

  function setLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function submit() {
    if (!supplierId || validLines.length === 0) return;
    try {
      await mutation.mutateAsync({
        supplierId,
        taxRate: Number(taxRate || 0),
        notes: notes || null,
        items: validLines.map((l) => ({
          itemId: l.itemId,
          quantity: Number(l.quantity),
          unitCost: Number(l.unitCost),
        })),
      });
      onOpenChange(false);
    } catch {
      // toast عبر onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>أمر شراء جديد</DialogTitle>
          <DialogDescription>يُنشأ كمسودة - استلامه لاحقاً يزيد المخزون</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>المورّد *</Label>
              <Select value={supplierId} onValueChange={(v) => setSupplierId(v ?? "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>
                  {(suppliersData?.suppliers ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxRate">الضريبة %</Label>
              <Input id="taxRate" type="number" step="any" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>البنود</Label>
              <Button type="button" variant="outline" size="xs" onClick={() => setLines((ls) => [...ls, { itemId: "", quantity: "", unitCost: "" }])}>
                <Plus aria-hidden /> بند
              </Button>
            </div>
            {lines.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select value={l.itemId} onValueChange={(v) => setLine(i, { itemId: v ?? "" })}>
                  <SelectTrigger size="sm" className="flex-1"><SelectValue placeholder="الصنف" /></SelectTrigger>
                  <SelectContent>
                    {(itemsData?.items ?? []).map((it) => (
                      <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" step="any" placeholder="كمية" className="h-8 w-24" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                <Input type="number" step="any" placeholder="تكلفة" className="h-8 w-24" value={l.unitCost} onChange={(e) => setLine(i, { unitCost: e.target.value })} />
                <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-notes">ملاحظات</Label>
            <Input id="p-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex justify-end gap-6 rounded-lg border p-3 text-sm">
            <span>الفرعي: <b>{formatCurrency(subtotal)}</b></span>
            <span>الضريبة: <b>{formatCurrency(tax)}</b></span>
            <span>الإجمالي: <b>{formatCurrency(total)}</b></span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>إلغاء</Button>
          <Button onClick={() => void submit()} disabled={mutation.isPending || !supplierId || validLines.length === 0}>
            {mutation.isPending && <Spinner className="text-primary-foreground" />}
            إنشاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
