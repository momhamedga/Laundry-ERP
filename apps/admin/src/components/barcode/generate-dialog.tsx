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
import { Switch } from "@/components/ui/switch";
import { useGenerateMutation } from "@/hooks/use-barcode";
import type { InventoryItem } from "@/types/inventory";
import type { BarcodeType } from "@/types/barcode";
import { BARCODE_TYPE_LABELS } from "./barcode-format";
import { BarcodeImage } from "./barcode-image";

interface GenerateDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateDialog({ item, open, onOpenChange }: GenerateDialogProps) {
  const mutation = useGenerateMutation();
  const [type, setType] = useState<BarcodeType>("EAN13");
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [value, setValue] = useState("");
  const [withQr, setWithQr] = useState(true);

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setType("EAN13");
      setMode("auto");
      setValue("");
      setWithQr(true);
    }
  }

  async function submit() {
    if (!item) return;
    if (mode === "manual" && !value.trim()) return;
    try {
      await mutation.mutateAsync({
        itemId: item.id,
        input: { type, mode, value: mode === "manual" ? value.trim() : undefined, withQr },
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
          <DialogTitle>توليد باركود</DialogTitle>
          <DialogDescription>{item?.name} — {item?.sku}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>النوع</Label>
            <Select value={type} onValueChange={(v) => v && setType(v as BarcodeType)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(BARCODE_TYPE_LABELS) as BarcodeType[]).map((t) => (
                  <SelectItem key={t} value={t}>{BARCODE_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>الوضع</Label>
            <Select value={mode} onValueChange={(v) => v && setMode(v as "auto" | "manual")}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">تلقائي (توليد)</SelectItem>
                <SelectItem value="manual">يدوي (إدخال قيمة)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "manual" && (
            <div className="space-y-1.5">
              <Label htmlFor="bcval">القيمة</Label>
              <Input id="bcval" dir="ltr" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label>توليد QR أيضاً</Label>
            <Switch checked={withQr} onCheckedChange={setWithQr} />
          </div>

          {mode === "manual" && value.trim() && type !== "QR" && (
            <div className="flex justify-center rounded-lg border p-3">
              <BarcodeImage value={value.trim()} type={type} height={40} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>إلغاء</Button>
          <Button onClick={() => void submit()} disabled={mutation.isPending}>
            {mutation.isPending && <Spinner className="text-primary-foreground" />}
            توليد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
