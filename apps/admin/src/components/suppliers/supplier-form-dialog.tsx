"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { useCreateSupplierMutation, useUpdateSupplierMutation } from "@/hooks/use-suppliers";
import type { Supplier } from "@/types/inventory";

const schema = z.object({
  name: z.string().trim().min(2, "قصير جداً").max(150),
  contactName: z.string().trim().max(100).optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  address: z.string().trim().max(300).optional(),
  taxNumber: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(1000).optional(),
});
type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  taxNumber: "",
  notes: "",
};

interface SupplierFormDialogProps {
  supplier: Supplier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplierFormDialog({ supplier, open, onOpenChange }: SupplierFormDialogProps) {
  const isEdit = supplier !== null;
  const createMutation = useCreateSupplierMutation();
  const updateMutation = useUpdateSupplierMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  useEffect(() => {
    if (open) {
      reset(
        supplier
          ? {
              name: supplier.name,
              contactName: supplier.contactName ?? "",
              phone: supplier.phone ?? "",
              email: supplier.email ?? "",
              address: supplier.address ?? "",
              taxNumber: supplier.taxNumber ?? "",
              notes: supplier.notes ?? "",
            }
          : DEFAULTS,
      );
    }
  }, [open, supplier, reset]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  async function onSubmit(values: FormValues) {
    const input = {
      name: values.name,
      contactName: values.contactName || null,
      phone: values.phone || null,
      email: values.email || null,
      address: values.address || null,
      taxNumber: values.taxNumber || null,
      notes: values.notes || null,
    };
    try {
      if (isEdit && supplier) await updateMutation.mutateAsync({ id: supplier.id, input });
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
          <DialogTitle>{isEdit ? "تعديل مورّد" : "مورّد جديد"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-name">الاسم *</Label>
              <Input id="s-name" aria-invalid={!!errors.name} {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-contact">المسؤول</Label>
              <Input id="s-contact" {...register("contactName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-phone">الهاتف</Label>
              <Input id="s-phone" dir="ltr" {...register("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-email">البريد</Label>
              <Input id="s-email" dir="ltr" {...register("email")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-tax">الرقم الضريبي</Label>
              <Input id="s-tax" dir="ltr" {...register("taxNumber")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-address">العنوان</Label>
              <Input id="s-address" {...register("address")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-notes">ملاحظات</Label>
            <Textarea id="s-notes" rows={2} {...register("notes")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>إلغاء</Button>
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
