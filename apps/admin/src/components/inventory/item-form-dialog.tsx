"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
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
import { useCreateItemMutation, useUpdateItemMutation } from "@/hooks/use-inventory";
import { useSuppliersQuery } from "@/hooks/use-suppliers";
import type { InventoryItem, InventoryItemType, InventoryUnit } from "@/types/inventory";
import { ITEM_TYPE_LABELS, UNIT_LABELS } from "./inventory-format";

const schema = z.object({
  sku: z.string().trim().min(1, "مطلوب").max(60),
  name: z.string().trim().min(2, "قصير جداً").max(150),
  type: z.enum(["PRODUCT", "RAW_MATERIAL"]),
  unit: z.enum(["PIECE", "KG", "GRAM", "LITER", "METER", "BOX", "PACK"]),
  category: z.string().trim().max(100).optional(),
  quantity: z.number().min(0),
  reorderLevel: z.number().min(0),
  costPrice: z.number().min(0),
  sellPrice: z.number().min(0),
  supplierId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  sku: "",
  name: "",
  type: "PRODUCT",
  unit: "PIECE",
  category: "",
  quantity: 0,
  reorderLevel: 0,
  costPrice: 0,
  sellPrice: 0,
  supplierId: "",
};

interface ItemFormDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ItemFormDialog({ item, open, onOpenChange }: ItemFormDialogProps) {
  const isEdit = item !== null;
  const createMutation = useCreateItemMutation();
  const updateMutation = useUpdateItemMutation();
  const { data: suppliersData } = useSuppliersQuery({ limit: 100, isActive: true });

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  const typeValue = useWatch({ control, name: "type" });
  const unitValue = useWatch({ control, name: "unit" });
  const supplierId = useWatch({ control, name: "supplierId" });

  useEffect(() => {
    if (open) {
      reset(
        item
          ? {
              sku: item.sku,
              name: item.name,
              type: item.type,
              unit: item.unit,
              category: item.category ?? "",
              quantity: Number(item.quantity),
              reorderLevel: Number(item.reorderLevel),
              costPrice: Number(item.costPrice),
              sellPrice: Number(item.sellPrice),
              supplierId: item.supplierId ?? "",
            }
          : DEFAULTS,
      );
    }
  }, [open, item, reset]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  async function onSubmit(values: FormValues) {
    try {
      const supplierId = values.supplierId && values.supplierId !== "" ? values.supplierId : null;
      if (isEdit && item) {
        await updateMutation.mutateAsync({
          id: item.id,
          input: {
            name: values.name,
            type: values.type,
            unit: values.unit,
            category: values.category || null,
            reorderLevel: values.reorderLevel,
            costPrice: values.costPrice,
            sellPrice: values.sellPrice,
            supplierId,
          },
        });
      } else {
        await createMutation.mutateAsync({
          sku: values.sku,
          name: values.name,
          type: values.type,
          unit: values.unit,
          category: values.category || null,
          quantity: values.quantity,
          reorderLevel: values.reorderLevel,
          costPrice: values.costPrice,
          sellPrice: values.sellPrice,
          supplierId,
        });
      }
      onOpenChange(false);
    } catch {
      // toast عبر onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل صنف" : "صنف جديد"}</DialogTitle>
          <DialogDescription>بيانات الصنف والرصيد الافتتاحي والتكلفة</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU *</Label>
              <Input id="sku" dir="ltr" disabled={isEdit} aria-invalid={!!errors.sku} {...register("sku")} />
              {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">الاسم *</Label>
              <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>النوع</Label>
              <Select value={typeValue} onValueChange={(v) => v && setValue("type", v as InventoryItemType)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ITEM_TYPE_LABELS) as InventoryItemType[]).map((t) => (
                    <SelectItem key={t} value={t}>{ITEM_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>الوحدة</Label>
              <Select value={unitValue} onValueChange={(v) => v && setValue("unit", v as InventoryUnit)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(UNIT_LABELS) as InventoryUnit[]).map((u) => (
                    <SelectItem key={u} value={u}>{UNIT_LABELS[u]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">التصنيف</Label>
              <Input id="category" {...register("category")} />
            </div>
            <div className="space-y-1.5">
              <Label>المورّد</Label>
              <Select
                value={supplierId || "none"}
                onValueChange={(v) => setValue("supplierId", !v || v === "none" ? "" : v)}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون</SelectItem>
                  {(suppliersData?.suppliers ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="quantity">الرصيد الافتتاحي</Label>
                <Input id="quantity" type="number" step="any" {...register("quantity", { valueAsNumber: true })} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="reorderLevel">حد إعادة الطلب</Label>
              <Input id="reorderLevel" type="number" step="any" {...register("reorderLevel", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="costPrice">سعر التكلفة</Label>
              <Input id="costPrice" type="number" step="any" {...register("costPrice", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sellPrice">سعر البيع</Label>
              <Input id="sellPrice" type="number" step="any" {...register("sellPrice", { valueAsNumber: true })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Spinner className="text-primary-foreground" />}
              {isEdit ? "حفظ" : "إنشاء"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
