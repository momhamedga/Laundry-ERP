"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateOrderMutation } from "@/hooks/use-orders";
import {
  buildEditOrderFormSchema,
  toUpdateOrderInput,
  type EditOrderFormValues,
} from "@/lib/validations/order";
import type { OrderDetail } from "@/types/orders";

interface EditOrderDialogProps {
  order: OrderDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toFormValues(order: OrderDetail | null): EditOrderFormValues {
  return {
    dueDate: order ? order.dueDate.slice(0, 10) : "",
    discount: order ? String(Number(order.discount)) : "0",
    notes: order?.notes ?? "",
  };
}

/**
 * حوار تعديل تفاصيل الطلب - تاريخ التسليم/الخصم/الملاحظات فقط (بلا بنود)
 * قرار معماري: تعديل بنود الطلب خارج نطاق هذا الحوار عمداً - يتطلب تجربة
 * منفصلة مستقلة عن Order Draft Store الخاص بمعالج الإنشاء
 */
export function EditOrderDialog({ order, open, onOpenChange }: EditOrderDialogProps) {
  const mutation = useUpdateOrderMutation(order?.id ?? "");
  const schema = buildEditOrderFormSchema(order?.receivedAt ?? new Date().toISOString(), Number(order?.subtotal ?? 0));

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EditOrderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(order),
  });

  // مزامنة النموذج مع الطلب المُحمَّل بدون useEffect ("تعديل الحالة أثناء الرسم")
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (order && open && loadedFor !== order.id) {
    setLoadedFor(order.id);
    const values = toFormValues(order);
    setValue("dueDate", values.dueDate);
    setValue("discount", values.discount);
    setValue("notes", values.notes);
  }

  async function onSubmit(values: EditOrderFormValues) {
    try {
      await mutation.mutateAsync(toUpdateOrderInput(values));
      onOpenChange(false);
    } catch {
      // toast بالفعل عبر onError الخاص بالـ mutation
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setLoadedFor(null);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل الطلب</DialogTitle>
          <DialogDescription dir="ltr">{order?.orderNumber}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-order-due-date">تاريخ التسليم المتوقع *</Label>
            <Input
              id="edit-order-due-date"
              type="date"
              dir="ltr"
              aria-invalid={!!errors.dueDate}
              {...register("dueDate")}
            />
            {errors.dueDate && (
              <p role="alert" className="text-xs text-destructive">
                {errors.dueDate.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-order-discount">الخصم</Label>
            <Input
              id="edit-order-discount"
              type="number"
              min="0"
              step="0.01"
              dir="ltr"
              aria-invalid={!!errors.discount}
              {...register("discount")}
            />
            {errors.discount && (
              <p role="alert" className="text-xs text-destructive">
                {errors.discount.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-order-notes">ملاحظات</Label>
            <Textarea id="edit-order-notes" rows={3} {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="text-primary-foreground" />}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
