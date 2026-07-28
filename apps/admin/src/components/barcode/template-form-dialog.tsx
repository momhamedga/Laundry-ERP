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
import { Switch } from "@/components/ui/switch";
import { useCreateTemplateMutation, useUpdateTemplateMutation } from "@/hooks/use-barcode";
import type { CreateTemplateInput, LabelSize, LabelTemplate } from "@/types/barcode";
import { LABEL_SIZE_LABELS } from "./barcode-format";

interface TemplateFormDialogProps {
  template: LabelTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_FLAGS = {
  showName: true,
  showSku: true,
  showBarcode: true,
  showQr: false,
  showPrice: true,
  showCategory: false,
  showSupplier: false,
  showLogo: false,
  showCompanyName: true,
};

const FLAG_LABELS: Record<keyof typeof DEFAULT_FLAGS, string> = {
  showName: "اسم الصنف",
  showSku: "SKU",
  showBarcode: "الباركود",
  showQr: "QR",
  showPrice: "السعر",
  showCategory: "التصنيف",
  showSupplier: "المورّد",
  showLogo: "الشعار",
  showCompanyName: "اسم الشركة",
};

export function TemplateFormDialog({ template, open, onOpenChange }: TemplateFormDialogProps) {
  const isEdit = template !== null;
  const createMutation = useCreateTemplateMutation();
  const updateMutation = useUpdateTemplateMutation();

  const [name, setName] = useState("");
  const [size, setSize] = useState<LabelSize>("A4");
  const [isDefault, setIsDefault] = useState(false);
  const [flags, setFlags] = useState({ ...DEFAULT_FLAGS });

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName(template?.name ?? "");
      setSize(template?.size ?? "A4");
      setIsDefault(template?.isDefault ?? false);
      setFlags(
        template
          ? {
              showName: template.showName,
              showSku: template.showSku,
              showBarcode: template.showBarcode,
              showQr: template.showQr,
              showPrice: template.showPrice,
              showCategory: template.showCategory,
              showSupplier: template.showSupplier,
              showLogo: template.showLogo,
              showCompanyName: template.showCompanyName,
            }
          : { ...DEFAULT_FLAGS },
      );
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  async function submit() {
    if (name.trim().length < 2) return;
    const input: CreateTemplateInput = { name: name.trim(), size, isDefault, ...flags };
    try {
      if (isEdit && template) await updateMutation.mutateAsync({ id: template.id, input });
      else await createMutation.mutateAsync(input);
      onOpenChange(false);
    } catch {
      // toast عبر onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل قالب" : "قالب جديد"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tname">الاسم</Label>
              <Input id="tname" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>المقاس</Label>
              <Select value={size} onValueChange={(v) => v && setSize(v as LabelSize)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(LABEL_SIZE_LABELS) as LabelSize[]).map((s) => (
                    <SelectItem key={s} value={s}>{LABEL_SIZE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-3">
            {(Object.keys(FLAG_LABELS) as (keyof typeof DEFAULT_FLAGS)[]).map((k) => (
              <label key={k} className="flex items-center justify-between gap-2 text-sm">
                <span>{FLAG_LABELS[k]}</span>
                <Switch checked={flags[k]} onCheckedChange={(v) => setFlags((f) => ({ ...f, [k]: v }))} />
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Label>قالب افتراضي</Label>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>إلغاء</Button>
          <Button onClick={() => void submit()} disabled={isPending}>
            {isPending && <Spinner className="text-primary-foreground" />}
            {isEdit ? "حفظ" : "إنشاء"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
