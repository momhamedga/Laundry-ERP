"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { OrderFilterField } from "@/components/payments/order-filter-field";
import { useOrderDetailQuery } from "@/hooks/use-orders";
import { useCreateInvoiceMutation } from "@/hooks/use-invoices";
import { formatCurrency } from "@/lib/format";
import {
  createInvoiceFormSchema,
  toCreateInvoiceInput,
  type CreateInvoiceFormValues,
} from "@/lib/validations/invoice";
import { useForm } from "react-hook-form";
import type { CreateInvoiceStatus } from "@/types/invoice";
import { InvoiceForm } from "./invoice-form";

const STATUS_OPTIONS: { value: CreateInvoiceStatus; label: string }[] = [
  { value: "ISSUED", label: "صادرة (نهائية)" },
  { value: "DRAFT", label: "مسودة (غير نهائية)" },
];

const EMPTY_VALUES: CreateInvoiceFormValues = {
  orderId: "",
  status: "ISSUED",
  tax: "0",
  dueDate: "",
  notes: "",
};

/**
 * حوار إصدار فاتورة جديدة - يتطلب invoices:create (يُتحقق بالمستدعي).
 * subtotal/discount/items تُنسَخ من الطلب المختار بالخادم - لا تُرسَل من هنا إطلاقاً.
 * فاتورة واحدة لكل طلب (409 من الخادم لو الطلب مُفوتَر بالفعل) - لا فلترة مسبقة هنا،
 * لا Endpoint بالخادم لاستبعاد الطلبات المُفوتَرة من نتائج البحث
 */
export function CreateInvoiceDialog() {
  const [open, setOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | undefined>(undefined);
  const mutation = useCreateInvoiceMutation();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  const orderId = watch("orderId");
  const { data: order } = useOrderDetailQuery(orderId || null);

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset(EMPTY_VALUES);
      setOrderNumber(undefined);
    }
    setOpen(next);
  }

  async function onSubmit(values: CreateInvoiceFormValues) {
    try {
      await mutation.mutateAsync(toCreateInvoiceInput(values));
      handleOpenChange(false);
    } catch {
      // toast بالفعل عبر onError الخاص بالـ mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <Plus aria-hidden /> فاتورة جديدة
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-1.5">
              <FileText className="size-4" aria-hidden /> إصدار فاتورة جديدة
            </span>
          </DialogTitle>
          <DialogDescription>اختر الطلب المراد إصدار فاتورة له.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label>الطلب *</Label>
            <OrderFilterField
              orderId={orderId || undefined}
              orderNumber={orderNumber}
              onSelect={(id, number) => {
                setValue("orderId", id ?? "", { shouldValidate: true });
                setOrderNumber(number);
              }}
            />
            {errors.orderId && (
              <p role="alert" className="text-xs text-destructive">
                {errors.orderId.message}
              </p>
            )}
          </div>
          {order && (
            <p className="text-xs text-muted-foreground">
              إجمالي الطلب: {formatCurrency(order.total)} · المدفوع: {formatCurrency(order.paidAmount)}
            </p>
          )}

          <InvoiceForm
            statusValue={watch("status")}
            onStatusChange={(v) => setValue("status", v as CreateInvoiceStatus)}
            statusOptions={STATUS_OPTIONS}
            taxRegister={register("tax")}
            taxError={errors.tax?.message}
            dueDateRegister={register("dueDate")}
            notesRegister={register("notes")}
            notesError={errors.notes?.message}
          />

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="text-primary-foreground" />}
              إصدار الفاتورة
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
